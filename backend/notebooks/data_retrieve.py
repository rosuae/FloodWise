from pathlib import Path
import sys

from dotenv import load_dotenv
import requests

# Adaugă backend-ul în PYTHONPATH pentru importuri din pachetul etl.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from etl.config import load_pipeline_config
from etl.dynamic_features import CdseCredentials, cauta_imagine_sentinel1, get_cdse_token


def main() -> None:
    load_dotenv(BACKEND_DIR / ".env")
    cfg = load_pipeline_config()

    if cfg.cdse_access_token:
        token = cfg.cdse_access_token
        print("Autentificare CDSE reusita folosind token/API key din .env")
    else:
        if not cfg.cdse_client_id or not cfg.cdse_client_secret:
            raise ValueError(
                "Lipsesc datele CDSE in backend/.env. Seteaza CDSE_ACCESS_TOKEN sau COPERNICUS_CLIENT_ID/COPERNICUS_CLIENT_SECRET"
            )

        token = get_cdse_token(
            credentials=CdseCredentials(
                client_id=cfg.cdse_client_id,
                client_secret=cfg.cdse_client_secret,
            ),
            timeout=cfg.request_timeout_seconds,
        )
        print("Autentificare CDSE reusita folosind OAuth2 client credentials")

    try:
        produs = cauta_imagine_sentinel1(
            token=token,
            lat=50.720,
            lon=-2.590,
            data_tinta="2020-02-16",
            timeout=cfg.request_timeout_seconds,
        )
    except requests.HTTPError as exc:
        print(f"Eroare CDSE Catalog API: {exc}")
        return

    if not produs:
        print("Nu s-a gasit nicio imagine Sentinel-1 GRD in fereastra selectata")
        return

    print(f"Produs Sentinel-1: {produs['sentinel1_product_name']}")
    print(f"Start UTC: {produs['sentinel1_start_utc']}")
    print(f"Download URL: {produs['sentinel1_download_url']}")


if __name__ == "__main__":
    main()