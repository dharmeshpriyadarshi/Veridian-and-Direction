import pandas as pd
import numpy as np
import os

print("Starting AQI recalculation...")

# Get project root dynamically
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Construct absolute paths safely
raw_path = os.path.join(BASE_DIR, "data", "raw", "city_day.csv")
processed_path = os.path.join(BASE_DIR, "data", "processed", "city_day_cleaned.csv")

# Load dataset
df = pd.read_csv(raw_path)
df["Datetime"] = pd.to_datetime(df["Datetime"])



# -------------------------
# CPCB Sub-index Function
# -------------------------
def calculate_subindex(concentration, breakpoints):
    if pd.isna(concentration):
        return np.nan
    
    for bp_lo, bp_hi, i_lo, i_hi in breakpoints:
        if bp_lo <= concentration <= bp_hi:
            return ((i_hi - i_lo) / (bp_hi - bp_lo)) * (concentration - bp_lo) + i_lo
    return np.nan


# -------------------------
# Breakpoint Tables
# -------------------------

pm25_bp = [
    (0, 30, 0, 50),
    (31, 60, 51, 100),
    (61, 90, 101, 200),
    (91, 120, 201, 300),
    (121, 250, 301, 400),
    (251, 500, 401, 500)
]

pm10_bp = [
    (0, 50, 0, 50),
    (51, 100, 51, 100),
    (101, 250, 101, 200),
    (251, 350, 201, 300),
    (351, 430, 301, 400),
    (431, 600, 401, 500)
]

no2_bp = [
    (0, 40, 0, 50),
    (41, 80, 51, 100),
    (81, 180, 101, 200),
    (181, 280, 201, 300),
    (281, 400, 301, 400),
    (401, 600, 401, 500)
]

o3_bp = [
    (0, 50, 0, 50),
    (51, 100, 51, 100),
    (101, 168, 101, 200),
    (169, 208, 201, 300),
    (209, 748, 301, 400),
    (749, 1000, 401, 500)
]

co_bp = [
    (0, 1, 0, 50),
    (1.1, 2, 51, 100),
    (2.1, 10, 101, 200),
    (10.1, 17, 201, 300),
    (17.1, 34, 301, 400),
    (34.1, 50, 401, 500)
]


# -------------------------
# Apply Sub-indices
# -------------------------

df["Sub_PM25"] = df["PM2.5"].apply(lambda x: calculate_subindex(x, pm25_bp))
df["Sub_PM10"] = df["PM10"].apply(lambda x: calculate_subindex(x, pm10_bp))
df["Sub_NO2"] = df["NO2"].apply(lambda x: calculate_subindex(x, no2_bp))
df["Sub_O3"] = df["O3"].apply(lambda x: calculate_subindex(x, o3_bp))
df["Sub_CO"] = df["CO"].apply(lambda x: calculate_subindex(x, co_bp))


# -------------------------
# Final AQI Calculation
# -------------------------

df["AQI"] = df[
    ["Sub_PM25", "Sub_PM10", "Sub_NO2", "Sub_O3", "Sub_CO"]
].max(axis=1)

df["AQI"] = df["AQI"].round(0)


# -------------------------
# AQI Bucket
# -------------------------

def get_bucket(aqi):
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Satisfactory"
    elif aqi <= 200:
        return "Moderate"
    elif aqi <= 300:
        return "Poor"
    elif aqi <= 400:
        return "Very Poor"
    else:
        return "Severe"

df["AQI_Bucket"] = df["AQI"].apply(get_bucket)


# -------------------------
# Save Cleaned File
# -------------------------

df.to_csv(processed_path, index=False)

print("AQI recalculated successfully.")
print(f"File saved as: {processed_path}")