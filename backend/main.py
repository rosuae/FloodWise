from __future__ import annotations
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

from datetime import datetime, timezone
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import ALGORITHM, SECRET_KEY, create_access_token, get_password_hash, verify_password
from database import Base, engine, get_db
import models

app = FastAPI(title="FloodWise API", version="0.1.0")

# Security
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


@app.on_event("startup")
def startup() -> None:
    # Ensure auth and core tables exist for local/dev teammates without manual migration step.
    Base.metadata.create_all(bind=engine)


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str | None = None

class Token(BaseModel):
    access_token: str
    token_type: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str | None
    created_at: datetime

    class Config:
        from_attributes = True

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Coordinate(BaseModel):
    lon: float
    lat: float


class FloodPolygon(BaseModel):
    id: str
    severity: Literal["low", "medium", "high"]
    confidence: float = Field(ge=0.0, le=1.0)
    area_hectares: float
    geometry: list[list[list[float]]]


class RoadImpact(BaseModel):
    name: str
    status: Literal["blocked", "at_risk"]
    reason: str
    confidence: float = Field(ge=0.0, le=1.0)


class LiveFloodAssessment(BaseModel):
    area_id: str
    area_name: str
    updated_at: datetime
    source_scene: str
    baseline_scene: str
    soil_saturation: float = Field(ge=0.0, le=1.0)
    surface_water_coverage: float = Field(ge=0.0, le=1.0)
    flood_probability: float = Field(ge=0.0, le=1.0)
    risk_level: Literal["moderate", "high", "critical"]
    polygons: list[FloodPolygon]
    blocked_roads: list[RoadImpact]
    centroid: Coordinate


def _build_assessment(area_id: str) -> LiveFloodAssessment:
    if area_id.upper() == "RO-B-001":
        return LiveFloodAssessment(
            area_id="RO-B-001",
            area_name="București",
            updated_at=datetime.now(timezone.utc),
            source_scene="S1A_IW_GRDH_1SDV_20260420T063125",
            baseline_scene="S1A_IW_GRDH_1SDV_20260305T063111",
            soil_saturation=0.82,
            surface_water_coverage=0.31,
            flood_probability=0.76,
            risk_level="high",
            centroid=Coordinate(lon=26.1025, lat=44.4325),
            polygons=[
                FloodPolygon(
                    id="flood-001",
                    severity="high",
                    confidence=0.91,
                    area_hectares=42.8,
                    geometry=[
                        [
                            [26.046, 44.469],
                            [26.112, 44.470],
                            [26.118, 44.442],
                            [26.058, 44.437],
                            [26.046, 44.469],
                        ]
                    ],
                ),
                FloodPolygon(
                    id="flood-002",
                    severity="medium",
                    confidence=0.84,
                    area_hectares=18.6,
                    geometry=[
                        [
                            [26.148, 44.509],
                            [26.194, 44.508],
                            [26.186, 44.485],
                            [26.141, 44.487],
                            [26.148, 44.509],
                        ]
                    ],
                ),
            ],
            blocked_roads=[
                RoadImpact(
                    name="DNCB - segment Nord",
                    status="blocked",
                    reason="Intersected with newly detected flood polygon",
                    confidence=0.87,
                ),
                RoadImpact(
                    name="DJ101B",
                    status="at_risk",
                    reason="Adjacent to high-confidence surface water extent",
                    confidence=0.73,
                ),
            ],
        )

    return LiveFloodAssessment(
        area_id=area_id,
        area_name="Area monitorizată",
        updated_at=datetime.now(timezone.utc),
        source_scene="S1A_IW_GRDH_1SDV_UNKNOWN",
        baseline_scene="S1A_IW_GRDH_1SDV_BASELINE",
        soil_saturation=0.64,
        surface_water_coverage=0.12,
        flood_probability=0.41,
        risk_level="moderate",
        centroid=Coordinate(lon=26.1, lat=44.43),
        polygons=[],
        blocked_roads=[],
    )

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

import subprocess
import tempfile
import json
import os
from fastapi.responses import FileResponse

class PolygonFeature(BaseModel):
    coordinates: list[list[float]]

def _generate_ndwi_data(coordinates: list[list[float]]):
    if not coordinates or len(coordinates) < 3:
        return None, ""

    # Format for GeoJSON: [[lon, lat], [lon, lat], ...]
    geojson_coords = [[coord[1], coord[0]] for coord in coordinates]
    if geojson_coords[0] != geojson_coords[-1]:
        geojson_coords.append(geojson_coords[0])

    feature = {
        "type": "Feature",
        "geometry": { "type": "Polygon", "coordinates": [geojson_coords] },
        "properties": {}
    }

    with tempfile.NamedTemporaryFile(mode='w', suffix='.geojson', delete=False) as f:
        json.dump(feature, f)
        temp_path = f.name

    output_png = temp_path.replace('.geojson', '.png')
    output_csv = temp_path.replace('.geojson', '.csv')

    import datetime
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=365)

    script_path = os.path.join(os.path.dirname(__file__), "scripts", "ndwi_timeseries.py")
    try:
        subprocess.run([
            "python3", script_path,
            "--field-geojson", temp_path,
            "--start", start_date.strftime("%Y-%m-%d"),
            "--end", end_date.strftime("%Y-%m-%d"),
            "--ee-project", "copernicus-450700",
            "--output-plot", output_png,
            "--output-csv", output_csv
        ], check=True, capture_output=True, text=True, timeout=45)
    except Exception as e:
        print("Script execution failed:", e)
        return None, ""

    latest_ndwi = None
    try:
        import pandas as pd
        if os.path.exists(output_csv):
            df = pd.read_csv(output_csv)
            if not df.empty:
                latest_ndwi = float(df.iloc[-1]['ndwi_mean'])
    except: pass

    import base64
    img_b64 = ""
    if os.path.exists(output_png):
        with open(output_png, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode("utf-8")

    for p in [temp_path, output_png, output_csv]:
        if os.path.exists(p): os.remove(p)

    return latest_ndwi, img_b64

@app.post("/api/ndwi-graph")
async def generate_ndwi_graph_endpoint(polygon: PolygonFeature):
    latest_ndwi, img_b64 = _generate_ndwi_data(polygon.coordinates)
    if not img_b64:
        raise HTTPException(status_code=500, detail="Graph generation failed")
    return {"image_base64": img_b64, "latest_ndwi": latest_ndwi}

class ZoneCreate(BaseModel):
    name: str
    coordinates: list[list[float]]
    area_ha: float
    crop_type: str
    risk_percent: float
    estimated_loss: float
    rainfall_mm: float
    slope_deg: float

class ZoneOut(BaseModel):
    id: int
    name: str
    area_ha: float
    crop_type: str
    risk_percent: float
    estimated_loss: float
    latest_ndwi: float | None
    rainfall_mm: float | None
    slope_deg: float | None
    graph_image_b64: str | None
    created_at: datetime

    class Config:
        from_attributes = True

@app.post("/api/zones", response_model=ZoneOut)
async def create_zone(zone_in: ZoneCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Check for existing zone with same parameters for this user to avoid duplicates
    coords_json = json.dumps(zone_in.coordinates)
    existing = db.query(models.SavedZone).filter(
        models.SavedZone.user_id == current_user.id,
        models.SavedZone.coordinates == coords_json,
        models.SavedZone.area_ha == zone_in.area_ha,
        models.SavedZone.crop_type == zone_in.crop_type
    ).first()
    
    if existing:
        return existing

    latest_ndwi, img_b64 = _generate_ndwi_data(zone_in.coordinates)
    
    new_zone = models.SavedZone(
        user_id=current_user.id,
        name=zone_in.name,
        coordinates=coords_json,
        area_ha=zone_in.area_ha,
        crop_type=zone_in.crop_type,
        risk_percent=zone_in.risk_percent,
        estimated_loss=zone_in.estimated_loss,
        latest_ndwi=latest_ndwi,
        rainfall_mm=zone_in.rainfall_mm,
        slope_deg=zone_in.slope_deg,
        graph_image_b64=img_b64
    )
    db.add(new_zone)
    db.commit()
    db.refresh(new_zone)
    return new_zone

@app.get("/api/zones", response_model=list[ZoneOut])
async def list_zones(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.SavedZone).filter(models.SavedZone.user_id == current_user.id).order_by(models.SavedZone.created_at.desc()).all()

@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "FloodWise API is running"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/live-flood/assessment", response_model=LiveFloodAssessment)
async def live_flood_assessment(
    area_id: str = Query(default="RO-B-001", description="Monitoring area identifier"),
) -> LiveFloodAssessment:
    return _build_assessment(area_id)


@app.post("/auth/register", response_model=UserOut)
async def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=get_password_hash(user_in.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me", response_model=UserOut)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

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
