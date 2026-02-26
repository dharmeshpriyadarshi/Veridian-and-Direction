import numpy as np
import pandas as pd
from dtaidistance import dtw

def extract_trend_signature(data):
    """
    Extracts the 'shape' of the data using Z-score normalization for DTW matching.
    """
    mean_val = np.mean(data)
    std_val = np.std(data)
    if std_val == 0:
        return np.zeros_like(data)
    return (data - mean_val) / std_val

def find_matching_historical_trend(baseline_aqi, history_df, window_size=14, forecast_horizon=7, top_k=3):
    """
    Method 2: Adaptive Brain
    Scans history to find the best matching trend subsequence using DTW.
    Returns the top_k non-overlapping matches.
    """
    if len(history_df) < window_size + forecast_horizon:
        return []

    baseline_sig = extract_trend_signature(baseline_aqi)
    
    matches = []
    
    # Needs to end early enough to allow for forecast_horizon
    max_idx = len(history_df) - window_size - forecast_horizon
    
    aqi_values = history_df['AQI'].values
    dates = history_df['Date'].values
    
    for i in range(max_idx + 1):
        hist_window = aqi_values[i : i + window_size]
        
        # Check for NaN in window
        if np.isnan(hist_window).any():
            continue
            
        hist_sig = extract_trend_signature(hist_window)
        
        # Calculate DTW distance
        try:
            distance = dtw.distance(baseline_sig, hist_sig)
        except Exception:
            distance = float('inf')
            
        # Extract subsequent horizon
        subsequent_aqi = aqi_values[i + window_size : i + window_size + forecast_horizon]
        if np.isnan(subsequent_aqi).any():
            continue
            
        matches.append({
            'start_date': pd.to_datetime(dates[i]),
            'end_date': pd.to_datetime(dates[i + window_size - 1]),
            'distance': distance,
            'historical_aqi': hist_window,
            'subsequent_aqi': subsequent_aqi,
            'index': i
        })
        
    if not matches:
        return []
        
    # Sort by distance
    matches.sort(key=lambda x: x['distance'])
    
    # Filter for top K, ensuring they don't heavily overlap
    top_matches = []
    min_separation = window_size // 2  # Require matches to be at least half a window apart
    
    for match in matches:
        overlap = False
        for top_match in top_matches:
            if abs(match['index'] - top_match['index']) < min_separation:
                overlap = True
                break
        if not overlap:
            top_matches.append(match)
        if len(top_matches) == top_k:
            break
            
    return top_matches
