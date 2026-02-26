import pandas as pd
import numpy as np
import os
import json
from datetime import timedelta
import sys

# Ensure ml_engine is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from trend_matching import find_matching_historical_trend

def load_data(filepath="data/raw/city_day.csv"):
    df = pd.read_csv(filepath)
    if 'Datetime' in df.columns:
        df.rename(columns={'Datetime': 'Date'}, inplace=True)
    df['Date'] = pd.to_datetime(df['Date'])
    return df

def extract_trajectory_vector(df, city="Delhi", target_date="2024-01-14", window_size=14, forecast_horizon=7):
    """
    Module 2: Trajectory Vector
    Extracts the 14-day baseline prior to the target date.
    Finds the top 3 historical matches using DTW.
    Generates a predicted trajectory (Drift Velocity / \\Delta d).
    """
    city_df = df[df['City'] == city].copy()
    if city_df.empty:
        return {"error": f"No data found for city {city}"}
        
    city_df = city_df.sort_values('Date')
    
    # Impute missing values
    if 'AQI' in city_df.columns:
        city_df['AQI'] = city_df['AQI'].interpolate(method='linear', limit_direction='both')
    city_df = city_df.dropna(subset=['AQI'])
    
    target_dt = pd.to_datetime(target_date)
    start_dt = target_dt - timedelta(days=window_size)
    
    # Extract baseline
    baseline_df = city_df[(city_df['Date'] > start_dt) & (city_df['Date'] <= target_dt)]
    
    if len(baseline_df) < window_size:
        # Fallback for future dates (e.g. 2026 predictions)
        latest_year = city_df['Date'].dt.year.max()
        try:
            target_dt = target_dt.replace(year=latest_year)
        except ValueError: # Handle leap year Feb 29
            target_dt = target_dt.replace(year=latest_year, month=2, day=28)
            
        start_dt = target_dt - timedelta(days=window_size)
        baseline_df = city_df[(city_df['Date'] > start_dt) & (city_df['Date'] <= target_dt)]
        
        if len(baseline_df) < window_size:
            return {"error": f"Insufficient historical data for 14-day baseline matching {target_date}"}
            
    baseline_aqi = baseline_df['AQI'].values
    
    # Exclude the exact same 14-day period + the forecast horizon from the historical search pool
    # to avoid trivial self-matching.
    history_df = city_df[
        (city_df['Date'] <= start_dt - timedelta(days=forecast_horizon)) | 
        (city_df['Date'] > target_dt + timedelta(days=forecast_horizon))
    ]
    
    # Find matching trends using DTW
    matches = find_matching_historical_trend(baseline_aqi, history_df, window_size=window_size, forecast_horizon=forecast_horizon)
    
    if not matches:
        return {"error": "No matching historical trends found."}
        
    # Generate the predicted trajectory (weighted average of matches based on distance)
    # Simple unweighted average for now to ensure robustness
    forecast_arrays = []
    response_matches = []
    
    for match in matches:
        forecast_arrays.append(match['subsequent_aqi'])
        response_matches.append({
            "start_date": match['start_date'].strftime('%Y-%m-%d'),
            "end_date": match['end_date'].strftime('%Y-%m-%d'),
            "distance": round(match['distance'], 2),
            "historical_aqi": list(np.round(match['historical_aqi'], 2)),
            "subsequent_aqi": list(np.round(match['subsequent_aqi'], 2))
        })
        
    avg_predicted_aqi = np.mean(forecast_arrays, axis=0)
    
    # Calculate Drift Velocity (delta d)
    # the difference between the end of the baseline and the expected peak/trend
    current_aqi = baseline_aqi[-1]
    predicted_peak_aqi = np.max(avg_predicted_aqi)
    drift_velocity = predicted_peak_aqi - current_aqi
    
    return {
        "city": city,
        "target_date": target_date,
        "baseline_window": {
            "start": (start_dt + timedelta(days=1)).strftime('%Y-%m-%d'),
            "end": target_dt.strftime('%Y-%m-%d')
        },
        "baseline_aqi": list(np.round(baseline_aqi, 2)),
        "predicted_aqi": list(np.round(avg_predicted_aqi, 2)),
        "drift_velocity": round(drift_velocity, 2),
        "historical_matches": response_matches
    }

if __name__ == "__main__":
    df = load_data()
    result = extract_trajectory_vector(df, city="Delhi", target_date="2020-01-14")
    print(json.dumps(result, indent=2))
