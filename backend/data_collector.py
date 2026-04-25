import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# ==============================================================================
# REAL COPERNICUS DATA FUNCTIONS (Require API Keys in .env)
# ==============================================================================
def fetch_real_era5_precipitation(lat, lon, start_date, end_date):
    """
    Fetches ERA5-Land precipitation data via CDS API.
    Requires: pip install cdsapi
    """
    # import cdsapi
    # c = cdsapi.Client()
    # c.retrieve('reanalysis-era5-land', { ... })
    pass

def fetch_real_copernicus_dem(lat, lon):
    """
    Fetches GLO-30 DEM from Copernicus Data Space to calculate slope.
    """
    # Requires CDSE OData API authentication
    pass

def fetch_real_soilgrids_data(lat, lon):
    """
    Fetches Soil Texture (Clay/Sand) and calculates Hydraulic Conductivity.
    """
    # Uses REST API from ISRIC SoilGrids
    pass

# ==============================================================================
# SYNTHETIC DATASET GENERATOR FOR ML TRAINING (Physical Simulation)
# ==============================================================================
def generate_training_dataset(num_samples=1000):
    """
    Generates a realistic tabular dataset for training an ML model (e.g., XGBoost).
    It respects physical laws: Waterlogging happens when precipitation is high, 
    slope is low, and soil is clay-heavy (low conductivity).
    """
    print(f"Generating {num_samples} samples of synthetic agricultural data...")
    
    data = []
    start_date = datetime(2020, 1, 1)
    
    for _ in range(num_samples):
        # 1. Randomize location (e.g., somewhere in Romania plains vs hills)
        lat = round(random.uniform(43.5, 48.0), 4)
        lon = round(random.uniform(20.0, 29.0), 4)
        date = start_date + timedelta(days=random.randint(0, 1500))
        
        # 2. Static Parameters
        # Slope: 0% (flat plain) to 25% (steep hill)
        slope_pct = round(random.uniform(0.0, 25.0), 2)
        
        # Soil Texture: Clay retains water (bad for drainage), Sand drains fast
        clay_pct = round(random.uniform(10.0, 60.0), 1)
        sand_pct = round(random.uniform(10.0, 90.0 - clay_pct), 1)
        
        # Hydraulic Conductivity (Ksat) - approximated based on texture
        # High clay = low conductivity (e.g., 5 mm/hr)
        # High sand = high conductivity (e.g., 50 mm/hr)
        ksat_mm_hr = round(50.0 - (clay_pct * 0.7), 2)
        if ksat_mm_hr < 1.0: ksat_mm_hr = 1.0
        
        # 3. Dynamic Parameters (Weather)
        # Precipitation today and cumulative over last 7 days
        is_storm = random.random() < 0.15 # 15% chance of heavy storm
        precip_daily_mm = round(random.uniform(20.0, 80.0) if is_storm else random.uniform(0.0, 10.0), 1)
        precip_7day_mm = round(precip_daily_mm + random.uniform(0.0, 100.0), 1)
        
        # 4. Target Variable (Waterlogging / Flooding)
        # Physical model logic: If rain exceeds drainage capacity and slope is too flat to runoff
        drainage_capacity = ksat_mm_hr * 24 # Daily drainage capacity
        runoff_factor = 1.0 + (slope_pct * 0.1) # Higher slope = more water runs off
        
        effective_water = precip_7day_mm / runoff_factor
        
        # If the effective water sitting on the land is much higher than what the soil can drain
        is_flooded = 1 if effective_water > (drainage_capacity * 0.5) else 0
        
        # Add some noise (real world isn't perfect)
        if random.random() < 0.05: # 5% noise
            is_flooded = 1 if is_flooded == 0 else 0

        data.append([
            date.strftime('%Y-%m-%d'), lat, lon, 
            slope_pct, clay_pct, ksat_mm_hr, 
            precip_daily_mm, precip_7day_mm, 
            is_flooded
        ])
        
    df = pd.DataFrame(data, columns=[
        'date', 'lat', 'lon', 
        'slope_pct', 'clay_pct', 'hydraulic_conductivity_mm_hr', 
        'precip_daily_mm', 'precip_7day_mm', 
        'target_is_waterlogged'
    ])
    
    # Save to CSV
    os.makedirs('data', exist_ok=True)
    output_path = 'data/ml_training_dataset.csv'
    df.to_csv(output_path, index=False)
    
    flooded_count = df['target_is_waterlogged'].sum()
    print(f"Dataset generated successfully at {output_path}")
    print(f"Total samples: {len(df)}")
    print(f"Flooded samples (Class 1): {flooded_count} ({round(flooded_count/len(df)*100, 1)}%)")
    print(f"Normal samples (Class 0): {len(df) - flooded_count}")

if __name__ == "__main__":
    generate_training_dataset(2000)
