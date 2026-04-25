"""Extract static (geological/terrain) features."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

import geopandas as gpd
import numpy as np
import rasterio
import requests
from pyproj import Transformer
from shapely.geometry import Point

from .constants import SOILGRIDS_BASE_URL
from .retry_utils import default_retry


@dataclass
class StaticDataContext:
    """In-memory heavy datasets to avoid repeated disk reads."""

    dem_ds: rasterio.io.DatasetReader
    slope_ds: rasterio.io.DatasetReader
    glhymps_gdf: gpd.GeoDataFrame
    glhymps_sindex: Any


def _is_valid_number(value: Any) -> bool:
    try:
        if value is None:
            return False
        if isinstance(value, (float, np.floating)) and math.isnan(value):
            return False
        return True
    except TypeError:
        return False


def _find_k_column(glhymps_gdf: gpd.GeoDataFrame) -> str | None:
    candidates = [
        "k",
        "K",
        "hydraulic_conductivity",
        "Hydraulic_Conductivity",
        "logK_Ferr",
        "logk_ferre",
        "PERM_M_PER_DAY",
    ]
    for name in candidates:
        if name in glhymps_gdf.columns:
            return name

    for col in glhymps_gdf.columns:
        if "cond" in col.lower() or "perm" in col.lower() or col.lower().startswith("k"):
            return col
    return None


def load_static_context(
    dem_raster_path: str,
    slope_raster_path: str,
    glhymps_path: str,
) -> StaticDataContext:
    """Load static resources once and keep them open during pipeline execution."""
    dem_ds = rasterio.open(dem_raster_path)
    slope_ds = rasterio.open(slope_raster_path)

    glhymps_gdf = gpd.read_file(glhymps_path)
    if glhymps_gdf.crs is None:
        glhymps_gdf = glhymps_gdf.set_crs(epsg=4326)
    else:
        glhymps_gdf = glhymps_gdf.to_crs(epsg=4326)

    return StaticDataContext(
        dem_ds=dem_ds,
        slope_ds=slope_ds,
        glhymps_gdf=glhymps_gdf,
        glhymps_sindex=glhymps_gdf.sindex,
    )


def close_static_context(ctx: StaticDataContext) -> None:
    """Close raster handles to release file descriptors."""
    ctx.dem_ds.close()
    ctx.slope_ds.close()


@default_retry()
def _soilgrids_request(lat: float, lon: float, timeout: int) -> dict[str, Any]:
    params = {
        "lat": lat,
        "lon": lon,
        "property": "clay",
        "depth": "0-5cm",
        "value": "mean",
    }
    response = requests.get(SOILGRIDS_BASE_URL, params=params, timeout=timeout)
    response.raise_for_status()
    return response.json()


def extrage_argila(lat: float, lon: float, timeout: int = 30) -> float:
    """Extract clay percentage from SoilGrids at 0-5cm depth.

    SoilGrids returns clay in g/kg. Conversion: percent = (g/kg) / 10.
    """
    payload = _soilgrids_request(lat=lat, lon=lon, timeout=timeout)

    layers = payload.get("properties", {}).get("layers", [])
    if not layers:
        return float("nan")

    for layer in layers:
        if layer.get("name") != "clay":
            continue
        for depth_info in layer.get("depths", []):
            if depth_info.get("label") != "0-5cm":
                continue
            raw_value = depth_info.get("values", {}).get("mean")
            if _is_valid_number(raw_value):
                return float(raw_value) / 10.0

    return float("nan")


def _sample_raster_value(dataset: rasterio.io.DatasetReader, lon: float, lat: float) -> float:
    if dataset.crs and dataset.crs.to_epsg() != 4326:
        transformer = Transformer.from_crs("EPSG:4326", dataset.crs, always_xy=True)
        x, y = transformer.transform(lon, lat)
    else:
        x, y = lon, lat

    sample = next(dataset.sample([(x, y)]))[0]
    if dataset.nodata is not None and sample == dataset.nodata:
        return float("nan")
    return float(sample)


def extrage_altitudine_si_panta(
    ctx: StaticDataContext,
    lat: float,
    lon: float,
) -> tuple[float, float]:
    """Extract elevation (m) and slope (deg) from local rasters."""
    altitude = _sample_raster_value(ctx.dem_ds, lon=lon, lat=lat)
    slope = _sample_raster_value(ctx.slope_ds, lon=lon, lat=lat)
    return altitude, slope


def extrage_conductivitate_hidraulica(ctx: StaticDataContext, lat: float, lon: float) -> float:
    """Extract local hydraulic conductivity (m/day) from GLHYMPS polygons."""
    point = Point(lon, lat)
    candidate_index = list(ctx.glhymps_sindex.intersection(point.bounds))
    if not candidate_index:
        return float("nan")

    subset = ctx.glhymps_gdf.iloc[candidate_index]
    matches = subset[subset.geometry.contains(point)]
    if matches.empty:
        matches = subset[subset.geometry.intersects(point)]
    if matches.empty:
        return float("nan")

    k_col = _find_k_column(matches)
    if k_col is None:
        return float("nan")

    value = matches.iloc[0][k_col]
    if not _is_valid_number(value):
        return float("nan")

    return float(value)
