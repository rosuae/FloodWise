from __future__ import annotations

import argparse
import importlib.util
from pathlib import Path
from typing import Any, Callable

import pandas as pd


LAT_CANDIDATES = ["Lat", "lat", "latitude", "LAT", "Latitude"]
LON_CANDIDATES = ["Lon", "lon", "lng", "long", "longitude", "LON", "Longitude"]
SOIL_FN_CANDIDATES = [
	"get_soil_data",
	"calculate_soil_data",
	"calculate_soil_moisture",
	"calculate",
	"run",
	"fetchSoilMoisture",
]


def _find_column(df: pd.DataFrame, candidates: list[str]) -> str:
    for col in candidates:
        if col in df.columns:
            return col
    raise ValueError(f"Nu am gasit coloana. Variante cautate: {candidates}")


def _load_soil_function(soil_path: Path) -> Callable[[float, float], Any]:
    spec = importlib.util.spec_from_file_location("soil", soil_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Nu pot incarca modulul soil.py din {soil_path}")

    soil_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(soil_module)

    for fn_name in SOIL_FN_CANDIDATES:
        fn = getattr(soil_module, fn_name, None)
        if callable(fn):
            return fn

    raise AttributeError(
        "soil.py trebuie sa expuna una dintre functiile: "
        + ", ".join(SOIL_FN_CANDIDATES)
    )


def _normalize_result(result: Any) -> dict[str, Any]:
    if isinstance(result, dict):
        return result
    if isinstance(result, pd.Series):
        return result.to_dict()
    return {"soil_moisture": result}


def update_soil_data(csv_path: Path, soil_path: Path, output_path: Path | None = None) -> Path:
    if not csv_path.exists():
        raise FileNotFoundError(f"Fisierul CSV nu exista: {csv_path}")
    if not soil_path.exists():
        raise FileNotFoundError(f"Fisierul soil.py nu exista: {soil_path}")

    df = pd.read_csv(csv_path)
    lat_col = _find_column(df, LAT_CANDIDATES)
    lon_col = _find_column(df, LON_CANDIDATES)

    soil_fn = _load_soil_function(soil_path)

    computed_rows: list[dict[str, Any]] = []
    for index, row in df.iterrows():
        print(f"$$Procesare rand {index+1}/{len(df)}: lat={row[lat_col]}, lon={row[lon_col]}")
        lat = row[lat_col]
        lon = row[lon_col]
        year, month, day = row['Data'].split("-")

        result = soil_fn(lat, lon, year, month, day)
        computed_rows.append(_normalize_result(result))
    computed_df = pd.DataFrame(computed_rows, index=df.index)

    for col in computed_df.columns:
        df[col] = computed_df[col]

    target = output_path or csv_path
    df.to_csv(target, index=False)
    return target


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description="Actualizeaza datele din groundwater_ml_dataset_final.csv cu valori noi calculate de soil.py"
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=base_dir / "groundwater_ml_dataset_final.csv",
        help="Cale catre groundwater_ml_dataset_final.csv",
    )
    parser.add_argument(
        "--soil",
        type=Path,
        default=base_dir / "soil.py",
        help="Cale catre soil.py",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Cale output (optional). Daca lipseste, suprascrie CSV-ul initial.",
    )

    args = parser.parse_args()
    out_file = update_soil_data(args.csv, args.soil, args.out)
    print(f"Actualizare finalizata: {out_file}")


if __name__ == "__main__":
    main()
