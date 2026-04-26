"""Extract dynamic (meteorological/satellite) features from CDSE."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

import numpy as np
import requests

from .constants import CDSE_CATALOGUE_URL, CDSE_TOKEN_URL, CDSE_ZIPPER_URL
from .retry_utils import default_retry


@dataclass(frozen=True)
class CdseCredentials:
    client_id: str
    client_secret: str


@default_retry()
def _token_request(credentials: CdseCredentials, timeout: int) -> str:
    response = requests.post(
        CDSE_TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
        },
        timeout=timeout,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def get_cdse_token(credentials: CdseCredentials, timeout: int = 30) -> str:
    """Get OAuth2 bearer token used by CDSE services."""
    return _token_request(credentials=credentials, timeout=timeout)


@default_retry()
def _cdse_catalogue_get(token: str, filter_query: str, top: int, timeout: int) -> dict[str, Any]:
    response = requests.get(
        CDSE_CATALOGUE_URL,
        headers={"Authorization": f"Bearer {token}"},
        params={"$filter": filter_query, "$top": top, "$orderby": "ContentDate/Start desc"},
        timeout=timeout,
    )
    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        # Keep server error payload for easier debugging of OData filters.
        detail = response.text[:1200]
        raise requests.HTTPError(f"{exc} | CDSE response: {detail}", response=response) from exc
    return response.json()


def cauta_imagine_sentinel1(
    token: str,
    lat: float,
    lon: float,
    data_tinta: str,
    timeout: int = 30,
) -> dict[str, Any] | None:
    """Search Sentinel-1 GRD product near a point and date.

    Uses progressively larger temporal windows and selects the closest acquisition
    to the target date.
    """
    data_obj = datetime.strptime(data_tinta, "%Y-%m-%d")

    def _parse_start(item: dict[str, Any]) -> datetime:
        raw = item.get("ContentDate", {}).get("Start")
        if not raw:
            return datetime.min
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))

    search_windows = [
        (3, 1),
        (7, 3),
        (14, 7),
        (30, 14),
    ]

    selected: dict[str, Any] | None = None
    for days_before, days_after in search_windows:
        start_date = (data_obj - timedelta(days=days_before)).strftime("%Y-%m-%dT00:00:00.000Z")
        end_date = (data_obj + timedelta(days=days_after)).strftime("%Y-%m-%dT23:59:59.999Z")

        filter_query_grd = (
            "Collection/Name eq 'SENTINEL-1' and "
            "contains(Name,'_GRD_') and "
            f"OData.CSC.Intersects(area=geography'SRID=4326;POINT({lon} {lat})') and "
            f"ContentDate/Start ge {start_date} and ContentDate/Start le {end_date}"
        )

        payload = _cdse_catalogue_get(token=token, filter_query=filter_query_grd, top=20, timeout=timeout)
        items = payload.get("value", [])
        if not items:
            # Fallback: in some areas/windows there may be Sentinel-1 data but no GRD naming match.
            filter_query_any = (
                "Collection/Name eq 'SENTINEL-1' and "
                f"OData.CSC.Intersects(area=geography'SRID=4326;POINT({lon} {lat})') and "
                f"ContentDate/Start ge {start_date} and ContentDate/Start le {end_date}"
            )
            payload = _cdse_catalogue_get(token=token, filter_query=filter_query_any, top=20, timeout=timeout)
            items = payload.get("value", [])

        if not items:
            continue

        selected = min(
            items,
            key=lambda item: abs((_parse_start(item).replace(tzinfo=None) - data_obj).total_seconds()),
        )
        break

    if not selected:
        return None

    product = selected
    return {
        "sentinel1_product_id": product.get("Id"),
        "sentinel1_product_name": product.get("Name"),
        "sentinel1_start_utc": product.get("ContentDate", {}).get("Start"),
        "sentinel1_download_url": (
            f"{CDSE_ZIPPER_URL}({product.get('Id')})/$value" if product.get("Id") else None
        ),
    }


def estimare_umiditate_sol_din_sigma0(
    sigma0_now_db: float,
    sigma0_dry_db: float,
    sigma0_wet_db: float,
) -> float:
    """Estimate surface soil moisture [%] using Sentinel-1 change detection.

    Formula:
    SM(%) = clip(((sigma0_now - sigma0_dry) / (sigma0_wet - sigma0_dry)) * 100, 0, 100)

    This expects all sigma0 values in dB from calibrated, terrain-corrected SAR products.
    """
    denominator = sigma0_wet_db - sigma0_dry_db
    if denominator == 0:
        return float("nan")

    sm = ((sigma0_now_db - sigma0_dry_db) / denominator) * 100.0
    return float(np.clip(sm, 0.0, 100.0))


def extrage_umiditate_sol_sentinel1(
    token: str,
    lat: float,
    lon: float,
    data_tinta: str,
    timeout: int = 30,
) -> dict[str, Any]:
    """Return Sentinel-1 acquisition metadata and soil moisture placeholder.

    For production-grade extraction of sigma0 you must preprocess GRD (.SAFE):
    orbit correction, thermal noise removal, radiometric calibration, terrain correction,
    then sample sigma0 over the point/parcel.
    """
    product = cauta_imagine_sentinel1(
        token=token,
        lat=lat,
        lon=lon,
        data_tinta=data_tinta,
        timeout=timeout,
    )
    if product is None:
        return {
            "soil_moisture_surface_pct": float("nan"),
            "sentinel1_product_id": None,
            "sentinel1_product_name": None,
            "sentinel1_start_utc": None,
            "sentinel1_download_url": None,
        }

    # Placeholder for sigma0 retrieval pipeline.
    return {
        "soil_moisture_surface_pct": float("nan"),
        **product,
    }


def _build_era5_filter(lat: float, lon: float, start_iso: str, end_iso: str) -> str:
    return (
        "contains(Name,'ERA5') and "
        f"OData.CSC.Intersects(area=geography'SRID=4326;POINT({lon} {lat})') and "
        f"ContentDate/Start gt {start_iso} and ContentDate/Start lt {end_iso}"
    )


def extrage_precipitatii_era5(
    token: str,
    lat: float,
    lon: float,
    data_tinta: str,
    timeout: int = 30,
) -> dict[str, float | None]:
    """Extract ERA5 precipitation features (event-day and previous 7-day cumulative).

    CDSE ERA5 products typically require downloading gridded files and reading values at
    the target point. This implementation keeps robust API discovery and returns NaN when
    a direct scalar precipitation value cannot be derived from metadata only.
    """
    event_dt = datetime.strptime(data_tinta, "%Y-%m-%d")
    start_7d = (event_dt - timedelta(days=7)).strftime("%Y-%m-%dT00:00:00.000Z")
    end_event = event_dt.strftime("%Y-%m-%dT23:59:59.999Z")

    filter_query = _build_era5_filter(lat=lat, lon=lon, start_iso=start_7d, end_iso=end_event)

    payload = _cdse_catalogue_get(token=token, filter_query=filter_query, top=20, timeout=timeout)
    items = payload.get("value", [])

    # Metadata discovery (names) is preserved for audit/debug and later file extraction.
    if items:
        latest_name = items[0].get("Name")
    else:
        latest_name = None

    return {
        "precip_event_day_mm": float("nan"),
        "precip_last_7d_mm": float("nan"),
        "era5_latest_product_name": latest_name,
    }
