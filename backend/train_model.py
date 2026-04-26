import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

def train_and_save_model():
    # 1. LOAD DATA 
    data_path = 'data/finalDataset.csv'
    if not os.path.exists(data_path):
        print(f"Error: {data_path} not found.")
        return

    df = pd.read_csv(data_path)

    # 2. DEFINE FEATURES AND TARGET
    features = ['elevation', 'mean_precipitation_mm', 'soil_moisture']
    target = 'Inundatie_Target'

    X = df[features]
    y = df[target]

    # 3. SPLIT DATA
    X_train, X_val, y_train, y_val = train_test_split(
        X, 
        y, 
        test_size=0.20, 
        random_state=42, 
        stratify=y 
    )

    print(f"Training on {len(X_train)} samples...")

    # 4. INITIALIZE AND TRAIN THE MODEL
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    rf_model.fit(X_train, y_train)

    # 5. SAVE THE MODEL
    os.makedirs('models', exist_ok=True)
    model_path = 'models/flood_risk_model.joblib'
    joblib.dump(rf_model, model_path)
    print(f"Model saved to {model_path}")

    # Save feature names for reference in API
    joblib.dump(features, 'models/feature_names.joblib')
    print("Feature names saved to models/feature_names.joblib")

if __name__ == "__main__":
    train_and_save_model()
