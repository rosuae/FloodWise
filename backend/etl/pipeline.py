"""Main ETL orchestration for groundwater flooding dataset."""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass

import numpy as np
import pandas as pd

from .config import PipelineConfig
from .dynamic_features import (
    CdseCredentials,
    extrage_precipitatii_era5,
    extrage_umiditate_sol_sentinel1,
    get_cdse_token,
)
from .static_features import (
    close_static_context,
    extrage_altitudine_si_panta,
    extrage_argila,
    extrage_conductivitate_hidraulica,
    load_static_context,
)

REQUIRED_INPUT_COLUMNS = {
    "ID_Statie",
    "Lat",
    "Lon",
    "Data",
    "Inundatie_Target",
}


@dataclass
class EventFeatures:
    argila_pct: float
    altitudine_m: float
    panta_grade: float
    conductivitate_hidraulica_m_zi: float
    precip_event_day_mm: float
    precip_last_7d_mm: float
    soil_moisture_surface_pct: float
    sentinel1_product_id: str | None
    sentinel1_product_name: str | None
    sentinel1_start_utc: str | None
    sentinel1_download_url: str | None
    era5_latest_product_name: str | None


logger = logging.getLogger(__name__)


def _validate_input_columns(df: pd.DataFrame) -> None:
    missing = REQUIRED_INPUT_COLUMNS.difference(df.columns)
    if missing:
        missing_list = ", ".join(sorted(missing))
        raise ValueError(f"Fisierul de input nu contine toate coloanele obligatorii: {missing_list}")


def _extract_event_features(
    row: pd.Series,
    token: str | None,
    cfg: PipelineConfig,
    static_ctx,
) -> EventFeatures:
    lat = float(row["Lat"])
    lon = float(row["Lon"])
    data_tinta = str(row["Data"])

    # Static features
    argila_pct = np.nan
    altitudine_m = np.nan
    panta_grade = np.nan
    conductivitate_m_zi = np.nan

    try:
        argila_pct = extrage_argila(lat=lat, lon=lon, timeout=cfg.request_timeout_seconds)
    except Exception as exc:
        logger.warning("SoilGrids fail for station=%s: %s", row.get("ID_Statie"), exc)

    try:
        altitudine_m, panta_grade = extrage_altitudine_si_panta(static_ctx, lat=lat, lon=lon)
    except Exception as exc:
        logger.warning("Raster sampling fail for station=%s: %s", row.get("ID_Statie"), exc)

    try:
        conductivitate_m_zi = extrage_conductivitate_hidraulica(static_ctx, lat=lat, lon=lon)
    except Exception as exc:
        logger.warning("GLHYMPS fail for station=%s: %s", row.get("ID_Statie"), exc)

    # Dynamic features
    precip_event_day_mm = np.nan
    precip_last_7d_mm = np.nan
    era5_latest_product_name = None
    soil_moisture_surface_pct = np.nan
    sentinel1_product_id = None
    sentinel1_product_name = None
    sentinel1_start_utc = None
    sentinel1_download_url = None

    if token:
        try:
            precip = extrage_precipitatii_era5(
                token=token,
                lat=lat,
                lon=lon,
                data_tinta=data_tinta,
                timeout=cfg.request_timeout_seconds,
            )
            precip_event_day_mm = precip["precip_event_day_mm"]
            precip_last_7d_mm = precip["precip_last_7d_mm"]
            era5_latest_product_name = precip["era5_latest_product_name"]
        except Exception as exc:
            logger.warning("ERA5 fail for station=%s: %s", row.get("ID_Statie"), exc)

        try:
            sentinel = extrage_umiditate_sol_sentinel1(
                token=token,
                lat=lat,
                lon=lon,
                data_tinta=data_tinta,
                timeout=cfg.request_timeout_seconds,
            )
            soil_moisture_surface_pct = sentinel["soil_moisture_surface_pct"]
            sentinel1_product_id = sentinel["sentinel1_product_id"]
            sentinel1_product_name = sentinel["sentinel1_product_name"]
            sentinel1_start_utc = sentinel["sentinel1_start_utc"]
            sentinel1_download_url = sentinel["sentinel1_download_url"]
        except Exception as exc:
            logger.warning("Sentinel-1 fail for station=%s: %s", row.get("ID_Statie"), exc)

    return EventFeatures(
        argila_pct=argila_pct,
        altitudine_m=altitudine_m,
        panta_grade=panta_grade,
        conductivitate_hidraulica_m_zi=conductivitate_m_zi,
        precip_event_day_mm=precip_event_day_mm,
        precip_last_7d_mm=precip_last_7d_mm,
        soil_moisture_surface_pct=soil_moisture_surface_pct,
        sentinel1_product_id=sentinel1_product_id,
        sentinel1_product_name=sentinel1_product_name,
        sentinel1_start_utc=sentinel1_start_utc,
        sentinel1_download_url=sentinel1_download_url,
        era5_latest_product_name=era5_latest_product_name,
    )


def run_pipeline(cfg: PipelineConfig) -> pd.DataFrame:
    """Run ETL and persist groundwater_ml_dataset_final.csv."""
    logger.info("Reading base events from: %s", cfg.input_csv)
    df = pd.read_csv(cfg.input_csv)
    _validate_input_columns(df)

    token = cfg.cdse_access_token
    if token:
        logger.info("Using CDSE token from environment (CDSE_ACCESS_TOKEN/COPERNICUS_API_KEY)")
    elif cfg.cdse_client_id and cfg.cdse_client_secret:
        try:
            creds = CdseCredentials(
                client_id=cfg.cdse_client_id,
                client_secret=cfg.cdse_client_secret,
            )
            token = get_cdse_token(credentials=creds, timeout=cfg.request_timeout_seconds)
            logger.info("CDSE token obtained successfully via OAuth client credentials")
        except Exception as exc:
            logger.warning("CDSE authentication failed, dynamic features set to NaN: %s", exc)
    else:
        logger.warning("CDSE auth data missing (token or OAuth credentials); dynamic features will be NaN")

    static_ctx = load_static_context(
        dem_raster_path=str(cfg.dem_raster_path),
        slope_raster_path=str(cfg.slope_raster_path),
        glhymps_path=str(cfg.glhymps_path),
    )

    try:
        features = []
        for _, row in df.iterrows():
            features.append(asdict(_extract_event_features(row=row, token=token, cfg=cfg, static_ctx=static_ctx)))

        features_df = pd.DataFrame(features)
        final_df = pd.concat([df.reset_index(drop=True), features_df], axis=1)
    finally:
        close_static_context(static_ctx)

    cfg.output_csv.parent.mkdir(parents=True, exist_ok=True)
    final_df.to_csv(cfg.output_csv, index=False)
    logger.info("Final dataset written to: %s", cfg.output_csv)

    return final_df
