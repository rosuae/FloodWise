<p align="center">
  <img src="https://img.shields.io/badge/FloodWise-Predict.%20Warn.%20Protect.-2a3f10?style=for-the-badge&labelColor=f8d856&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMyYTNmMTAiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTEyIDIgNiAxMmE2IDYgMCAxIDAgMTIgMEwxMiAyWiIvPjwvc3ZnPg==" alt="FloodWise" />
</p>

<p align="center">
  <a href="#overview"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT" /></a>
  <a href="#tech-stack"><img src="https://img.shields.io/badge/Python-3.11+-blue.svg" alt="Python" /></a>
  <a href="#tech-stack"><img src="https://img.shields.io/badge/React-19-61DAFB.svg" alt="React" /></a>
  <a href="#tech-stack"><img src="https://img.shields.io/badge/FastAPI-0.115-009688.svg" alt="FastAPI" /></a>
  <a href="#satellites--data-sources"><img src="https://img.shields.io/badge/Data-Copernicus-teal.svg" alt="Copernicus" /></a>
  <a href="#satellites--data-sources"><img src="https://img.shields.io/badge/Galileo-GNSS--R-orange.svg" alt="Galileo" /></a>
  <a href="#tech-stack"><img src="https://img.shields.io/badge/Docker-Compose-2496ED.svg" alt="Docker" /></a>
</p>

<div align="center">

# 💧FloodWise
</div>

FloodWise detects **the invisible killer** — **underground floods**. While surface floods are visible and tracked by conventional systems, groundwater saturation builds silently beneath the soil over days and weeks. When the ground can absorb no more, a single rainfall triggers catastrophic flash flooding, crop destruction, and infrastructure collapse — with **zero visible warning**.

FloodWise uses **Copernicus** and **Galileo** satellite data to see what the naked eye cannot: the hidden saturation index beneath agricultural land. By combining radar-derived soil moisture, precipitation accumulation, terrain analysis, and machine learning, FloodWise predicts groundwater flooding **before it reaches the surface**.

Built for the [11th CASSINI Hackathon: EU Space for Water](https://www.cassini.eu/hackathons/portfolio).

---

## Table of Contents

- [The Problem: Underground Floods](#the-problem-underground-floods)
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Satellites & Data Sources](#satellites--data-sources)
- [Data-to-Model Pipeline](#data-to-model-pipeline)
  - [1. Data Retrieval](#1-data-retrieval)
  - [2. ETL & Feature Engineering](#2-etl--feature-engineering)
  - [3. Model Training](#3-model-training)
- [Prediction Workflow](#prediction-workflow)
  - [Single-Date Prediction](#single-date-prediction)
  - [Future Forecast Prediction](#future-forecast-prediction)
- [User Usage Workflow](#user-usage-workflow)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [License](#license)

---

## The Problem: Underground Floods

**What happens:**
1. Weeks of moderate rain slowly saturate clay-heavy soils
2. Groundwater table rises — the soil's absorption capacity drops to zero
3. The surface looks normal — no puddles, no rivers overflowing
4. Then, a single 10mm rainfall hits → **instant flash flood**, because the ground is already full
5. Crops are destroyed, roads are blocked, communities are cut off

**Why it's invisible:** Conventional weather warnings only trigger on *heavy rainfall*. But underground floods happen after *cumulative moderate rainfall* on specific soil types. Without satellite-based subsurface monitoring, there is **no warning**.

**FloodWise solves this** by using Sentinel-1 SAR radar to penetrate the soil surface and measure moisture levels that are invisible to optical sensors and human observers. Combined with terrain slope, soil clay content, hydraulic conductivity, and precipitation accumulation, FloodWise's AI model identifies the exact conditions that precede underground flooding — and issues warnings **hours to days before** the surface shows any sign of danger.

---

## Overview

FloodWise acts as a predictive shield for vulnerable landscapes. By synthesizing multi-source European space data, the platform translates raw orbital telemetry into actionable, localized risk insights.

### Why FloodWise?
The platform bridges the gap between raw data and emergency action:
- **Subsurface Vision:** Uses radar to map soil saturation, seeing what optical sensors miss.
- **Predictive Lead Time:** Generates warnings long before the saturation point is reached.
- **Precision Agriculture Focus:** Tailored for agricultural parcels where soil health determines the risk.

### Core Features

- **Underground flood prediction** — detect invisible groundwater saturation before it causes surface flooding
- **Flood risk mapping** — per-area risk scores computed from live satellite and meteorological data
- **Interactive map with polygon drawing** — users draw/select agricultural parcels directly on the map
- **Economic impact calculator** — estimate crop-specific financial losses based on flood probability
- **Early warning alerts** — configurable threshold triggers with notification support
- **NDWI time-series analysis** — Sentinel-2 vegetation/water index charting via Google Earth Engine
- **Future period forecasting** — multi-day flood predictions using Open-Meteo weather forecasts
- **Saved zones** — persist monitored areas to the database for long-term tracking
- **Historical analysis** — compare current readings against historical baselines

---

## System Architecture

```mermaid
graph TB
    subgraph "🛰️ Space Data Sources"
        S1[Sentinel-1 SAR<br/>Soil Moisture]
        S2[Sentinel-2 MSI<br/>NDWI / Vegetation]
        ERA5[ERA5 Reanalysis<br/>Precipitation / Temperature]
        DEM[Copernicus DEM GLO-30<br/>Elevation]
        GAL[Galileo GNSS-R<br/>Reflectometry]
    end

    subgraph "🌐 External APIs"
        CDSE[Copernicus Data Space<br/>Ecosystem API]
        GEE[Google Earth Engine]
        CDS[Climate Data Store API]
        SG[ISRIC SoilGrids API]
        OM[Open-Meteo API]
        SH[Sentinel Hub API]
    end

    subgraph "⚙️ Backend · Python / FastAPI"
        ETL[ETL Pipeline<br/>etl/pipeline.py]
        DC[Data Collector<br/>data_collector.py]
        NB["Data Modules<br/>notebooks/*.py"]
        TM[Model Training<br/>train_model.py]
        ML[ML Model<br/>Random Forest .joblib]
        API[REST API<br/>main.py]
        DB[(PostgreSQL)]
    end

    subgraph "🖥️ Frontend · React / Vite"
        LAND[Landing Page]
        AUTH[Auth · Login / Register]
        MAP[Risk Map<br/>Leaflet + Geoman]
        ECON[Economic Impact Panel]
        DASH[Analytical Dashboard]
        NDWI[NDWI Chart Viewer]
    end

    S1 --> CDSE
    S2 --> GEE
    ERA5 --> CDS
    DEM --> CDSE
    GAL --> CDSE

    CDSE --> ETL
    CDSE --> NB
    CDS --> NB
    SG --> ETL
    GEE --> API
    OM --> API
    SH --> NB

    NB --> API
    ETL --> DC
    DC --> TM
    TM --> ML
    ML --> API
    API --> DB

    API --> MAP
    API --> DASH
    API --> ECON
    API --> NDWI
    MAP --> ECON
    ECON --> DASH

    style S1 fill:#1a5276,color:#fff
    style S2 fill:#1e8449,color:#fff
    style ERA5 fill:#b7950b,color:#fff
    style DEM fill:#6c3483,color:#fff
    style GAL fill:#ca6f1e,color:#fff
    style ML fill:#c0392b,color:#fff
    style DB fill:#2980b9,color:#fff
```

---

## Satellites & Data Sources

| Satellite / Dataset | Provider | Data Type | Variables Used | Access Method |
|---|---|---|---|---|
| **Sentinel-1 SAR** | Copernicus / ESA | C-band SAR (GRD) | VV-polarization backscatter → soil moisture estimation | Sentinel Hub Process API |
| **Sentinel-2 MSI** | Copernicus / ESA | Multispectral imagery | B3 (Green), B8 (NIR) → NDWI calculation | Google Earth Engine |
| **ERA5 Reanalysis** | C3S / ECMWF | Gridded reanalysis | Total precipitation (m), 2m temperature (K) | CDS API (GRIB/NetCDF) |
| **Copernicus DEM GLO-30** | Copernicus / ESA | Digital Elevation Model | Elevation (m) at 30m resolution | Sentinel Hub Process API |
| **GLHYMPS** | University of Calgary | Hydrogeology | Hydraulic conductivity (m/day) | Local GeoPackage |
| **SoilGrids v2.0** | ISRIC | Soil properties | Clay content (g/kg) at 0-5cm depth | REST API |
| **Open-Meteo** | Open-Meteo GmbH | Weather forecast | Daily precipitation sum, soil moisture (0-7cm) | REST API |
| **Galileo GNSS-R** | ESA | GNSS reflectometry | Surface moisture via reflected signals | CDSE Catalogue |

All satellite data is accessed via the [Copernicus Data Space Ecosystem](https://dataspace.copernicus.eu/). No paid licenses required.

---

## Data-to-Model Pipeline

The complete pipeline from raw satellite data to a trained ML model:

```mermaid
flowchart LR
    subgraph "1 · Data Retrieval"
        A1[Base Events CSV<br/>ID_Statie, Lat, Lon,<br/>Data, Inundatie_Target]
        A2[CDSE OAuth2 Token]
    end

    subgraph "2 · Feature Engineering"
        direction TB
        B1["🏔️ Static Features"]
        B1a[Clay % · SoilGrids API]
        B1b[Elevation · Copernicus DEM raster]
        B1c[Slope · slope raster]
        B1d[Hydraulic Conductivity · GLHYMPS]
        B2["🌧️ Dynamic Features"]
        B2a[Precipitation · ERA5 via CDSE]
        B2b[Soil Moisture · Sentinel-1 sigma0]
        B1 --> B1a & B1b & B1c & B1d
        B2 --> B2a & B2b
    end

    subgraph "3 · Training"
        C1[Final Dataset CSV<br/>groundwater_ml_dataset_final.csv]
        C2["Random Forest Classifier<br/>n_estimators=100<br/>class_weight='balanced'"]
        C3[flood_risk_model.joblib<br/>feature_names.joblib]
    end

    A1 --> B1 & B2
    A2 --> B2
    B1a & B1b & B1c & B1d & B2a & B2b --> C1
    C1 --> C2 --> C3

    style A1 fill:#f8d856,color:#1a240f
    style C3 fill:#c0392b,color:#fff
```

### 1. Data Retrieval

| Step | Source | Module | Description |
|---|---|---|---|
| Base events | Local CSV | `data/raw/evenimente_baza.csv` | Station ID, coordinates, date, and flood occurrence label |
| Elevation | Copernicus DEM GLO-30 | `notebooks/retrieve_elevation.py` | Fetches elevation via Sentinel Hub evalscript (1×1px TIFF) |
| Precipitation | ERA5 Single Levels | `notebooks/precipitations.py` | Downloads hourly precipitation GRIB, computes daily mean (mm) |
| Soil moisture | Sentinel-1 GRD (VV) | `notebooks/soil.py` | Fetches VV backscatter via Sentinel Hub, converts to dB, normalizes to 0–100% using change detection: `SM = ((σ₀_now − σ₀_dry) / (σ₀_wet − σ₀_dry)) × 100` |
| Clay content | ISRIC SoilGrids | `etl/static_features.py` | REST API query → clay g/kg at 0-5cm → converted to % |
| Slope & altitude | Local rasters | `etl/static_features.py` | Sampled from GeoTIFF via `rasterio` with CRS reprojection |
| Hydraulic cond. | GLHYMPS | `etl/static_features.py` | Point-in-polygon lookup using `geopandas` spatial index |

### 2. Model Training

```python
# train_model.py — Summary
Features:  ['elevation', 'mean_precipitation_mm', 'soil_moisture']
Target:    'Inundatie_Target' (binary: 0 = no flood, 1 = flood)
Algorithm: RandomForestClassifier(n_estimators=100, class_weight='balanced')
Split:     80/20 stratified train/validation
Output:    models/flood_risk_model.joblib + models/feature_names.joblib
```

Run training:
```bash
cd backend
python train_model.py
```

---

## Prediction Workflow

Once the model is trained, FloodWise offers three prediction modes:

### Single-Date Prediction

Predict flood risk for a specific location and date by fetching **live satellite data**:

```mermaid
sequenceDiagram
    participant User
    participant API as FastAPI
    participant DEM as Copernicus DEM
    participant ERA5 as CDS ERA5
    participant S1 as Sentinel Hub (S1)
    participant ML as RF Model

    User->>API: POST /predict-location<br/>{lat, lon, date}
    API->>DEM: get_elevation_data(lat, lon)
    DEM-->>API: elevation (m)
    API->>ERA5: download GRIB for date<br/>compute mean precipitation
    ERA5-->>API: mean_precipitation_mm
    API->>S1: fetch VV backscatter<br/>dB → moisture %
    S1-->>API: soil_moisture (0-100%)
    API->>ML: predict([elevation,<br/>precipitation, moisture])
    ML-->>API: flood_risk (0/1) + probabilities
    API-->>User: {flood_risk, confidence,<br/>probabilities, features}
```

### Future Forecast Prediction

Predict flood risk for **multiple days ahead** using weather forecast data:

```mermaid
sequenceDiagram
    participant User
    participant API as FastAPI
    participant DEM as Copernicus DEM
    participant OM as Open-Meteo API
    participant ML as RF Model

    User->>API: POST /predict-forecast<br/>{lat, lon, days: 7}
    API->>DEM: get_elevation_data(lat, lon)
    DEM-->>API: elevation (m) [static — fetched once]

    API->>OM: GET /forecast<br/>daily precipitation_sum +<br/>soil_moisture_0_to_7cm_mean
    OM-->>API: 7-day forecast array

    loop For each forecast day
        Note over API,ML: Features: elevation + daily precip + soil moisture
        API->>ML: predict(features_day_N)
        ML-->>API: risk + probabilities
    end

    API-->>User: {predictions: [{date, flood_risk,<br/>confidence, features}, ...]}
```

**Soil moisture mapping** (Open-Meteo → model input):
```
Volumetric water content (m³/m³) → Percentage (0-100%)
Formula: min(100, max(0, volumetric_value × 200))
```

---

## User Usage Workflow

The complete journey from landing page to flood risk analysis:

```mermaid
flowchart TD
    LANDING[🏠 Landing Page] --> REG[📝 Register / Login]
    REG --> AUTH_OK{Authenticated?}
    AUTH_OK -->|No| REG
    AUTH_OK -->|Yes| NAV{Navigate to...}

    NAV --> MAP[🗺️ Risk Map<br/>Interactive Leaflet Map]
    NAV --> DASH_EMPTY[📊 Dashboard<br/>No area selected]
    DASH_EMPTY --> MAP

    MAP --> DRAW["✏️ Draw polygon on map<br/>(Geoman: Rectangle or Polygon)"]
    MAP --> CLICK["📍 Click point on map<br/>(Auto-creates small selection)"]

    DRAW --> PANEL[💰 Economic Impact Panel]
    CLICK --> PANEL

    PANEL --> CROP[Select crop type:<br/>Wheat, Corn, Sunflower,<br/>Rapeseed, Potatoes, Orchard]
    CROP --> AREA[Adjust area in hectares]
    AREA --> DURATION[Set hazard duration: 1-14 days]
    DURATION --> CALC["Calculate estimated loss:<br/>Exposure × Hazard × Vulnerability × Risk"]

    CALC --> ACTION{User action}
    ACTION --> SAVE["💾 Save Zone<br/>POST /api/zones<br/>→ generates NDWI graph<br/>→ stores to PostgreSQL"]
    ACTION --> GOTO_DASH["📊 Go to Dashboard<br/>(with query params)"]

    SAVE --> DASH[📊 Analytical Dashboard]
    GOTO_DASH --> DASH

    DASH --> VIEW_RISK[View Flood Risk %]
    DASH --> VIEW_CROP[View Crop Impact %]
    DASH --> VIEW_GW[View Groundwater Analysis]
    DASH --> VIEW_CHART[View Soil Humidity Evolution]
    DASH --> VIEW_NDWI[View NDWI Time-Series Graph]
    DASH --> VIEW_STATS[View Rainfall + Slope Stats]
    DASH --> SELECT_ZONE[Switch between saved zones]

    style LANDING fill:#f8d856,color:#1a240f
    style MAP fill:#2a3f10,color:#fff
    style DASH fill:#2a3f10,color:#fff
    style SAVE fill:#c0392b,color:#fff
```

### Zone Save Flow (Backend)

When a user saves a zone, the backend:
1. Receives polygon coordinates, crop type, area, risk metrics
2. Runs `ndwi_timeseries.py` via subprocess — generates NDWI chart from Sentinel-2 (GEE)
3. Extracts latest NDWI value from the generated CSV
4. Encodes the chart PNG as Base64
5. Stores everything in the `saved_zones` table (PostgreSQL)
6. Returns the saved zone with the embedded graph

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.11+** | Core language |
| **FastAPI** | REST API framework |
| **PostgreSQL 16** | Relational database |
| **SQLAlchemy 2.0** | ORM & database models |
| **Alembic** | Database migration management |
| **scikit-learn** | Random Forest model training & inference |
| **joblib** | Model serialization |
| **pandas / numpy** | Data manipulation |
| **rasterio** | GeoTIFF raster I/O (DEM, slope) |
| **geopandas / shapely** | Geospatial operations (GLHYMPS lookup) |
| **xarray / cfgrib** | NetCDF & GRIB file parsing (ERA5) |
| **earthengine-api** | Google Earth Engine (NDWI time-series) |
| **cdsapi** | Copernicus Climate Data Store API client |
| **matplotlib** | Chart generation |
| **tenacity** | Retry logic with exponential backoff |
| **passlib / python-jose** | Password hashing & JWT authentication |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **TypeScript** | Type-safe development |
| **Vite 8** | Build tool & dev server |
| **Tailwind CSS 4** | Utility-first styling |
| **Leaflet** | Interactive mapping |
| **Leaflet Geoman** | Polygon/rectangle drawing tools |
| **React Router 7** | Client-side routing |
| **Lucide React** | Icon library |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker Compose** | Multi-service orchestration |
| **PostgreSQL 16 Alpine** | Database container |
| **Uvicorn** | ASGI server |

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Copernicus Data Space account ([register here](https://dataspace.copernicus.eu/))
- *(Optional)* Google Cloud project with Earth Engine API enabled
- *(Optional)* CDS API key for ERA5 data ([register here](https://cds.climate.copernicus.eu/))

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/FloodWise.git
cd FloodWise

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Build and run
docker compose up --build
```

**Services will be available at:**

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| PostgreSQL | localhost:5432 |

### Health Checks

```bash
curl http://localhost:8000/         # → {"message": "FloodWise API is running"}
curl http://localhost:8000/health   # → {"status": "ok"}
```

### Environment Variables

```bash
# Copernicus Data Space (required for satellite data)
COPERNICUS_CLIENT_ID=your_client_id
COPERNICUS_CLIENT_SECRET=your_client_secret

# Google Earth Engine (optional, for NDWI graphs)
EE_PROJECT=your_gcp_project_id

# Database
DATABASE_URL=postgresql+psycopg://floodwise:floodwise@localhost:5432/floodwise

# Security
SECRET_KEY=replace_with_secure_random_string
ALGORITHM=HS256

# Frontend
VITE_API_URL=http://localhost:8000
```

### Train the ML Model

```bash
cd backend

# Option A: Run the full ETL pipeline to generate the enriched dataset
python run_groundwater_etl.py

# Option B: Train from an existing dataset
python train_model.py
```

### Database Migrations

```bash
cd backend
alembic upgrade head           # Apply all migrations
alembic revision -m "change"   # Create a new migration
```

---

## API Reference

### Prediction Endpoints

#### `POST /predict`
Direct prediction from raw feature values.
```json
{
  "elevation": 85.0,
  "mean_precipitation_mm": 42.5,
  "soil_moisture": 65.0
}
```
**Response:**
```json
{
  "flood_risk": 1,
  "confidence": 0.87,
  "probabilities": { "no_flood": 0.13, "flood": 0.87 }
}
```

#### `POST /predict-location`
Fetch live satellite data and predict for a specific date.
```json
{ "lat": 44.4268, "lon": 26.1025, "date": "2026-04-25" }
```

#### `POST /predict-forecast`
Multi-day forecast prediction using Open-Meteo weather data.
```json
{ "lat": 44.4268, "lon": 26.1025, "days": 7 }
```

### Zone Management

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/zones` | Create a zone (generates NDWI graph) |
| `GET` | `/api/zones` | List all zones for the authenticated user |
| `POST` | `/api/ndwi-graph` | Generate NDWI graph for a polygon |

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new account |
| `POST` | `/auth/login` | Login (returns JWT token) |
| `GET` | `/users/me` | Get current user info |

### Monitoring

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/live-flood/assessment` | Live flood assessment for a monitored area |
| `GET` | `/health` | API health check |

---

## License

[MIT](LICENSE) © 2026 FloodWise Contributors

---

<p align="center">
  <sub>Built with 🛰️ Copernicus Data · 🌍 11th CASSINI Hackathon: EU Space for Water · 🇷🇴 Romania</sub>
</p>
