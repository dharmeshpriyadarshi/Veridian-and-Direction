"""
Inference Builder: Constructs a city+date-aware (1, 7, 21) input tensor
for the neural models (Bi-LSTM, Bi-GRU, TCN) at prediction time.

Strategy:
  - Historical data runs from 2015-2024.
  - For a 2026 target date, we use the same month/day from the most recent
    historical year available, then grab the 7-day lookback window ending on
    that anchor date.
  - The window is scaled using the same MinMaxScaler from training.
"""

import os
import numpy as np
import pandas as pd
import joblib

_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_CSV_PATH = os.path.join(_CURRENT_DIR, "..", "data", "processed", "city_day_enriched.csv")
_SCALER_PATH = os.path.join(_CURRENT_DIR, "processed_data", "minmax_scaler.pkl")

# Cache the dataframe and scaler to avoid re-reading on every request
_df_cache = None
_scaler_cache = None


def _load_resources():
    """Lazy-load and cache the enriched CSV and fitted MinMaxScaler."""
    global _df_cache, _scaler_cache

    if _df_cache is None:
        df = pd.read_csv(_CSV_PATH)
        df["Date"] = pd.to_datetime(df["Date"])
        df = df.sort_values(["City", "Date"]).reset_index(drop=True)
        _df_cache = df

    if _scaler_cache is None and os.path.exists(_SCALER_PATH):
        _scaler_cache = joblib.load(_SCALER_PATH)

    return _df_cache, _scaler_cache


def build_input_tensor(city: str, target_date_str: str, lookback: int = 7) -> np.ndarray:
    """
    Build a (1, 7, 21) scaled input tensor for a given city and target date.

    For 2026 dates (out-of-sample), we map to the equivalent month/day from
    the most recent year that has enough data (walking backwards from 2024).
    For historical dates, we use the data directly.

    Returns:
        np.ndarray of shape (1, lookback, n_features) or None on failure.
    """
    df, scaler = _load_resources()
    if df is None or scaler is None:
        return None

    target_date = pd.to_datetime(target_date_str)
    city_df = df[df["City"] == city].copy()

    if city_df.empty:
        return None

    # Identify the feature columns (same order used during training)
    numeric_cols = city_df.select_dtypes(include=[np.number]).columns.tolist()
    if "AQI" in numeric_cols:
        numeric_cols.remove("AQI")
    features = ["AQI"] + numeric_cols

    # Determine anchor date: for future dates, mirror to the closest historical year
    max_hist_date = city_df["Date"].max()

    if target_date > max_hist_date:
        # Walk backwards from the latest year to find a match
        for year_offset in range(1, 15):
            candidate_year = target_date.year - year_offset
            try:
                anchor = target_date.replace(year=candidate_year)
            except ValueError:
                # Handle Feb 29 in non-leap years
                anchor = target_date.replace(year=candidate_year, day=28)

            # We need 'lookback' days ending on anchor
            window_start = anchor - pd.Timedelta(days=lookback - 1)
            window = city_df[
                (city_df["Date"] >= window_start) & (city_df["Date"] <= anchor)
            ]
            if len(window) >= lookback:
                break
        else:
            return None
    else:
        anchor = target_date
        window_start = anchor - pd.Timedelta(days=lookback - 1)
        window = city_df[
            (city_df["Date"] >= window_start) & (city_df["Date"] <= anchor)
        ]

    if len(window) < lookback:
        # If still short, take the last 'lookback' rows before anchor
        window = city_df[city_df["Date"] <= anchor].tail(lookback)

    if len(window) < lookback:
        return None

    # Extract numeric values in feature order and scale
    raw_values = window[features].values[-lookback:]  # shape: (7, 21)
    scaled_values = scaler.transform(raw_values)       # shape: (7, 21)

    # Return as (1, 7, 21) batch
    return scaled_values.reshape(1, lookback, -1)
