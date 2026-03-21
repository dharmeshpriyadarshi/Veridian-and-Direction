def get_cpcb_category(aqi: float) -> str:
    """
    Returns categories (Good, Satisfactory, Moderate, Poor, Very Poor, Severe)
    based on official CPCB breakpoints.
    """
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

def calculate_aqi_trend(current: float, historical_mean: float) -> str:
    """
    Returns a 'Trend' string (Improving, Stable, or Deteriorating).
    """
    margin = historical_mean * 0.05
    if current < (historical_mean - margin):
        return "Improving"
    elif current > (historical_mean + margin):
        return "Deteriorating"
    else:
        return "Stable"

import joblib
import numpy as np
import os

def inverse_transform_aqi(scaled_val: float) -> float:
    """
    Inverse transforms the $0-1$ scaled prediction back into a real AQI number
    using the minmax_scaler.pkl from the data engineering stage.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    scaler_path = os.path.join(current_dir, "processed_data", "minmax_scaler.pkl")
    
    if not os.path.exists(scaler_path):
        return scaled_val
        
    scaler = joblib.load(scaler_path)
    
    # MinMaxScaler logic: real_val = (scaled_val - min_) / scale_
    # Since AQI was index 0 during fit:
    val = (scaled_val - scaler.min_[0]) / scaler.scale_[0]
    return float(val)
