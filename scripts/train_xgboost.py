"""
=============================================================================
 MODEL 4 — MODULE 2: THE MULTI-TARGET TRAINER
 XGBoost Paradigm | Veridian & Direction
=============================================================================
 Trains city-specific XGBoost regressors on the Feature Factory output
 and evaluates against the 2023-2024 out-of-sample test period.

 Tasks:
   1 — Training Logic:     Chrono split, hyperparams, early stopping
   2 — Multi-City Loop:    Per-city XGBRegressor saved to models/xgboost/
   3 — Performance Logging: RMSE, MAPE, Top-10 Feature Importance → JSON
=============================================================================
"""

import pandas as pd
import numpy as np
import os
import json
from xgboost import XGBRegressor
from sklearn.metrics import mean_squared_error

# ─── PATHS ──────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_PATH = os.path.join(BASE_DIR, "data", "processed", "xgboost_ready.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models", "xgboost")
DIAGNOSTICS_DIR = os.path.join(BASE_DIR, "data", "diagnostics")
SARIMAX_META_PATH = os.path.join(BASE_DIR, "models", "sarimax", "model_metadata.json")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DIAGNOSTICS_DIR, exist_ok=True)

# ─── FEATURE / TARGET DEFINITIONS ──────────────────────────────────────────
NON_FEATURE_COLS = {"City", "Date", "AQI_Next_Day"}
TARGET_COL = "AQI_Next_Day"

# ─── HYPERPARAMETERS ───────────────────────────────────────────────────────
HYPERPARAMS = {
    "n_estimators": 1000,
    "learning_rate": 0.05,
    "max_depth": 6,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "random_state": 42,
    "verbosity": 0,
}
EARLY_STOPPING_ROUNDS = 50


def calculate_mape(y_true, y_pred):
    """Calculate Mean Absolute Percentage Error, ignoring zero actuals."""
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    non_zero = y_true != 0
    if not np.any(non_zero):
        return 0.0
    return float(np.mean(np.abs((y_true[non_zero] - y_pred[non_zero]) / y_true[non_zero])) * 100)


def load_data(path: str) -> pd.DataFrame:
    """Load xgboost_ready.csv and parse dates."""
    print(f"[1/4] Loading data from: {path}")
    df = pd.read_csv(path)
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values(["City", "Date"]).reset_index(drop=True)
    feature_cols = [c for c in df.columns if c not in NON_FEATURE_COLS]
    print(f"      {len(df)} rows | {len(feature_cols)} features | Cities: {df['City'].nunique()}")
    return df


def train_city_model(city: str, city_df: pd.DataFrame, feature_cols: list) -> dict:
    """
    Train a single XGBRegressor for one city.
    Returns a dict with metrics and feature importances.
    """
    # ── Chronological Split ──
    train_df = city_df[city_df["Date"].dt.year <= 2022].copy()
    test_df = city_df[(city_df["Date"].dt.year >= 2023) & (city_df["Date"].dt.year <= 2024)].copy()

    if len(train_df) < 50 or len(test_df) < 10:
        print(f"  ⚠️ Skipping {city}: insufficient data (Train={len(train_df)}, Test={len(test_df)})")
        return None

    X_train = train_df[feature_cols].values
    y_train = train_df[TARGET_COL].values
    X_test = test_df[feature_cols].values
    y_test = test_df[TARGET_COL].values

    # ── Early-Stopping Validation Set (last 20% of training data) ──
    val_split = int(len(X_train) * 0.8)
    X_tr, X_val = X_train[:val_split], X_train[val_split:]
    y_tr, y_val = y_train[:val_split], y_train[val_split:]

    print(f"  Split → Train: {len(X_tr)} | Val: {len(X_val)} | Test: {len(X_test)}")

    # ── Fit ──
    model = XGBRegressor(**HYPERPARAMS, early_stopping_rounds=EARLY_STOPPING_ROUNDS)
    model.fit(
        X_tr, y_tr,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )
    best_iter = model.best_iteration
    print(f"  Best iteration: {best_iter} / {HYPERPARAMS['n_estimators']}")

    # ── Predict & Evaluate on Test Set ──
    y_pred = model.predict(X_test)
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    mape = calculate_mape(y_test, y_pred)
    print(f"  Test RMSE: {rmse:.2f} | Test MAPE: {mape:.2f}%")

    # ── Feature Importance (top 10) ──
    importances = model.feature_importances_
    imp_pairs = sorted(zip(feature_cols, importances), key=lambda x: x[1], reverse=True)
    top_10 = [{"feature": name, "importance": round(float(val), 4)} for name, val in imp_pairs[:10]]

    # ── Save Model ──
    model_path = os.path.join(MODELS_DIR, f"{city.lower().replace(' ', '_')}_xgb.json")
    model.save_model(model_path)
    print(f"  Model saved → {model_path}")

    return {
        "training_range": "2015-01-01 to 2022-12-31",
        "testing_range": "2023-01-01 to 2024-12-31",
        "best_iteration": best_iter,
        "hyperparameters": HYPERPARAMS,
        "metrics": {
            "rmse": round(rmse, 4),
            "mape": round(mape, 4),
        },
        "top_10_features": top_10,
    }


def load_sarimax_metrics() -> dict:
    """Load SARIMAX model_metadata.json for the comparison matrix."""
    if not os.path.exists(SARIMAX_META_PATH):
        print("  ⚠️ SARIMAX metadata not found — comparison matrix will be partial.")
        return {}
    with open(SARIMAX_META_PATH, "r") as f:
        return json.load(f)


def main():
    # Load
    df = load_data(INPUT_PATH)
    feature_cols = [c for c in df.columns if c not in NON_FEATURE_COLS]
    cities = sorted(df["City"].unique())

    # Train per city
    print(f"\n[2/4] Training XGBoost models for {len(cities)} cities...\n")
    results = {}
    for city in cities:
        print(f"━━━ {city} ━━━")
        city_df = df[df["City"] == city].copy()
        result = train_city_model(city, city_df, feature_cols)
        if result:
            results[city] = result
        print()

    # Load SARIMAX metrics for comparison
    print("[3/4] Building comparison matrix...")
    sarimax_meta = load_sarimax_metrics()

    comparison_matrix = {}
    for city in results:
        xgb_rmse = results[city]["metrics"]["rmse"]
        xgb_mape = results[city]["metrics"]["mape"]
        sar_metrics = sarimax_meta.get(city, {}).get("metrics", {})
        sar_rmse = sar_metrics.get("rmse")
        sar_mape = sar_metrics.get("mape")

        winner_rmse = "XGBoost" if (sar_rmse is not None and xgb_rmse < sar_rmse) else "SARIMAX" if sar_rmse is not None else "N/A"
        winner_mape = "XGBoost" if (sar_mape is not None and xgb_mape < sar_mape) else "SARIMAX" if sar_mape is not None else "N/A"

        comparison_matrix[city] = {
            "sarimax_rmse": sar_rmse,
            "sarimax_mape": sar_mape,
            "xgboost_rmse": xgb_rmse,
            "xgboost_mape": xgb_mape,
            "winner_rmse": winner_rmse,
            "winner_mape": winner_mape,
        }

    # Assemble final output
    output = {
        "model": "XGBoost (Gradient Boosted Trees)",
        "cities": results,
        "comparison_matrix": comparison_matrix,
    }

    # Save
    output_path = os.path.join(DIAGNOSTICS_DIR, "xgboost_performance.json")
    with open(output_path, "w") as f:
        json.dump(output, f, indent=4)

    # Report
    print(f"\n[4/4] Done!")
    print(f"{'='*60}")
    print(f"  XGBOOST TRAINING — FINAL REPORT")
    print(f"{'='*60}")
    print(f"  Models trained: {len(results)}")
    print(f"  Models saved to: {MODELS_DIR}")
    print(f"  Performance saved to: {output_path}")
    print()
    print(f"  {'City':<12} {'XGB RMSE':>10} {'SAR RMSE':>10} {'Winner':>10}")
    print(f"  {'─'*12} {'─'*10} {'─'*10} {'─'*10}")
    for city, comp in comparison_matrix.items():
        sar_str = f"{comp['sarimax_rmse']:.2f}" if comp['sarimax_rmse'] else "N/A"
        print(f"  {city:<12} {comp['xgboost_rmse']:>10.2f} {sar_str:>10} {comp['winner_rmse']:>10}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
