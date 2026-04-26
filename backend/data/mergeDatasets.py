import pandas as pd

floods = pd.read_csv("groundwater_ml_dataset_final_updated.csv")
roData = pd.read_csv("finalRo.csv")



extractedFloodData = floods.drop(columns=["ID_Statie"])

concatenated = pd.concat([roData, extractedFloodData], axis=0)

soil_moist_cols = [
	col for col in concatenated.columns
	if "soil" in col.lower() and "moist" in col.lower()
]

if soil_moist_cols:
	concatenated = concatenated.dropna(subset=soil_moist_cols)



concatenated.to_csv("finalDataset.csv", index=False)