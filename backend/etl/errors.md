If something fails, run this diagnostic
From backend:
python -m py_compile etl/config.py etl/static_features.py etl/dynamic_features.py etl/pipeline.py run_groundwater_etl.py