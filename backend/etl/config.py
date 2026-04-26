"""Environment and runtime configuration for ETL."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

from .constants import (
    DEFAULT_DEM_PATH,
    DEFAULT_GLHYMPS_PATH,
    DEFAULT_INPUT_CSV,
    DEFAULT_OUTPUT_CSV,
    DEFAULT_SLOPE_PATH,
)


@dataclass(frozen=True)
class PipelineConfig:
    """Configuration values used across the ETL pipeline."""

    input_csv: Path
    output_csv: Path
    dem_raster_path: Path
    slope_raster_path: Path
    glhymps_path: Path
    cdse_access_token: str | None
    cdse_client_id: str | None
    cdse_client_secret: str | None
    request_timeout_seconds: int


def load_pipeline_config() -> PipelineConfig:
    """Load config from .env and fallback defaults."""
    backend_dir = Path(__file__).resolve().parents[1]
    load_dotenv(backend_dir / ".env")

    return PipelineConfig(
        input_csv=Path(os.getenv("FLOODWISE_INPUT_CSV", str(DEFAULT_INPUT_CSV))),
        output_csv=Path(os.getenv("FLOODWISE_OUTPUT_CSV", str(DEFAULT_OUTPUT_CSV))),
        dem_raster_path=Path(os.getenv("FLOODWISE_DEM_PATH", str(DEFAULT_DEM_PATH))),
        slope_raster_path=Path(os.getenv("FLOODWISE_SLOPE_PATH", str(DEFAULT_SLOPE_PATH))),
        glhymps_path=Path(os.getenv("FLOODWISE_GLHYMPS_PATH", str(DEFAULT_GLHYMPS_PATH))),
        cdse_access_token=os.getenv("CDSE_ACCESS_TOKEN")
        or os.getenv("COPERNICUS_API_KEY")
        or os.getenv("COPERNICUS_ACCESS_TOKEN"),
        cdse_client_id=os.getenv("COPERNICUS_CLIENT_ID")
        or os.getenv("CDSE_CLIENT_ID")
        or os.getenv("COPERNICUS_USER_ID")
        or os.getenv("copernicus_user_id"),
        cdse_client_secret=os.getenv("COPERNICUS_CLIENT_SECRET")
        or os.getenv("CDSE_CLIENT_SECRET")
        or os.getenv("COPERNICUS_USER_SECRET")
        or os.getenv("copernicus_user_secret"),
        request_timeout_seconds=int(os.getenv("FLOODWISE_REQUEST_TIMEOUT", "30")),
    )
