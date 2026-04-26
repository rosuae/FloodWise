"""CLI entrypoint for groundwater flooding ETL pipeline."""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

from etl.config import load_pipeline_config
from etl.pipeline import run_pipeline


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate enriched dataset for groundwater flood ML model.",
    )
    parser.add_argument("--input", type=Path, help="Path to evenimente_baza.csv")
    parser.add_argument("--output", type=Path, help="Path to output CSV")
    parser.add_argument("--dem", type=Path, help="Path to Copernicus DEM raster (.tif)")
    parser.add_argument("--slope", type=Path, help="Path to slope raster (.tif)")
    parser.add_argument("--glhymps", type=Path, help="Path to GLHYMPS file (.shp/.gpkg)")
    return parser


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )

    parser = build_parser()
    args = parser.parse_args()

    cfg = load_pipeline_config()
    if args.input:
        cfg = cfg.__class__(**{**cfg.__dict__, "input_csv": args.input})
    if args.output:
        cfg = cfg.__class__(**{**cfg.__dict__, "output_csv": args.output})
    if args.dem:
        cfg = cfg.__class__(**{**cfg.__dict__, "dem_raster_path": args.dem})
    if args.slope:
        cfg = cfg.__class__(**{**cfg.__dict__, "slope_raster_path": args.slope})
    if args.glhymps:
        cfg = cfg.__class__(**{**cfg.__dict__, "glhymps_path": args.glhymps})

    run_pipeline(cfg)


if __name__ == "__main__":
    main()
