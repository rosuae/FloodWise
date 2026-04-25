import cdsapi
import xarray as xr
import pandas as pd
import os


def read_grib_file(path: str) -> xr.Dataset:
  """Read a GRIB file with best available xarray engine."""

  engines = xr.backends.list_engines()
  available = list(engines.keys())

  last_error = None
  for engine in ["cfgrib", "rasterio"]:
    if engine not in engines:
      continue
    try:
      ds = xr.open_dataset(path, engine=engine)
      print(f"\n[OK] GRIB loaded with engine: {engine}")
      print("\n--- GRIB dataset summary ---")
      print(ds)
      print("\nVariables:", list(ds.data_vars))
      return ds
    except Exception as exc:
      last_error = exc

  raise RuntimeError(
    "Nu pot citi fisierul GRIB cu engine-urile disponibile. "
    f"Disponibile: {available}. "
    "Instaleaza suport GRIB: pip install cfgrib eccodes "
    "(sau deschide ca NetCDF din request-ul CDS)."
  ) from last_error


def download_precip_grib(target: str, area: list, year: str, month: str, day: str) -> str:
  """Download ERA5 precipitation GRIB only if target does not already exist."""
  if os.path.exists(target):
    print(f"Fisier existent, sar peste download: {target}")
    return target

  client = cdsapi.Client()
  dataset = 'reanalysis-era5-single-levels'
  request = {
    'product_type': ['reanalysis'],
    'variable': ['total_precipitation'],
    'year': [year],
    'month': [month],
    'day': [day],
    'time': [f"{h:02d}:00" for h in range(24)],
    # north, west, south, east (exemplu zona RO extinsa)
    'area': area,
    'data_format': 'grib',
  }
  client.retrieve(dataset, request, target)
  return target


def mean_precipitation_mm(ds: xr.Dataset) -> float:
  """Return mean precipitation (mm) over the selected area/time window."""
  # Preferred path: cfgrib gives total_precipitation as `tp` in meters.
  if 'tp' in ds.data_vars:
    tp = ds['tp']
    mean_tp_m = float(tp.mean(skipna=True).values)
    return mean_tp_m * 1000.0

  # Fallback path: rasterio gives grid-only values as band_data.
  if 'band_data' in ds.data_vars:
    grid = ds['band_data']
    mean_m = float(grid.mean(skipna=True).values)
    return mean_m * 1000.0

  raise RuntimeError(f"Nu am gasit variabila de precipitatii. Variabile prezente: {list(ds.data_vars)}")

def extract(area, year, month, day):
    target = 'download.grib'  # Example area for Romania

    download_precip_grib(target, area, year, month, day)

    dataset_grib = read_grib_file(target)
    mean_mm = mean_precipitation_mm(dataset_grib)

    out_csv = "precipitations_mean.csv"
    pd.DataFrame([{"mean_precipitation_mm": mean_mm}]).to_csv(out_csv, index=False)
    print(f"\nMedia precipitatiilor pe aria selectata: {mean_mm:.3f} mm")
    print(f"CSV cu media salvat: {out_csv}")