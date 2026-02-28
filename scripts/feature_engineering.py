import pandas as pd
import numpy as np
import os

print("Starting feature engineering...")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

input_path = os.path.join(BASE_DIR, "data", "processed", "city_day_enriched.csv")
output_path = os.path.join(BASE_DIR, "data", "processed", "city_day_features.csv")

df = pd.read_csv(input_path)
df["Date"] = pd.to_datetime(df["Date"])

# Sort properly
df = df.sort_values(["City", "Date"])

# Create lag and rolling features per city
df_list = []

for city in df["City"].unique():
    city_df = df[df["City"] == city].copy()
    
    city_df["AQI_Lag_1"] = city_df["AQI"].shift(1)
    city_df["AQI_Lag_7"] = city_df["AQI"].shift(7)
    city_df["AQI_Lag_30"] = city_df["AQI"].shift(30)
    
    city_df["Wind_Lag_1"] = city_df["Wind_Speed"].shift(1)
    
    city_df["AQI_Rolling_Mean_7"] = city_df["AQI"].rolling(window=7).mean()
    city_df["AQI_Rolling_Std_7"] = city_df["AQI"].rolling(window=7).std()
    
    df_list.append(city_df)

df = pd.concat(df_list)

# Temporal features
df["Month"] = df["Date"].dt.month
df["Day_of_Year"] = df["Date"].dt.dayofyear

# Cyclical encoding
df["DOY_sin"] = np.sin(2 * np.pi * df["Day_of_Year"] / 365)
df["DOY_cos"] = np.cos(2 * np.pi * df["Day_of_Year"] / 365)

# Drop initial NaNs caused by lags
df = df.dropna()

df.to_csv(output_path, index=False)

print("Feature engineering completed.")
print(f"File saved at: {output_path}")