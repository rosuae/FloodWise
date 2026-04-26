import cdsapi
import xarray as xr
import pandas as pd
import os
import math


ERA5_GRID_DEG = 0.25


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


def download_precip_grib(target: str, area: list[float], year: str, month: str, day: str) -> str:
  """Download ERA5 precipitation GRIB only if target does not already exist."""
  if os.path.exists(target) and os.path.getsize(target) > 0:
    print(f"Fisier existent, sar peste download: {target}")
    return target

  if os.path.exists(target) and os.path.getsize(target) == 0:
    os.remove(target)

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


def _snap_down(value: float, step: float) -> float:
  return math.floor(value / step) * step


def _snap_up(value: float, step: float) -> float:
  return math.ceil(value / step) * step


def point_to_cds_area(lon: float, lat: float, size: float = 0.1) -> list[float]:
  """Build CDS area [north, west, south, east] aligned to ERA5 0.25deg grid."""
  half_size = max(size / 2.0, ERA5_GRID_DEG / 2.0)

  north = _snap_up(lat + half_size, ERA5_GRID_DEG)
  south = _snap_down(lat - half_size, ERA5_GRID_DEG)
  west = _snap_down(lon - half_size, ERA5_GRID_DEG)
  east = _snap_up(lon + half_size, ERA5_GRID_DEG)

  north = min(90.0, north)
  south = max(-90.0, south)
  west = max(-180.0, west)
  east = min(180.0, east)

  if north <= south:
    south = max(-90.0, lat - ERA5_GRID_DEG)
    north = min(90.0, lat + ERA5_GRID_DEG)

  if east <= west:
    west = max(-180.0, lon - ERA5_GRID_DEG)
    east = min(180.0, lon + ERA5_GRID_DEG)

  return [round(north, 6), round(west, 6), round(south, 6), round(east, 6)]

def run(lat: float, lon: float, year: str, month: str, day: str):
  target = f"download_{year}{month}{day}_{lat:.4f}_{lon:.4f}.grib"

  area = point_to_cds_area(lon, lat)
  print(f"CDS area folosit: {area}")
  download_precip_grib(target, area, year, month, day)

  dataset_grib = read_grib_file(target)
  mean_mm = mean_precipitation_mm(dataset_grib)

  print(f"\nMedia precipitatiilor pe aria selectata: {mean_mm:.3f} mm")
  return {"mean_precipitation_mm": mean_mm}