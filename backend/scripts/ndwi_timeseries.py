#!/usr/bin/env python3
"""
Generate an NDWI time series for one field polygon using Google Earth Engine.

Usage:
  python backend/scripts/ndwi_timeseries.py \
    --field-geojson /absolute/path/to/field.geojson \
    --start 2023-01-01 \
    --end 2024-12-31 \
    --output-csv /absolute/path/to/ndwi_timeseries.csv \
    --output-plot /absolute/path/to/ndwi_timeseries.png
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

import ee
import matplotlib.pyplot as plt
import pandas as pd
from ee.ee_exception import EEException


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compute NDWI time series over one field polygon."
    )
    parser.add_argument(
        "--field-geojson",
        required=True,
        help="Path to GeoJSON file containing one Polygon/MultiPolygon feature.",
    )
    parser.add_argument("--start", required=True, help="Start date (YYYY-MM-DD).")
    parser.add_argument("--end", required=True, help="End date (YYYY-MM-DD).")
    parser.add_argument(
        "--cloud",
        type=float,
        default=20.0,
        help="Maximum CLOUDY_PIXEL_PERCENTAGE for Sentinel-2 image filter (default: 20).",
    )
    parser.add_argument(
        "--scale",
        type=int,
        default=10,
        help="Reduction scale in meters (default: 10).",
    )
    parser.add_argument(
        "--output-csv",
        default="ndwi_timeseries.csv",
        help="Output CSV file path (default: ndwi_timeseries.csv).",
    )
    parser.add_argument(
        "--output-plot",
        default="ndwi_timeseries.png",
        help="Output PNG plot path (default: ndwi_timeseries.png).",
    )
    parser.add_argument(
        "--ee-project",
        default=os.getenv("EE_PROJECT"),
        help="Google Cloud project for Earth Engine (or set EE_PROJECT env var).",
    )
    return parser.parse_args()


def load_geometry(field_geojson_path: str) -> ee.Geometry:
    path = Path(field_geojson_path)
    if not path.exists():
        raise FileNotFoundError(f"Field GeoJSON not found: {path}")

    with path.open("r", encoding="utf-8") as fp:
        data: dict[str, Any] = json.load(fp)

    if data.get("type") == "FeatureCollection":
        features = data.get("features", [])
        if not features:
            raise ValueError("FeatureCollection is empty.")
        geometry = features[0].get("geometry")
    elif data.get("type") == "Feature":
        geometry = data.get("geometry")
    else:
        geometry = data

    if not geometry:
        raise ValueError("Could not extract geometry from GeoJSON.")

    return ee.Geometry(geometry)


def mask_s2_clouds(image: ee.Image) -> ee.Image:
    qa = image.select("QA60")
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    mask = qa.bitwiseAnd(cloud_bit_mask).eq(0).And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
    return image.updateMask(mask)


def add_ndwi_band(image: ee.Image) -> ee.Image:
    # NDWI (McFeeters): (Green - NIR) / (Green + NIR)
    ndwi = image.normalizedDifference(["B3", "B8"]).rename("NDWI")
    return image.addBands(ndwi)


def extract_timeseries(
    geometry: ee.Geometry,
    start: str,
    end: str,
    cloud_pct: float,
    scale: int,
) -> pd.DataFrame:
    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterDate(start, end)
        .filterBounds(geometry)
        .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", cloud_pct))
        .map(mask_s2_clouds)
        .map(add_ndwi_band)
    )

    def feature_from_image(image: ee.Image) -> ee.Feature:
        mean_dict = image.select("NDWI").reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=scale,
            maxPixels=1_000_000_000,
        )
        return ee.Feature(
            None,
            {
                "date": image.date().format("YYYY-MM-dd"),
                "ndwi_mean": mean_dict.get("NDWI"),
                "image_id": image.get("PRODUCT_ID"),
            },
        )

    features = collection.map(feature_from_image).filter(
        ee.Filter.notNull(["ndwi_mean"])
    )

    fc_info = ee.FeatureCollection(features).getInfo()
    rows = []
    for feature in fc_info["features"]:
        props = feature["properties"]
        rows.append(
            {
                "date": props["date"],
                "ndwi_mean": float(props["ndwi_mean"]),
                "image_id": props.get("image_id"),
            }
        )

    if not rows:
        raise ValueError(
            "No valid images found. Try expanding the date range or increasing --cloud threshold."
        )

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    return df


def main() -> None:
    args = parse_args()
    project = args.ee_project.strip() if args.ee_project else ""

    if not project:
        raise ValueError(
            "Missing Earth Engine project. Pass --ee-project <gcp-project-id> "
            "or set EE_PROJECT in your environment."
        )
    if project == "your-gcp-project-id":
        raise ValueError(
            "EE project is still a placeholder. Replace 'your-gcp-project-id' "
            "with your real Google Cloud project ID."
        )

    # Initialize with explicit project. If credentials are missing, authenticate once.
    try:
        ee.Initialize(project=project)
    except EEException as exc:
        msg = str(exc)
        lower_msg = msg.lower()
        if "Project 'projects/" in msg and "not found or deleted" in msg:
            raise ValueError(
                f"Earth Engine project '{project}' is invalid or not accessible. "
                "Use an existing Google Cloud project ID with Earth Engine enabled."
            ) from exc
        if "not registered to use earth engine" in lower_msg:
            raise ValueError(
                f"Project '{project}' is not registered for Earth Engine yet. "
                f"Open https://console.cloud.google.com/earth-engine/configuration?project={project} "
                "and complete registration, then run again."
            ) from exc
        ee.Authenticate()
        try:
            ee.Initialize(project=project)
        except EEException as exc2:
            msg2 = str(exc2)
            lower_msg2 = msg2.lower()
            if "not registered to use earth engine" in lower_msg2:
                raise ValueError(
                    f"Project '{project}' is not registered for Earth Engine yet. "
                    f"Open https://console.cloud.google.com/earth-engine/configuration?project={project} "
                    "and complete registration, then run again."
                ) from exc2
            raise

    geometry = load_geometry(args.field_geojson)
    df = extract_timeseries(
        geometry=geometry,
        start=args.start,
        end=args.end,
        cloud_pct=args.cloud,
        scale=args.scale,
    )

    csv_path = Path(args.output_csv)
    plot_path = Path(args.output_plot)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    plot_path.parent.mkdir(parents=True, exist_ok=True)

    df.to_csv(csv_path, index=False)

    plt.figure(figsize=(10, 5))
    plt.plot(df["date"], df["ndwi_mean"], marker="o", linewidth=1.5)
    plt.title("Field NDWI Time Series")
    plt.xlabel("Date")
    plt.ylabel("Mean NDWI")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(plot_path, dpi=150)

    print(f"Saved CSV: {csv_path}")
    print(f"Saved plot: {plot_path}")
    print(df.head(10).to_string(index=False))


if __name__ == "__main__":
    main()
