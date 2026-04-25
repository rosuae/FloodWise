import os
import pandas as pd
import requests
import math
import numpy as np
from dotenv import load_dotenv
from rasterio.io import MemoryFile

# Load environment variables
load_dotenv()

CLIENT_ID = os.getenv("COPERNICUS_CLIENT_ID") or os.getenv("CDSE_CLIENT_ID")
CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET") or os.getenv("CDSE_CLIENT_SECRET")

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

def get_elevation_data(lat, lon, token):
    """
    Fetches elevation for a single point using Copernicus DEM GLO-30.
    We request a tiny 1x1 pixel image around the point.
    """
    # Create a very small bbox around the point
    delta = 0.0001
    bbox = [lon - delta, lat - delta, lon + delta, lat + delta]
    
    url = "https://sh.dataspace.copernicus.eu/api/v1/process"
    
    evalscript = """
    //VERSION=3
    function setup() {
      return {
        input: ["DEM"],
        output: { bands: 1, sampleType: "FLOAT32" }
      };
    }
    function evaluatePixel(samples) {
      return [samples.DEM];
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
                "type": "DEM",
                "dataFilter": {
                    "demInstance": "COPERNICUS_30"
                }
            }]
        },
        "output": {
            "width": 1,
            "height": 1,
            "responses": [{"format": {"type": "image/tiff"}}]
        },
        "evalscript": evalscript
    }

    response = requests.post(url, headers=headers, json=payload, timeout=60)
    if not response.ok:
        print(f"Error fetching elevation for ({lat}, {lon}): {response.text}")
        return np.nan

    try:
        with MemoryFile(response.content) as memfile:
            with memfile.open() as src:
                arr = src.read(1)
                return float(arr[0, 0])
    except Exception as e:
        print(f"Error parsing TIFF for ({lat}, {lon}): {e}")
        return np.nan

def process_elevation(
    input_csv="backend/data/raw/evenimente_baza.csv",
    output_csv="backend/data/groundwater_ml_dataset_final.csv",
    save_every=10
):
    print(f"Loading data from: {input_csv}")
    df_input = pd.read_csv(input_csv)
    
    if os.path.exists(output_csv):
        df_output = pd.read_csv(output_csv)
        print(f"Found existing output file with {len(df_output)} rows. Resume mode enabled.")
    else:
        df_output = df_input.copy()
        print("Creating new output file.")
    
    if "elevation" not in df_output.columns:
        df_output["elevation"] = np.nan
        
    # Find unprocessed rows
    mask_unprocessed = df_output["elevation"].isna()
    indices_to_process = df_output[mask_unprocessed].index
    
    total = len(indices_to_process)
    if total == 0:
        print("All rows already have elevation data!")
        return

    print(f"Rows to process: {total}")
    
    try:
        token = get_token()
    except Exception as e:
        print(f"Failed to get CDSE token: {e}")
        return

    processed_count = 0
    for idx in indices_to_process:
        row = df_output.loc[idx]
        lat = row["Lat"]
        lon = row["Lon"]
        
        print(f"[{processed_count + 1}/{total}] Processing {row['ID_Statie']} | Lat: {lat}, Lon: {lon}")
        
        elevation = get_elevation_data(lat, lon, token)
        
        if not math.isnan(elevation):
            df_output.at[idx, "elevation"] = elevation
            print(f"-> Success: {elevation:.2f} m")
        else:
            print("-> Failed to retrieve elevation")
            
        processed_count += 1
        
        if processed_count % save_every == 0 or processed_count == total:
            df_output.to_csv(output_csv, index=False)
            print(f"--- Progress saved to {output_csv} ---")

    print("\nElevation retrieval complete!")

if __name__ == "__main__":
    process_elevation()
