import pandas as pd
import os

print("Starting AQI + NASA merge...")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

aqi_path = os.path.join(BASE_DIR, "data", "processed", "city_day_cleaned.csv")
weather_path = os.path.join(BASE_DIR, "data", "raw", "nasa_weather.csv")
output_path = os.path.join(BASE_DIR, "data", "processed", "city_day_enriched.csv")

# Load datasets
aqi_df = pd.read_csv(aqi_path)
weather_df = pd.read_csv(weather_path)

# Standardize date columns
aqi_df["Datetime"] = pd.to_datetime(aqi_df["Datetime"])
aqi_df.rename(columns={"Datetime": "Date"}, inplace=True)
weather_df["Date"] = pd.to_datetime(weather_df["Date"])

# Merge on City + Date
merged_df = pd.merge(
    aqi_df,
    weather_df,
    on=["City", "Date"],
    how="left"
)

# Basic validation check
missing_weather = merged_df["Wind_Speed"].isna().sum()
print(f"Rows missing weather data: {missing_weather}")

# Save enriched dataset
merged_df.to_csv(output_path, index=False)

print("Merge completed successfully.")
print(f"File saved at: {output_path}")