from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import os
import sys
from datetime import datetime

# Add notebooks to path so we can import the scripts
sys.path.append(os.path.join(os.path.dirname(__file__), "notebooks"))

import retrieve_elevation
import precipitations
import soil
import forecast

app = FastAPI()

# Load model and features at startup
MODEL_PATH = 'models/flood_risk_model.joblib'
FEATURES_PATH = 'models/feature_names.joblib'

if os.path.exists(MODEL_PATH) and os.path.exists(FEATURES_PATH):
    model = joblib.load(MODEL_PATH)
    features = joblib.load(FEATURES_PATH)
else:
    model = None
    features = None

class PredictionRequest(BaseModel):
    elevation: float
    mean_precipitation_mm: float
    soil_moisture: float

class LocationPredictionRequest(BaseModel):
    lat: float
    lon: float
    date: str  # Format: YYYY-MM-DD

class ForecastPredictionRequest(BaseModel):
    lat: float
    lon: float
    days: int = 7

@app.get("/")
async def root():
    return {"message": "FloodWise API is running"}

@app.post("/predict")
async def predict(request: PredictionRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Please run train_model.py first.")
    
    input_df = pd.DataFrame([request.dict()])
    prediction = model.predict(input_df)[0]
    probabilities = model.predict_proba(input_df)[0]
    confidence = float(max(probabilities))
    
    return {
        "flood_risk": int(prediction),
        "confidence": confidence,
        "probabilities": {
            "no_flood": float(probabilities[0]),
            "flood": float(probabilities[1])
        }
    }

@app.post("/predict-location")
async def predict_location(request: LocationPredictionRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Please run train_model.py first.")

    try:
        # 1. Parse date
        dt = datetime.strptime(request.date, "%Y-%m-%d")
        year, month, day = str(dt.year), f"{dt.month:02d}", f"{dt.day:02d}"
        iso_date = dt.strftime("%Y-%m-%dT23:59:59Z")

        # 2. Fetch Elevation
        token = retrieve_elevation.get_token()
        elevation = retrieve_elevation.get_elevation_data(request.lat, request.lon, token)

        # 3. Fetch Precipitation
        # This will download a temporary grib file
        precip_data = precipitations.run(request.lat, request.lon, year, month, day)
        mean_precip = precip_data["mean_precipitation_mm"]

        # 4. Fetch Soil Moisture
        soil_moisture = soil.fetchSoilMoistureHelper(request.lat, request.lon, iso_date)

        # Check for NaNs and convert to native float
        features_dict = {
            "elevation": float(elevation),
            "mean_precipitation_mm": float(mean_precip),
            "soil_moisture": float(soil_moisture)
        }
        
        for name, val in features_dict.items():
            if pd.isna(val):
                raise HTTPException(status_code=500, detail=f"Failed to fetch valid data for {name}")

        # 5. Predict
        input_df = pd.DataFrame([features_dict])
        prediction = model.predict(input_df)[0]
        probabilities = model.predict_proba(input_df)[0]
        confidence = float(max(probabilities))

        return {
            "location": {"lat": request.lat, "lon": request.lon},
            "date": request.date,
            "features": features_dict,
            "flood_risk": int(prediction),
            "confidence": confidence,
            "probabilities": {
                "no_flood": float(probabilities[0]),
                "flood": float(probabilities[1])
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-forecast")
async def predict_forecast(request: ForecastPredictionRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Please run train_model.py first.")

    try:
        # 1. Fetch Elevation (Static)
        token = retrieve_elevation.get_token()
        elevation = retrieve_elevation.get_elevation_data(request.lat, request.lon, token)
        
        if pd.isna(elevation):
             raise HTTPException(status_code=500, detail="Failed to fetch valid elevation data")

        # 2. Fetch Forecast Data
        daily_forecasts = forecast.get_forecast_data(request.lat, request.lon, request.days)

        predictions = []
        for day_data in daily_forecasts:
            # 3. Prepare Features
            features_dict = {
                "elevation": float(elevation),
                "mean_precipitation_mm": float(day_data["mean_precipitation_mm"]),
                "soil_moisture": float(day_data["soil_moisture"])
            }

            # 4. Predict
            input_df = pd.DataFrame([features_dict])
            prediction = model.predict(input_df)[0]
            probabilities = model.predict_proba(input_df)[0]
            confidence = float(max(probabilities))

            predictions.append({
                "date": day_data["date"],
                "features": features_dict,
                "flood_risk": int(prediction),
                "confidence": confidence,
                "probabilities": {
                    "no_flood": float(probabilities[0]),
                    "flood": float(probabilities[1])
                }
            })

        return {
            "location": {"lat": request.lat, "lon": request.lon},
            "forecast_days": request.days,
            "predictions": predictions
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))