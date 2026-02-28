import pandas as pd
import numpy as np
import os
import pickle
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HISTORICAL_DATA_PATH = os.path.join(BASE_DIR, "data", "processed", "city_day_features.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models", "sarimax")

def generate_proxy(city, target_date_str):
    """
    Generates a daily continuous sequence of scaled exogenous variables
    from 2025-01-01 to target_date_str inclusive.
    """
    # Load historical data
    df = pd.read_csv(HISTORICAL_DATA_PATH)
    df["Date"] = pd.to_datetime(df["Date"])
    city_df = df[df["City"] == city].copy()
    
    target_date = pd.to_datetime(target_date_str)
    start_date = pd.to_datetime("2025-01-01")
    
    if target_date < start_date:
        raise ValueError(f"Target date {target_date_str} must be >= 2025-01-01 for SARIMAX out-of-sample.")

    # Generate daily sequence
    date_range = pd.date_range(start=start_date, end=target_date, freq='D')
    
    exo_cols = ["Wind_Speed", "Temperature", "Humidity"]
    city_df["DOY"] = city_df["Date"].dt.dayofyear
    
    # Calculate Trimmed 10-year mean (10% outliers removed)
    trimmed_means = {}
    for doy in range(1, 367): # 1 to 366
        doy_data = city_df[city_df["DOY"] == doy]
        means_for_doy = {}
        for col in exo_cols:
            if col in doy_data.columns and len(doy_data) > 0:
                values = doy_data[col].dropna().values
                if len(values) >= 5: # Need enough data to trim
                    lower_bound = np.percentile(values, 10)
                    upper_bound = np.percentile(values, 90)
                    # Filter and average
                    filtered = values[(values >= lower_bound) & (values <= upper_bound)]
                    means_for_doy[col] = np.mean(filtered) if len(filtered) > 0 else np.mean(values)
                else:
                    means_for_doy[col] = np.mean(values) if len(values) > 0 else 0
            else:
                means_for_doy[col] = 0
        trimmed_means[doy] = means_for_doy
        
    # Build Proxy DataFrame
    proxy_records = []
    for d in date_range:
        doy = d.dayofyear
        # Handle leap year edge cases
        if doy not in trimmed_means or np.isnan(trimmed_means[doy]["Wind_Speed"]):
            doy = doy - 1 if doy > 1 else 1 # fallback to previous day
            
        proxy_records.append({
            "Date": d,
            "Wind_Speed": trimmed_means[doy]["Wind_Speed"],
            "Temperature": trimmed_means[doy]["Temperature"],
            "Humidity": trimmed_means[doy]["Humidity"],
        })
        
    proxy_df = pd.DataFrame(proxy_records)
    
    # Load scaler and transform
    scaler_path = os.path.join(MODELS_DIR, f"{city.lower().replace(' ', '_')}_scaler.pkl")
    with open(scaler_path, 'rb') as f:
        scaler = pickle.load(f)
        
    proxy_df[exo_cols] = scaler.transform(proxy_df[exo_cols])
    return proxy_df.set_index("Date")

if __name__ == "__main__":
    # Test generation
    test_proxy = generate_proxy("Delhi", "2026-03-01")
    print(test_proxy.head())
    print("\nProxy sequence generated successfully. Shape:", test_proxy.shape)
