"""
=============================================================================
 MODEL 4 — MODULE 3: RECURSIVE 2026 FORECAST ENGINE
 XGBoost Paradigm | Veridian & Direction
=============================================================================
 Generates a self-sustaining 365-day AQI forecast for 2026 by recursively
 feeding XGBoost predictions back as lag features.

 Strategy:
   - AQI-derived features: recursive feedback from prediction buffer
   - Raw pollutants + meteorological: historical day-of-year proxy (trimmed mean)
   - Cyclical time + interactions: deterministic from date/proxy values
=============================================================================
"""

import pandas as pd
import numpy as np
import os
import json
from collections import deque
from xgboost import XGBRegressor

# ─── PATHS ──────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENRICHED_PATH = os.path.join(BASE_DIR, "data", "processed", "city_day_enriched.csv")
XGBOOST_READY_PATH = os.path.join(BASE_DIR, "data", "processed", "xgboost_ready.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models", "xgboost")
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "outputs")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Features the model was trained on (exact order matters)
NON_FEATURE_COLS = {"City", "Date", "AQI_Next_Day"}

# Pollutant columns that need historical proxy
POLLUTANT_COLS = ["PM2.5", "PM10", "NO", "NO2", "NOx", "NH3", "CO", "SO2", "O3",
                  "Benzene", "Toluene", "Xylene"]
SUB_INDEX_COLS = ["Sub_PM25", "Sub_PM10", "Sub_NO2", "Sub_O3", "Sub_CO"]
METEO_COLS = ["Temperature", "Wind_Speed", "Humidity"]


def build_doy_proxy(city_df: pd.DataFrame, columns: list) -> dict:
    """
    Build a day-of-year proxy lookup: trimmed mean (10th-90th percentile)
    for each column, for each day of year (1-366).
    """
    city_df = city_df.copy()
    city_df["DOY"] = city_df["Date"].dt.dayofyear
    proxy = {}
    for doy in range(1, 367):
        doy_data = city_df[city_df["DOY"] == doy]
        row = {}
        for col in columns:
            if col in doy_data.columns and len(doy_data) > 0:
                values = doy_data[col].dropna().values
                if len(values) >= 5:
                    lo, hi = np.percentile(values, 10), np.percentile(values, 90)
                    filtered = values[(values >= lo) & (values <= hi)]
                    row[col] = float(np.mean(filtered)) if len(filtered) > 0 else float(np.mean(values))
                elif len(values) > 0:
                    row[col] = float(np.mean(values))
                else:
                    row[col] = 0.0
            else:
                row[col] = 0.0
        proxy[doy] = row
    return proxy


def forecast_city(city: str, enriched_df: pd.DataFrame, xgb_ready_df: pd.DataFrame,
                  feature_cols: list) -> dict:
    """
    Run the recursive 365-day forecast for a single city.
    Returns {"timeseries": [...], "shap_data_by_date": {...}}
    """
    print(f"\n━━━ {city} ━━━")

    # Load model
    model_path = os.path.join(MODELS_DIR, f"{city.lower().replace(' ', '_')}_xgb.json")
    if not os.path.exists(model_path):
        print(f"  ⚠️ Model not found: {model_path}")
        return None
    model = XGBRegressor()
    model.load_model(model_path)

    # Get city data
    city_enriched = enriched_df[enriched_df["City"] == city].copy()
    city_enriched["Date"] = pd.to_datetime(city_enriched["Date"])
    city_enriched = city_enriched.sort_values("Date")

    city_ready = xgb_ready_df[xgb_ready_df["City"] == city].copy()
    city_ready["Date"] = pd.to_datetime(city_ready["Date"])
    city_ready = city_ready.sort_values("Date")

    # ── Build historical proxies ──
    all_proxy_cols = POLLUTANT_COLS + SUB_INDEX_COLS + METEO_COLS
    proxy = build_doy_proxy(city_enriched, all_proxy_cols)

    # ── Bootstrap AQI buffer from last known values ──
    # We need the last 7 actual AQI values for the lag/rolling bootstrap
    last_known_aqi = city_ready["AQI"].values[-7:].tolist()
    aqi_buffer = deque(last_known_aqi, maxlen=30)  # Keep up to 30 for rolling calculations

    # Also need last 3 wind speed values for Wind_Speed_Rolling_3
    last_wind = city_enriched["Wind_Speed"].values[-3:].tolist()
    wind_buffer = deque(last_wind, maxlen=3)

    print(f"  Bootstrap AQI buffer (last 7): {[round(v, 1) for v in last_known_aqi]}")

    # ── Recursive Loop: Jan 1 → Dec 31, 2026 ──
    forecast_dates = pd.date_range("2026-01-01", "2026-12-31", freq="D")
    timeseries = []
    shap_data = {}

    for dt in forecast_dates:
        doy = dt.dayofyear
        proxy_doy = proxy.get(doy, proxy.get(doy - 1, proxy.get(1)))

        # Build feature vector in exact column order
        feature_vector = {}

        # 1. Pollutant proxies
        for col in POLLUTANT_COLS:
            feature_vector[col] = proxy_doy.get(col, 0.0)

        # 2. AQI = last predicted value (or bootstrapped)
        feature_vector["AQI"] = aqi_buffer[-1] if len(aqi_buffer) > 0 else 0.0

        # 3. Sub-index proxies
        for col in SUB_INDEX_COLS:
            feature_vector[col] = proxy_doy.get(col, 0.0)

        # 4. Meteorological proxies
        for col in METEO_COLS:
            feature_vector[col] = proxy_doy.get(col, 0.0)

        # 5. Autoregressive Lags (from AQI buffer)
        buf = list(aqi_buffer)
        feature_vector["AQI_Lag_1"] = buf[-1] if len(buf) >= 1 else 0.0
        feature_vector["AQI_Lag_3"] = buf[-3] if len(buf) >= 3 else buf[0] if len(buf) > 0 else 0.0
        feature_vector["AQI_Lag_7"] = buf[-7] if len(buf) >= 7 else buf[0] if len(buf) > 0 else 0.0

        # 6. Rolling Stats (from AQI buffer)
        recent_7 = list(aqi_buffer)[-7:] if len(aqi_buffer) >= 7 else list(aqi_buffer)
        feature_vector["AQI_Rolling_Mean_7"] = float(np.mean(recent_7))
        feature_vector["AQI_Rolling_Std_7"] = float(np.std(recent_7)) if len(recent_7) > 1 else 0.0

        # 7. Cyclical Time
        month = dt.month
        dow = dt.dayofweek
        feature_vector["Month_sin"] = float(np.sin(2 * np.pi * month / 12))
        feature_vector["Month_cos"] = float(np.cos(2 * np.pi * month / 12))
        feature_vector["DOW_sin"] = float(np.sin(2 * np.pi * dow / 7))
        feature_vector["DOW_cos"] = float(np.cos(2 * np.pi * dow / 7))

        # 8. Interaction features
        feature_vector["Temp_x_Humidity"] = feature_vector["Temperature"] * feature_vector["Humidity"]

        wind_buffer.append(feature_vector["Wind_Speed"])
        feature_vector["Wind_Speed_Rolling_3"] = float(np.mean(list(wind_buffer)))

        # ── Construct ordered array for prediction ──
        X = np.array([[feature_vector[col] for col in feature_cols]])

        # ── Predict ──
        predicted_aqi = max(0.0, float(model.predict(X)[0]))

        # ── Feedback: update AQI buffer ──
        aqi_buffer.append(predicted_aqi)

        timeseries.append({
            "date": dt.strftime("%Y-%m-%d"),
            "predicted_aqi": round(predicted_aqi, 1),
        })

        # Store feature vector for SHAP (we'll compute SHAP values later)
        shap_data[dt.strftime("%Y-%m-%d")] = {col: round(feature_vector[col], 4) for col in feature_cols}

    print(f"  Forecast generated: {len(timeseries)} days")
    peak_aqi = max(t["predicted_aqi"] for t in timeseries)
    min_aqi = min(t["predicted_aqi"] for t in timeseries)
    print(f"  Range: {min_aqi} — {peak_aqi}")

    return {
        "timeseries": timeseries,
        "shap_feature_vectors": shap_data,
    }


def compute_shap_values(city: str, feature_cols: list, feature_vectors: dict) -> dict:
    """
    Compute SHAP values for each forecast day using TreeExplainer.
    Returns a dict of {date: [{feature, value, shap_value}, ...]}
    """
    try:
        import shap
    except ImportError:
        print(f"  ⚠️ shap not installed. Skipping SHAP computation.")
        return {}

    model_path = os.path.join(MODELS_DIR, f"{city.lower().replace(' ', '_')}_xgb.json")
    model = XGBRegressor()
    model.load_model(model_path)

    explainer = shap.TreeExplainer(model)

    # Build matrix of all feature vectors
    dates = sorted(feature_vectors.keys())
    X_matrix = np.array([[feature_vectors[d][col] for col in feature_cols] for d in dates])

    print(f"  Computing SHAP for {len(dates)} days...")
    shap_values = explainer.shap_values(X_matrix)
    base_value = float(explainer.expected_value)

    shap_by_date = {}
    for i, date in enumerate(dates):
        day_shap = []
        for j, col in enumerate(feature_cols):
            day_shap.append({
                "feature": col,
                "value": round(float(X_matrix[i, j]), 4),
                "shap_value": round(float(shap_values[i, j]), 4),
            })
        # Sort by absolute SHAP value descending
        day_shap.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        shap_by_date[date] = {
            "base_value": round(base_value, 2),
            "features": day_shap[:15],  # Top 15 to keep JSON manageable
        }

    return shap_by_date


def main():
    print("[1/4] Loading data...")
    enriched_df = pd.read_csv(ENRICHED_PATH)
    enriched_df["Date"] = pd.to_datetime(enriched_df["Date"])

    xgb_ready_df = pd.read_csv(XGBOOST_READY_PATH)
    xgb_ready_df["Date"] = pd.to_datetime(xgb_ready_df["Date"])

    feature_cols = [c for c in xgb_ready_df.columns if c not in NON_FEATURE_COLS]
    cities = sorted(xgb_ready_df["City"].unique())

    print(f"    Feature columns: {len(feature_cols)}")
    print(f"    Cities: {cities}")

    print("\n[2/4] Running recursive forecast for each city...")
    all_results = {}

    for city in cities:
        result = forecast_city(city, enriched_df, xgb_ready_df, feature_cols)
        if result:
            all_results[city] = {
                "timeseries": result["timeseries"],
            }
            # Compute SHAP
            print(f"\n[3/4] Computing SHAP values for {city}...")
            shap_by_date = compute_shap_values(city, feature_cols, result["shap_feature_vectors"])
            all_results[city]["shap"] = shap_by_date

    # Save
    output_path = os.path.join(OUTPUT_DIR, "xgboost_forecast_2026.json")
    with open(output_path, "w") as f:
        json.dump(all_results, f)

    print(f"\n[4/4] Done!")
    print(f"{'='*60}")
    print(f"  RECURSIVE FORECAST — COMPLETE")
    print(f"{'='*60}")
    print(f"  File: {output_path}")
    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"  Size: {file_size_mb:.1f} MB")
    for city in all_results:
        ts = all_results[city]["timeseries"]
        peak = max(t["predicted_aqi"] for t in ts)
        mean_aqi = np.mean([t["predicted_aqi"] for t in ts])
        shap_count = len(all_results[city].get("shap", {}))
        print(f"  {city}: {len(ts)} days | Mean AQI: {mean_aqi:.1f} | Peak: {peak:.1f} | SHAP days: {shap_count}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
