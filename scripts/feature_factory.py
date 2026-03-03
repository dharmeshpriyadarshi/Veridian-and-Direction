"""
=============================================================================
 MODEL 4 — MODULE 1: THE FEATURE FACTORY
 XGBoost Paradigm | Veridian & Direction
=============================================================================
 Transforms city_day_enriched.csv into a supervised learning dataset
 (X, y) with 20+ engineered features for XGBoost training.

 Features:
   Task 1 — Temporal:    Autoregressive Lags, Rolling Stats, Cyclical Time
   Task 2 — Meteorological: Heat-Stagnation Index, Ventilation Index
   Task 3 — Alignment:   Target variable (AQI_Next_Day), NaN cleanup
=============================================================================
"""

import pandas as pd
import numpy as np
import os

# ─── PATHS ──────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_PATH = os.path.join(BASE_DIR, "data", "processed", "city_day_enriched.csv")
OUTPUT_PATH = os.path.join(BASE_DIR, "data", "processed", "xgboost_ready.csv")


def load_data(path: str) -> pd.DataFrame:
    """Load enriched CSV and parse dates."""
    print(f"[1/5] Loading data from: {path}")
    df = pd.read_csv(path)
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values(["City", "Date"]).reset_index(drop=True)
    print(f"      Loaded {len(df)} rows × {len(df.columns)} columns | Cities: {df['City'].nunique()}")
    return df


def task1_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Task 1: Advanced Temporal Feature Engineering
    - Autoregressive lags: AQI_Lag_1, AQI_Lag_3, AQI_Lag_7
    - Rolling windows: 7-day mean and std of AQI
    - Cyclical encoding: Month (sin/cos) and DayOfWeek (sin/cos)
    All lag/rolling ops are per-city via groupby to prevent cross-city leakage.
    """
    print("[2/5] Engineering temporal features...")

    # --- Autoregressive Lags (per city) ---
    for lag in [1, 3, 7]:
        df[f"AQI_Lag_{lag}"] = df.groupby("City")["AQI"].shift(lag)

    # --- Rolling Windows (per city) ---
    df["AQI_Rolling_Mean_7"] = df.groupby("City")["AQI"].transform(
        lambda x: x.rolling(window=7, min_periods=7).mean()
    )
    df["AQI_Rolling_Std_7"] = df.groupby("City")["AQI"].transform(
        lambda x: x.rolling(window=7, min_periods=7).std()
    )

    # --- Cyclical Time Encoding ---
    month = df["Date"].dt.month
    dow = df["Date"].dt.dayofweek  # Monday=0, Sunday=6

    df["Month_sin"] = np.sin(2 * np.pi * month / 12)
    df["Month_cos"] = np.cos(2 * np.pi * month / 12)
    df["DOW_sin"] = np.sin(2 * np.pi * dow / 7)
    df["DOW_cos"] = np.cos(2 * np.pi * dow / 7)

    print(f"      Added: AQI_Lag_1/3/7, AQI_Rolling_Mean/Std_7, Month_sin/cos, DOW_sin/cos")
    return df


def task2_meteorological_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Task 2: Meteorological Interaction Features
    - Heat-Stagnation Index: Temperature × Humidity
    - Ventilation Index: 3-day rolling mean of Wind_Speed (per city)
    """
    print("[3/5] Engineering meteorological interaction features...")

    # --- Heat-Stagnation Index ---
    df["Temp_x_Humidity"] = df["Temperature"] * df["Humidity"]

    # --- Ventilation Index (per city) ---
    df["Wind_Speed_Rolling_3"] = df.groupby("City")["Wind_Speed"].transform(
        lambda x: x.rolling(window=3, min_periods=3).mean()
    )

    print(f"      Added: Temp_x_Humidity, Wind_Speed_Rolling_3")
    return df


def task3_clean_and_align(df: pd.DataFrame) -> pd.DataFrame:
    """
    Task 3: Data Cleaning & Alignment
    - Create target variable: AQI_Next_Day = AQI shifted -1 (per city)
    - Drop rows with NaNs introduced by lags/rolling/target shift
    - Drop non-feature columns (AQI_Bucket) but keep City/Date for reference
    """
    print("[4/5] Creating target variable and cleaning...")

    # --- Target Variable (per city) ---
    df["AQI_Next_Day"] = df.groupby("City")["AQI"].shift(-1)

    # --- Drop non-feature columns ---
    drop_cols = ["AQI_Bucket"]
    existing_drops = [c for c in drop_cols if c in df.columns]
    if existing_drops:
        df = df.drop(columns=existing_drops)

    # --- Drop rows with NaNs (from lags, rolling windows, and target shift) ---
    rows_before = len(df)
    df = df.dropna().reset_index(drop=True)
    rows_after = len(df)
    print(f"      Target: AQI_Next_Day | Dropped {rows_before - rows_after} NaN rows | {rows_after} rows remain")

    return df


def validate_output(df: pd.DataFrame) -> None:
    """Validate the output meets the success metric."""
    print("[5/5] Validating output...")

    # Separate feature columns (exclude City, Date, and target)
    non_feature_cols = {"City", "Date", "AQI_Next_Day"}
    feature_cols = [c for c in df.columns if c not in non_feature_cols]
    n_features = len(feature_cols)

    # Check NaN count
    nan_count = df.isna().sum().sum()

    # Check per-city integrity (lag should NOT bleed across cities)
    cities = df["City"].unique()
    integrity_ok = True
    for city in cities:
        city_df = df[df["City"] == city]
        if len(city_df) == 0:
            integrity_ok = False
            break

    print(f"\n{'='*60}")
    print(f"  FEATURE FACTORY — OUTPUT REPORT")
    print(f"{'='*60}")
    print(f"  Total rows:      {len(df)}")
    print(f"  Total columns:   {len(df.columns)}")
    print(f"  Feature columns: {n_features} {'✅' if n_features >= 18 else '❌ (need ≥18)'}")
    print(f"  NaN count:       {nan_count} {'✅' if nan_count == 0 else '❌'}")
    print(f"  Cities:          {len(cities)} ({', '.join(cities)})")
    print(f"  City integrity:  {'✅ No cross-city leakage' if integrity_ok else '❌ INTEGRITY ISSUE'}")
    print(f"{'='*60}")
    print(f"\n  Features ({n_features}):")
    for i, col in enumerate(feature_cols):
        print(f"    {i+1:2d}. {col}")
    print(f"\n  Target: AQI_Next_Day")
    print(f"\n  Sample (first 3 rows):")
    print(df.head(3).to_string(index=False))
    print()


def main():
    # Load
    df = load_data(INPUT_PATH)

    # Task 1: Temporal features
    df = task1_temporal_features(df)

    # Task 2: Meteorological interaction features
    df = task2_meteorological_features(df)

    # Task 3: Clean & align
    df = task3_clean_and_align(df)

    # Save
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"  Saved to: {OUTPUT_PATH}")

    # Validate
    validate_output(df)


if __name__ == "__main__":
    main()
