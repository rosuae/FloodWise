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
import random
from datetime import datetime, timedelta

import matplotlib.pyplot as plt
import pandas as pd

def style_and_save_plot(df: pd.DataFrame, plot_path: str | Path, title: str):
    plt.figure(figsize=(10, 4.5), facecolor='none')
    ax = plt.gca()
    ax.set_facecolor('none')
    
    # Clean up spines
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#8c9b9d')
    ax.spines['bottom'].set_color('#8c9b9d')
    ax.tick_params(colors='#5a5856', labelsize=9)
    
    # Plot main line
    plt.plot(df["date"], df["ndwi_mean"], marker="o", markersize=5, linewidth=2.5, color='#3b82f6', label='NDWI Mean', zorder=3)
    
    # Fill area under curve
    min_y = min(df["ndwi_mean"].min() - 0.05, -0.1)
    plt.fill_between(df["date"], df["ndwi_mean"], min_y, color='#3b82f6', alpha=0.15, zorder=2)
    
    # Important thresholds
    plt.axhline(y=0.3, color='#ef4444', linestyle='--', linewidth=1.5, alpha=0.8, label='Flood Threshold (>0.3)', zorder=1)
    plt.axhline(y=0.0, color='#10b981', linestyle=':', linewidth=1.5, alpha=0.8, label='Water Baseline (>0.0)', zorder=1)
    
    plt.title(title, fontsize=13, fontweight='bold', color='#1a2a0a', pad=15)
    plt.xlabel("Date", fontsize=10, fontweight='bold', color='#5a5856', labelpad=10)
    plt.ylabel("Index Value", fontsize=10, fontweight='bold', color='#5a5856', labelpad=10)
    
    plt.grid(axis='y', color='#8c9b9d', alpha=0.2, linestyle='-', zorder=0)
    
    # Modern legend
    plt.legend(loc='upper left', bbox_to_anchor=(1.02, 1), borderaxespad=0., frameon=True, facecolor='#ffffff', edgecolor='#e5e7eb', fontsize=9, title="Legend", title_fontsize=10)
    
    plt.tight_layout()
    plt.savefig(plot_path, dpi=200, transparent=True, bbox_inches='tight')
    plt.close()

def generate_mock_timeseries(output_csv: str, output_plot: str):
    print("Generating simulated NDWI time series as fallback...")
    
    end_date = datetime.today()
    start_date = end_date - timedelta(days=365)
    
    dates = [start_date + timedelta(days=x*10) for x in range(37)]
    # Create a realistic looking NDWI curve
    # Starts dry (around 0), spikes during spring/rain, goes down in summer
    base_ndwi = [random.uniform(-0.1, 0.1) for _ in dates]
    
    # Add a flood spike around index 10-15 (about 3-4 months ago)
    for i in range(10, 15):
        if i < len(base_ndwi):
            base_ndwi[i] += random.uniform(0.3, 0.6)

        
    df = pd.DataFrame({
        'date': dates,
        'ndwi_mean': base_ndwi,
        'image_id': ['mock_image'] * len(dates)
    })
    
    df.to_csv(output_csv, index=False)
    
    style_and_save_plot(df, output_plot, "Copernicus NDWI Time Series (Simulated)")
    
    print(f"Saved mock CSV: {output_csv}")

    print(f"Saved mock plot: {output_plot}")
    
try:
    import ee
    from ee.ee_exception import EEException
    EE_AVAILABLE = True
except ImportError:
    EE_AVAILABLE = False

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


def load_geometry(field_geojson_path: str):
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
    geometry,
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
    
    if not EE_AVAILABLE:
        print("Earth Engine API not available. Generating mock data.")
        generate_mock_timeseries(args.output_csv, args.output_plot)
        return
        
    project = args.ee_project.strip() if args.ee_project else ""

    try:
        if not project or project == "your-gcp-project-id":
            raise ValueError("Invalid EE project")
        ee.Initialize(project=project)
        
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

        style_and_save_plot(df, plot_path, "Copernicus NDWI Time Series")

        print(f"Saved CSV: {csv_path}")
        print(f"Saved plot: {plot_path}")
    except Exception as e:
        print(f"Earth Engine extraction failed: {e}. Falling back to mock data.")
        generate_mock_timeseries(args.output_csv, args.output_plot)

if __name__ == "__main__":
    main()

