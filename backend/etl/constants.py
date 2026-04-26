"""Constants used by the ETL pipeline."""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"

DEFAULT_INPUT_CSV = RAW_DIR / "evenimente_baza.csv"
DEFAULT_OUTPUT_CSV = DATA_DIR / "groundwater_ml_dataset_final.csv"

DEFAULT_DEM_PATH = RAW_DIR / "copernicus_dem.tif"
DEFAULT_SLOPE_PATH = RAW_DIR / "copernicus_slope.tif"
DEFAULT_GLHYMPS_PATH = RAW_DIR / "glhymps.gpkg"

SOILGRIDS_BASE_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
CDSE_TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu/"
    "auth/realms/CDSE/protocol/openid-connect/token"
)
CDSE_CATALOGUE_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"
CDSE_ZIPPER_URL = "https://zipper.dataspace.copernicus.eu/odata/v1/Products"
