import requests
import pandas as pd
from datetime import datetime

def get_forecast_data(lat: float, lon: float, days: int = 7):
    """
    Fetches weather forecast from Open-Meteo.
    Returns a list of dictionaries, one for each day.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "precipitation_sum,soil_moisture_0_to_7cm_mean",
        "timezone": "auto",
        "forecast_days": days
    }
    
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()
    
    daily = data.get("daily", {})
    times = daily.get("time", [])
    precip_sums = daily.get("precipitation_sum", [])
    soil_moistures_vol = daily.get("soil_moisture_0_to_7cm_mean", [])
    
    results = []
    for i in range(len(times)):
        # Heuristic mapping: Volumetric water content (m3/m3) to percentage (0-100)
        # 0.1 m3/m3 is quite dry (~20%), 0.5 m3/m3 is saturated (100%)
        # Formula: (val * 200) capped at 100
        vol_val = soil_moistures_vol[i] if i < len(soil_moistures_vol) else 0.2
        if vol_val is None: vol_val = 0.2
        
        soil_moisture_pct = min(100.0, max(0.0, vol_val * 200.0))
        
        results.append({
            "date": times[i],
            "mean_precipitation_mm": precip_sums[i] if i < len(precip_sums) else 0.0,
            "soil_moisture": soil_moisture_pct
        })
        
    return results

if __name__ == "__main__":
    # Test for Bucharest
    test_lat, test_lon = 44.4268, 26.1025
    forecast = get_forecast_data(test_lat, test_lon, 3)
    print(forecast)
