from __future__ import annotations

from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db


from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="FloodWise API", version="0.1.0")

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
