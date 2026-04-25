# FloodWise

> **Predict. Warn. Protect.** — AI-powered flood prediction and early warning platform using European space data.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![Data: Copernicus](https://img.shields.io/badge/Data-Copernicus-teal.svg)](https://www.copernicus.eu/)

FloodWise is an open-source platform that monitors soil moisture, groundwater levels, precipitation, and vegetation health from Copernicus and Galileo satellite data to predict flood-prone areas and deliver real-time early warnings to communities, municipalities, and emergency responders.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Data Sources](#data-sources)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Extreme water events — droughts, floods, torrential rains — are becoming more frequent and severe. FloodWise addresses this by combining satellite-derived environmental indicators with machine learning to generate flood risk scores and issue warnings **before** events occur.

Built for the [ESA / EU Space Hackathon Challenge #3 — Disaster Risk Monitoring](https://www.copernicus.eu/).

---

## How to run

### Build
```bash
docker compose build
```

### Run
```bash
docker compose up
```

### Run for dev
```bash
docker compose -f compose.yaml -f compose.dev.yaml up
```

## Features

- **Flood risk mapping** — per-area risk scores updated on ingestion of new satellite data
- **Early warning alerts** — configurable threshold triggers that push notifications to registered endpoints (webhooks, email, SMS)
- **Interactive dashboard** — React-based map UI with risk overlays, time-series charts, and alert history
- **Historical analysis** — compare current readings against historical baselines to identify anomalies
- **REST API** — expose risk scores and alerts to third-party integrations (insurance platforms, government systems)
- **Open data pipeline** — fully reproducible ingestion pipeline using publicly available Copernicus data

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      FloodWise                          │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │  Copernicus │    │   Galileo    │    │  Weather  │  │
│  │  (Sentinel) │    │   GNSS-R     │    │   APIs    │  │
│  └──────┬──────┘    └──────┬───────┘    └─────┬─────┘  │
│         └─────────────────┼──────────────────┘         │
│                           ▼                             │
│              ┌────────────────────────┐                 │
│              │   Ingestion Pipeline   │  (Python)       │
│              │  - Data normalisation  │                 │
│              │  - Feature extraction  │                 │
│              └────────────┬───────────┘                 │
│                           ▼                             │
│              ┌────────────────────────┐                 │
│              │   Prediction Engine    │  (Python/ML)    │
│              │  - Risk score model    │                 │
│              │  - Anomaly detection   │                 │
│              └────────────┬───────────┘                 │
│                           ▼                             │
│         ┌─────────────────────────────────┐             │
│         │          REST API               │  (FastAPI)  │
│         │  /risk  /alerts  /history       │             │
│         └──────────┬──────────────────────┘             │
│                    ▼                                    │
│         ┌──────────────────────┐                        │
│         │   React Dashboard    │                        │
│         │  Map · Charts · Feed │                        │
│         └──────────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

**Required environment variables (`.env`):**

```env
# Copernicus Data Space
COPERNICUS_CLIENT_ID=your_client_id
COPERNICUS_CLIENT_SECRET=your_client_secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/floodwise

# Alert delivery
SMTP_HOST=smtp.example.com
SMTP_USER=alerts@floodwise.io
SMTP_PASSWORD=your_password

# Optional: webhook secret for outbound alert payloads
ALERT_WEBHOOK_SECRET=your_secret
```

---

## Data Sources

| Source | Provider | Variables Used |
|--------|----------|----------------|
| Sentinel-1 SAR | Copernicus / ESA | Soil moisture, surface water extent |
| Sentinel-2 MSI | Copernicus / ESA | Vegetation health (NDVI), land cover |
| ERA5 Reanalysis | Copernicus Climate Change Service | Precipitation, temperature, wind |
| GRACE-FO | NASA / GFZ | Groundwater storage anomalies |
| Galileo GNSS-R | ESA | Surface reflectometry for soil moisture |

All satellite data is accessed via the [Copernicus Data Space Ecosystem API](https://dataspace.copernicus.eu/). No paid data licenses are required.

---

**Example response:**

```json
{
  "timestamp": "2026-04-24T18:00:00Z",
  "areas": [
    {
      "id": "RO-IF-001",
      "name": "Ilfov County",
      "risk_score": 0.82,
      "risk_level": "high",
      "coordinates": { "lat": 44.55, "lon": 26.10 },
      "drivers": ["soil_moisture", "precipitation_anomaly"]
    }
  ]
}
```

### `GET /alerts`

Returns active and recent alerts.

**Query parameters:** `region`, `status` (`active` | `resolved`), `limit`

### `POST /alerts/subscribe`

Register a webhook endpoint to receive alert payloads.

```json
{
  "url": "https://your-system.example.com/webhook",
  "region": "RO-IF",
  "min_risk_level": "medium"
}
```

### `GET /history`

Returns historical risk scores for a given area and date range.

**Query parameters:** `area_id`, `from` (ISO 8601), `to` (ISO 8601)

---

## License

[MIT](LICENSE) © 2026 FloodWise Contributors

---
