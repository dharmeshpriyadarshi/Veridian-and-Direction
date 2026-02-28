import pandas as pd
import numpy as np
import os
import json
import matplotlib.pyplot as plt
from statsmodels.tsa.stattools import adfuller, acf, pacf
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
from sklearn.preprocessing import StandardScaler
import warnings

warnings.filterwarnings('ignore')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_FILE = os.path.join(BASE_DIR, "data", "processed", "city_day_enriched.csv")
DIAGNOSTICS_DIR = os.path.join(BASE_DIR, "data", "diagnostics")
ASSETS_DIR = os.path.join(BASE_DIR, "assets", "diagnostics")

os.makedirs(DIAGNOSTICS_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)

def perform_diagnostics():
    print("Loading enriched data...")
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found. Please run feature engineering first.")
        return

    df = pd.read_csv(INPUT_FILE)
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values(["City", "Date"])
    
    cities = df["City"].unique()
    stationarity_report = {}
    
    # We will also collect standard data to save for the next module
    processed_dfs = []

    print("Processing cities for SARIMAX Diagnostics...")
    for city in cities:
        city_df = df[df["City"] == city].copy()
        city_df = city_df.set_index("Date")
        
        # 1. Standardize Exogenous Features
        exo_cols = [col for col in ["Wind_Speed", "Temperature", "Humidity"] if col in city_df.columns]
        if exo_cols:
            scaler = StandardScaler()
            city_df[exo_cols] = scaler.fit_transform(city_df[exo_cols])
            
        # 2. First-order differencing (d=1) for AQI
        if "AQI" in city_df.columns:
            city_df["AQI_diff"] = city_df["AQI"].diff(periods=1)
            
            # Drop the NaN created by differencing for the statistical tests
            test_series = city_df["AQI_diff"].dropna()
            
            if len(test_series) > 12: # Need enough data points
                # Task 2a: ADF Test
                adf_result = adfuller(test_series)
                p_value = adf_result[1]
                stationarity_report[city] = {
                    "adf_statistic": round(adf_result[0], 4),
                    "p_value": round(p_value, 4),
                    "is_stationary": bool(p_value < 0.05),
                    "d_order": 1,
                    "target_model_config": "(1, 1, 1) x (1, 1, 1, 12)" # Task 3 baseline info
                }
                
                # Task 2b: ACF/PACF Plots
                fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 4))
                plot_acf(test_series, ax=ax1, lags=40, title=f"ACF of Differenced AQI - {city}")
                plot_pacf(test_series, ax=ax2, lags=40, title=f"PACF of Differenced AQI - {city}")
                plt.tight_layout()
                plot_path = os.path.join(ASSETS_DIR, f"acf_pacf_{city.lower().replace(' ', '_')}.png")
                plt.savefig(plot_path)
                plt.close()
                print(f"  - Saved ACF/PACF plots for {city}")
                
                # Task 2c: Pearson Correlation Table (Differenced AQI vs Standardized Weather)
                if exo_cols:
                    corr_df = city_df[["AQI_diff"] + exo_cols].corr()
                    # Store correlations with AQI_diff specifically
                    stationarity_report[city]["exogenous_correlations_with_aqi_diff"] = {
                        col: round(corr_df.loc["AQI_diff", col], 4) for col in exo_cols
                    }
        
        processed_dfs.append(city_df.reset_index())

    # Save Stationarity Report
    report_path = os.path.join(DIAGNOSTICS_DIR, "stationarity_report.json")
    with open(report_path, "w") as f:
        json.dump(stationarity_report, f, indent=4)
    print(f"\nStationarity report saved to {report_path}")

    # Output processed data for the training module
    output_path = os.path.join(BASE_DIR, "data", "processed", "sarimax_ready.csv")
    final_df = pd.concat(processed_dfs)
    final_df.to_csv(output_path, index=False)
    print(f"Model-ready data saved to {output_path}")
    print("\nBaseline Parameter Initialization Set: target baseline config is (1, 1, 1) x (1, 1, 1, 12)")

if __name__ == "__main__":
    perform_diagnostics()
