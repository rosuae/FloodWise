import pandas as pd


groundwater_ml_dataset_final = pd.read_csv("random_points_in_romania.csv")
groundwater_ml_dataset_final = groundwater_ml_dataset_final.drop(
	columns=["soil_moisture_surface_pct"], errors="ignore"
)

groundwater_ml_dataset_final_updated_precip = pd.read_csv(
	"randomRomaniaPrecip.csv"
)

groundwater_ml_dataset_final_updated_soil = pd.read_csv(
	"randomRomaniaSoil.csv"
)

elevation_data = pd.read_csv("randomRomaniaElevation.csv")
groundwater_ml_dataset_final["mean_precipitation_mm"] = (
	groundwater_ml_dataset_final_updated_precip["mean_precipitation_mm"]
)

groundwater_ml_dataset_final["soil_moisture"] = groundwater_ml_dataset_final_updated_soil["soil_moisture"]
groundwater_ml_dataset_final["elevation"] = elevation_data["elevation"]

print(groundwater_ml_dataset_final.head())

groundwater_ml_dataset_final.to_csv("finalRo.csv", index=False)

