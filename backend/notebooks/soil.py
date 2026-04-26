import requests
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta, timezone
import math
import pandas as pd
import time

# Configurare din .env [cite: 60]
load_dotenv()

CLIENT_ID = os.getenv("COPERNICUS_CLIENT_ID")
CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET")


def normalize_iso8601_utc(value: str) -> str:
    """Normalizează timestamp-ul la formatul strict YYYY-MM-DDTHH:MM:SSZ."""
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Timestamp must be a non-empty string.")

    value = value.strip()
    parsed = None

    patterns = [
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d %H",
        "%Y-%m-%dT%H",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S%z",
    ]

    for pattern in patterns:
        try:
            parsed = datetime.strptime(value, pattern)
            break
        except ValueError:
            continue

    if parsed is None:
        # Fallback pentru valori de tip 2024-10-1T00:00:00Z (zi/lună fără zero)
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError(
                f"Invalid date/time '{value}'. Expected ISO-8601 like 2024-10-01T00:00:00Z"
            ) from exc

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    else:
        parsed = parsed.astimezone(timezone.utc)

    return parsed.strftime("%Y-%m-%dT%H:%M:%SZ")

def get_token():
    auth_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET
    }
    response = requests.post(auth_url, data=data, timeout=30)
    response.raise_for_status()
    return response.json()["access_token"]

def get_soil_moisture_data(bbox, startDate, endDate):
    startDate = normalize_iso8601_utc(startDate)
    endDate = normalize_iso8601_utc(endDate)

    min_lon, min_lat, max_lon, max_lat = bbox
    mid_lat_rad = math.radians((min_lat + max_lat) / 2.0)
    meters_per_deg_lat = 111320.0
    meters_per_deg_lon = 111320.0 * math.cos(mid_lat_rad)
    width_m = max(0.0, (max_lon - min_lon) * meters_per_deg_lon)
    height_m = max(0.0, (max_lat - min_lat) * meters_per_deg_lat)
    # Keep request close to 10m x 10m output grid while using CRS84 bounds.
    width_px = max(1, int(math.ceil(width_m / 10.0)))
    height_px = max(1, int(math.ceil(height_m / 10.0)))

    token = get_token()
    url = "https://sh.dataspace.copernicus.eu/api/v1/process"
    
    # Evalscript: Calculează umiditatea brută din Sentinel-1 GRD [cite: 97, 109]
    evalscript = """
    //VERSION=3
    function setup() {
      return {
        input: ["VV"],
        output: { bands: 1, sampleType: "FLOAT32" }
      };
    }
    function evaluatePixel(samples) {
  if (samples.VV <= 0) return [NaN];
  return [10 * Math.log10(samples.VV)];
}
    """

    headers = {
        "Authorization": f"Bearer {token}",
    }

    payload = {
    "input": {
        "bounds": {
            "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
            "bbox": bbox
        },
        "data": [{
            "type": "S1GRD",
            "dataFilter": {
                "timeRange": {
                    "from": startDate,
                    "to": endDate
                },
                "mosaickingOrder": "mostRecent",
                "acquisitionMode": "IW",
                "polarization": "DV",
                "resolution": "HIGH"
            }
        }]
    },
    "output": {
        "width": width_px,
        "height": height_px,
        "responses": [{"format": {"type": "image/tiff"}}]
    },
    "evalscript": evalscript
}

    response = requests.post(url, headers=headers, json=payload, timeout=120)
    content_type = response.headers.get("Content-Type", "")

    if not response.ok:
        error_body = response.text[:500]
        raise RuntimeError(f"Sentinel Hub request failed ({response.status_code}): {error_body}")

    # API-ul poate întoarce JSON/text cu erori chiar și pe 200; verificăm explicit formatul.
    if "image/tiff" not in content_type.lower():
        body_preview = response.text[:500]
        raise RuntimeError(
            f"Expected image/tiff, got '{content_type or 'unknown'}'. Response: {body_preview}"
        )

    content = response.content
    if not content:
        raise RuntimeError("Received empty response body from Sentinel Hub.")

    # TIFF magic bytes: little endian II*\x00 sau big endian MM\x00*
    if not (content.startswith(b"II*\x00") or content.startswith(b"MM\x00*")):
        raise RuntimeError("Response is not a valid TIFF binary payload.")
    

    return content

def pointToBox(lon, lat, size=0.1):
    half_size = size / 2
    min_lon = lon - half_size
    max_lon = lon + half_size
    min_lat = lat - half_size
    max_lat = lat + half_size
    return [min_lon, min_lat, max_lon, max_lat]

def fetchSoilMoistureHelper(lat, lon, endDate, dateRangeDays=10):
    # Calculate the start date based on the end date and date range
    startDate = datetime.strptime(endDate, "%Y-%m-%dT%H:%M:%SZ") - timedelta(days=dateRangeDays)
    startDate = startDate.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Format expected by get_soil_moisture_data -> [min_lon, min_lat, max_lon, max_lat]
    bbox = pointToBox(lon, lat)
    
    # bbox = [27.757387,45.561667, 27.779617,45.561667]
    
    print(bbox)

    import numpy as np
    from rasterio.io import MemoryFile
    import matplotlib.pyplot as plt
    import scipy.ndimage as ndimage

    # 1. Extragerea datelor brute
    result = get_soil_moisture_data(bbox, startDate, endDate)

    with MemoryFile(result) as memfile:
        with memfile.open() as src:
            arr = src.read(1).astype("float32")
            nodata = src.nodata
            if nodata is not None:
                arr = np.where(arr == nodata, np.nan, arr)

    # 2. Curățare și Filtrare (Speckle Filter)
    # Ignorăm valorile extreme care nu sunt sol (clădiri/erori)
    arr[~np.isfinite(arr)] = np.nan
    arr[(arr < -30) | (arr > 0)] = np.nan

    # Aplicăm un filtru median pentru a netezi "purecii" radar
    arr_smooth = ndimage.median_filter(arr, size=3)

    # 3. Transformare în Procent de Umiditate (SMI - Soil Moisture Index)
    # Referințe standard pentru Sentinel-1 VV: -20dB (uscat) -> -8dB (saturat)
    dry_ref = -20.0
    wet_ref = -8.0
    
    

    # Formula de normalizare
    moisture_map = 100 * (arr_smooth - dry_ref) / (wet_ref - dry_ref)
    moisture_map = np.clip(moisture_map, 0, 100) # Limităm între 0% și 100%

    valid = moisture_map[np.isfinite(moisture_map)]
    if valid.size == 0:
        print("-" * 30)
        print("REZULTAT ANALIZĂ FLOODWISE:")
        print("Nu există pixeli valizi pentru intervalul și aria selectate.")
        print("-" * 30)
        return np.nan

    # 4. CALCULUL MEDIEI
    # Ignorăm valorile NaN pentru o medie corectă
    average_moisture = np.nanmean(valid)
    
    # return average_moisture

    # print("-" * 30)
    # print(f"REZULTAT ANALIZĂ FLOODWISE:")
    # print(f"Umiditate Medie Sol: {average_moisture:.2f}%")
    # print("-" * 30)

    # 5. Vizualizare
    vmin, vmax = np.percentile(valid, [2, 98])

    # plt.figure(figsize=(10, 7))
    # # Folosim RdYlBu_r: Roșu = Uscat, Albastru = Ud
    # plt.imshow(moisture_map, cmap="RdYlBu_r", vmin=vmin, vmax=vmax)
    # plt.colorbar(label="Saturația Solului (%)")
    # plt.title(f"FloodWise: Hartă Saturație (Medie: {average_moisture:.1f}%)")
    # plt.axis("off")
    # plt.show()
    return average_moisture
    
    # 2024-10-29T23:59:59Z

def fetchSoilMoisture(lon, lat, endDate, initialRangeDays=3, stepDays=30, maxRangeDays=30*3):
    dateRangeDays = initialRangeDays
    last_exception = None

    while dateRangeDays <= maxRangeDays:
        print(f"Încercare cu fereastră de {dateRangeDays} zile...")
        try:
            result = fetchSoilMoistureHelper(lon, lat, endDate, dateRangeDays)
            if result is None:
                # Caz defensiv: helper-ul ar trebui să întoarcă media sau np.nan.
                dateRangeDays += stepDays
                continue

            if isinstance(result, float) and math.isnan(result):
                print("Fără pixeli valizi. Extind intervalul temporal și reîncerc.")
                dateRangeDays += stepDays
                continue

            return result
        except Exception as exc:
            last_exception = exc
            print(f"Error fetching soil moisture: {exc}")
            print("Extind intervalul temporal și reîncerc.")
            dateRangeDays += stepDays

    return None
    # if last_exception is not None:
    #     raise RuntimeError(f"Max retries exceeded. Last error: {last_exception}") from last_exception

    # raise RuntimeError("Max retries exceeded: no valid pixels found for the selected area and period.")

# fetchSoilMoisture(45.575496, 27.76228, "2026-04-25T23:59:59Z")
def process_soil_moisture_csv(
    input_csv="data/raw/evenimente_baza.csv", 
    output_csv="data/groundwater_ml_dataset_final.csv",
    save_every=5
):
    print(f"Încărcare date din: {input_csv}")
    
    # 1. Citim CSV-ul de intrare
    df_input = pd.read_csv(input_csv)
    
    # 2. Verificam daca output-ul exista deja pentru a putea da "resume"
    if os.path.exists(output_csv):
        df_output = pd.read_csv(output_csv)
        print(f"Fișier output existent găsit cu {len(df_output)} rânduri. Modul Resume activat.")
    else:
        df_output = df_input.copy()
        # Adaugam coloanele noi daca nu exista
        if "Inundatie_Target" not in df_output.columns:
            df_output["Inundatie_Target"] = 1 # Presupunem 1 pentru evenimente confirmate, ajusteaza daca e nevoie
        if "soil_moisture_surface_pct" not in df_output.columns:
            df_output["soil_moisture_surface_pct"] = pd.NA
            
    # 3. Găsim rândurile care nu au fost încă procesate (unde soil_moisture este null)
    mask_unprocessed = df_output["soil_moisture_surface_pct"].isna()
    indices_to_process = df_output[mask_unprocessed].index
    
    total = len(indices_to_process)
    if total == 0:
        print("Toate rândurile au fost deja procesate!")
        return

    print(f"Rânduri rămase de procesat: {total}")
    
    # 4. Procesam fiecare rand
    processed_count = 0
    for idx in indices_to_process:
        row = df_output.loc[idx]
        station_id = row["ID_Statie"]
        lat = float(row["Lat"])
        lon = float(row["Lon"])
        
        # Formatam data din YYYY-MM-DD in formatul asteptat de API: YYYY-MM-DDTHH:MM:SSZ
        raw_date = str(row["Data"]).strip()
        if "T" not in raw_date:
            formatted_date = f"{raw_date}T23:59:59Z"
        else:
            formatted_date = raw_date
            
        print(f"\n[{processed_count + 1}/{total}] Procesare {station_id} | Lat: {lat}, Lon: {lon}, Data: {formatted_date}")
        
        try:
            # Apelam functia ta (interval initial 3 zile, urcat la max 90)
            moisture_val = fetchSoilMoisture(lon, lat, formatted_date, initialRangeDays=3, stepDays=30, maxRangeDays=90)
            
            # Salvam rezultatul in dataframe
            df_output.at[idx, "soil_moisture_surface_pct"] = moisture_val
            print(f"-> Succes: {moisture_val:.2f}%")
            
        except Exception as e:
            print(f"-> Eșec pentru {station_id}: {e}")
            # Lasam pd.NA pentru a fi preluat la o rulare ulterioara
            
        processed_count += 1
        
        # 5. Salvam progresul in batch-uri pentru a nu pierde date la crash-uri
        if processed_count % save_every == 0 or processed_count == total:
            df_output.to_csv(output_csv, index=False)
            print(f"--- Progres salvat în {output_csv} ---")

    print("\nProcesare completă finalizată!")

# === RULAREA SCRIPTULUI ===
if __name__ == "__main__":
    # Ajusteaza path-urile conform structurii tale de foldere
    input_path = "backend/data/raw/evenimente_baza.csv" # Inlocuieste cu fisierul tau real
    output_path = "backend/data/groundwater_ml_dataset_final.csv"
    
    process_soil_moisture_csv(input_csv=input_path, output_csv=output_path)