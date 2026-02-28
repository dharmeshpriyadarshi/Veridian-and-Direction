import pandas as pd
import numpy as np
import os
import json
import logging
import pickle
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.preprocessing import StandardScaler
import warnings

# Suppress the warnings from statsmodels output to console
warnings.filterwarnings('ignore')

# Set up paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_FILE = os.path.join(BASE_DIR, "data", "processed", "sarimax_ready.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models", "sarimax")
LOGS_DIR = os.path.join(BASE_DIR, "logs")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

# Set up logging for convergence warnings
log_file = os.path.join(LOGS_DIR, "sarimax_convergence.log")
logging.basicConfig(filename=log_file, level=logging.WARNING, 
                    format='%(asctime)s - %(levelname)s - %(message)s')

def calculate_mape(y_true, y_pred):
    """Calculate Mean Absolute Percentage Error."""
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    # Avoid division by zero
    non_zero_idx = y_true != 0
    if not np.any(non_zero_idx):
        return 0.0
    return np.mean(np.abs((y_true[non_zero_idx] - y_pred[non_zero_idx]) / y_true[non_zero_idx])) * 100

def train_sarimax():
    print("Loading data for SARIMAX Training Engine...")
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found. Please run preprocess_sarimax.py first.")
        return

    df = pd.read_csv(INPUT_FILE)
    df["Date"] = pd.to_datetime(df["Date"])
    
    # Ensure sorted by date
    df = df.sort_values(["City", "Date"])
    df = df.set_index("Date")

    cities = df["City"].unique()
    model_metadata = {}
    
    order = (1, 1, 1)
    seasonal_order = (1, 1, 1, 12)
    
    exo_cols = ["Wind_Speed", "Temperature", "Humidity"]

    print(f"\nTraining base SARIMAX {order}x{seasonal_order} for all cities...")
    
    for city in cities:
        print(f"\n--- Processing {city} ---")
        city_df = df[df["City"] == city].copy()
        
        # We need raw exogenous variable values to scale them individually for the split
        # We will re-read them from feature_engineering output because preprocess_sarimax already scaled them globally for the whole set
        # Wait, the prompt says "Use Individual Scalers for exogenous variables" 
        # So we should get the pre-scaled data, or scale the train set and apply to test set for perfect leakage prevention.
        # Let's load the raw features again just for this city 
        raw_df = pd.read_csv(os.path.join(BASE_DIR, "data", "processed", "city_day_features.csv"))
        raw_df["Date"] = pd.to_datetime(raw_df["Date"])
        raw_df = raw_df[raw_df["City"] == city].set_index("Date").sort_index()
        
        # Missing value handling just in case
        for col in ["AQI"] + exo_cols:
            if col in raw_df.columns:
                raw_df[col] = raw_df[col].interpolate(method='linear').bfill().ffill()
        
        # Task 3: Clean Out-of-Sample Backtesting Split
        # Train: <= 2022, Test: >= 2023
        train_df = raw_df[raw_df.index.year <= 2022].copy()
        test_df = raw_df[(raw_df.index.year >= 2023) & (raw_df.index.year <= 2024)].copy()
        
        if len(train_df) == 0 or len(test_df) == 0:
            print(f"Skipping {city}: Insufficient data for train/test split (Train: {len(train_df)}, Test: {len(test_df)})")
            continue
            
        print(f"Split sizes -> Train: {len(train_df)}, Test: {len(test_df)}")

        # Task 2: Individual Scalers for Exogenous
        scaler = StandardScaler()
        train_exog = scaler.fit_transform(train_df[exo_cols])
        test_exog = scaler.transform(test_df[exo_cols])
        
        # Save Scaler
        scaler_path = os.path.join(MODELS_DIR, f"{city.lower().replace(' ', '_')}_scaler.pkl")
        with open(scaler_path, 'wb') as f:
            pickle.dump(scaler, f)
            
        # Task 1: Variance Stability Check
        aqi_variance = train_df["AQI"].var()
        variance_threshold = 10000  # Threshold for "high" variance 
        
        use_log_transform = bool(aqi_variance > variance_threshold)
        
        target_train = train_df["AQI"].values
        target_test = test_df["AQI"].values
        
        if use_log_transform:
            print(f"High variance detected ({aqi_variance:.2f} > {variance_threshold}). Applying np.log1p() to AQI.")
            target_train = np.log1p(target_train)
            
        # Fit SARIMAX
        print("Fitting SARIMAX model...")
        model = SARIMAX(
            endog=target_train,
            exog=train_exog,
            order=order,
            seasonal_order=seasonal_order,
            enforce_stationarity=False,
            enforce_invertibility=False
        )
        
        # Task 2: Convergence Handling
        fit_success = False
        try:
            # We catch generic warnings inside the fit method, but specifically log convergence 
            with warnings.catch_warnings(record=True) as w:
                warnings.simplefilter("always")
                fitted_model = model.fit(disp=False, maxiter=50) # Keep iterations reasonable for time
                
                # Check for convergence warnings
                for warn in w:
                    if "ConvergenceWarning" in str(warn.category) or "Non-stationary" in str(warn.message) or "Maximum Likelihood optimization failed to converge" in str(warn.message):
                        logging.warning(f"City: {city} - Convergence Warning: {warn.message}")
                        print(f"Logged convergence warning to sarimax_convergence.log")
                
                fit_success = True
        except Exception as e:
            logging.error(f"City: {city} - Fit failed: {str(e)}")
            print(f"Model fitting totally failed for {city}: {e}")
            continue
            
        if not fit_success:
            continue

        # Save Model Object
        model_path = os.path.join(MODELS_DIR, f"{city.lower().replace(' ', '_')}_model.pkl")
        with open(model_path, 'wb') as f:
            pickle.dump(fitted_model, f)
            
        # Task 3: Out-of-Sample Backtesting
        print("Generating 2023-2024 forecasts...")
        # get_forecast requires specifying the steps and passing test exogenous
        forecast_obj = fitted_model.get_forecast(steps=len(test_df), exog=test_exog)
        predictions = forecast_obj.predicted_mean
        
        # Inverse log-transform if needed
        if use_log_transform:
            predictions = np.expm1(predictions)
            
        # Calculate Metrics
        rmse = np.sqrt(mean_squared_error(target_test, predictions))
        mae = mean_absolute_error(target_test, predictions)
        mape = calculate_mape(target_test, predictions)
        
        print(f"Metrics -> RMSE: {rmse:.2f} | MAE: {mae:.2f} | MAPE: {mape:.2f}%")
        
        # Task 4: Log Metadata
        model_metadata[city] = {
            "order": order,
            "seasonal_order": seasonal_order,
            "training_range": "2015-01-01 to 2022-12-31",
            "testing_range": "2023-01-01 to 2024-12-31",
            "log_transform_used": use_log_transform,
            "metrics": {
                "rmse": round(float(rmse), 4),
                "mae": round(float(mae), 4),
                "mape": round(float(mape), 4)
            }
        }
        
    # Save Metadata
    metadata_path = os.path.join(MODELS_DIR, "model_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(model_metadata, f, indent=4)
        
    print(f"\n==============================================")
    print(f"Model Training Suite Completed.")
    print(f"Saved {len(model_metadata)} models to {MODELS_DIR}")
    print(f"Metadata saved to {metadata_path}")
    print(f"==============================================")

if __name__ == "__main__":
    train_sarimax()
