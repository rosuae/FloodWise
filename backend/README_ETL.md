# Groundwater Flood ETL Pipeline

This ETL pipeline enriches station events for machine learning flood prediction.

## Input schema

Expected CSV file: `data/raw/evenimente_baza.csv`

Required columns:
- `ID_Statie` (string)
- `Lat` (float)
- `Lon` (float)
- `Data` (YYYY-MM-DD)
- `Inundatie_Target` (int, 0/1)

## Output schema

Generated file: `data/groundwater_ml_dataset_final.csv`

Contains all input columns plus extracted features:
- `argila_pct`
- `altitudine_m`
- `panta_grade`
- `conductivitate_hidraulica_m_zi`
- `precip_event_day_mm`
- `precip_last_7d_mm`
- `soil_moisture_surface_pct`
- `sentinel1_product_id`
- `sentinel1_product_name`
- `sentinel1_start_utc`
- `sentinel1_download_url`
- `era5_latest_product_name`

## Data sources

### Static features
- Soil clay: ISRIC SoilGrids v2.0 REST API (`clay`, `0-5cm`, `mean`).
  - Converted from g/kg to percent with: `clay_pct = clay_g_per_kg / 10`.
- Elevation and slope: sampled from local rasters using `rasterio`.
- Hydraulic conductivity: point-in-polygon from local GLHYMPS layer using `geopandas`.

### Dynamic features (CDSE)
- Auth can use either:
  - direct token/API key from Copernicus dashboard (`CDSE_ACCESS_TOKEN` or `COPERNICUS_API_KEY`), or
  - OAuth2 (`COPERNICUS_CLIENT_ID` + `COPERNICUS_CLIENT_SECRET`).
- For your Copernicus naming, these aliases are also accepted:
  - `COPERNICUS_USER_ID` / `copernicus_user_id`
  - `COPERNICUS_USER_SECRET` / `copernicus_user_secret`
- ERA5 metadata queried via CDSE OData API.
- Sentinel-1 GRD product discovery via CDSE OData API.

## Sentinel-1 change detection formula

After SAR preprocessing (orbit correction, calibration, terrain correction), estimate soil moisture as:

`SM(%) = clip(((sigma0_now - sigma0_dry) / (sigma0_wet - sigma0_dry)) * 100, 0, 100)`

The helper function is implemented in `etl/dynamic_features.py` as `estimare_umiditate_sol_din_sigma0`.

## Environment setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Create env file:

```bash
cp .env.example .env
```

3. Fill CDSE credentials in `.env`.

Authentication priority:
1. `CDSE_ACCESS_TOKEN` / `COPERNICUS_API_KEY`
2. `COPERNICUS_CLIENT_ID` + `COPERNICUS_CLIENT_SECRET`

## Run pipeline

From `backend` folder:

```bash
python run_groundwater_etl.py
```

Optional arguments:

```bash
python run_groundwater_etl.py \
  --input data/raw/evenimente_baza.csv \
  --output data/groundwater_ml_dataset_final.csv \
  --dem data/raw/copernicus_dem.tif \
  --slope data/raw/copernicus_slope.tif \
  --glhymps data/raw/glhymps.gpkg
```

## Notes on robustness

- Network calls use retry logic with exponential backoff (`tenacity`).
- Any extraction failure on a row returns `NaN`/`None` for that feature and continues processing.
- Heavy spatial datasets are loaded once, outside the row loop, for scalability.
