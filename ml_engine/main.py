import pandas as pd
import numpy as np
from scipy import stats
import os
import warnings

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')

def load_data(filepath):
    """
    Loads the city_day.csv file.
    """
    print(f"Loading data from {filepath}...")
    try:
        df = pd.read_csv(filepath)
        # Rename 'Datetime' to 'Date' for consistency
        if 'Datetime' in df.columns:
            df.rename(columns={'Datetime': 'Date'}, inplace=True)
            
        df['Date'] = pd.to_datetime(df['Date'])
        return df
    except FileNotFoundError:
        print(f"Error: File not found at {filepath}")
        return None

def preprocess_data(df, city='Delhi'):
    """
    Filters for specific city, imputes missing values using Linear Interpolation.
    Handles both PM2.5 and AQI columns.
    """
    print(f"Preprocessing data for {city}...")
    
    # Filter for city
    city_df = df[df['City'] == city].copy()
    
    if city_df.empty:
        print(f"Error: No data found for city {city}")
        return None
        
    # Sort by date to ensure interpolation works correctly
    city_df = city_df.sort_values('Date')
    
    # Linear Imputation for PM2.5 and AQI
    city_df['PM2.5'] = city_df['PM2.5'].interpolate(method='linear', limit_direction='both')
    if 'AQI' in city_df.columns:
        city_df['AQI'] = city_df['AQI'].interpolate(method='linear', limit_direction='both')
    
    # Drop rows where both are NaN
    city_df = city_df.dropna(subset=['PM2.5'])
    
    return city_df

def _compute_stats_for_column(samples):
    """Helper: compute mean, median, std, CI, percentiles for a set of samples."""
    if len(samples) < 5:
        return None
    mean_val = float(np.mean(samples))
    median_val = float(np.median(samples))
    std_dev = float(np.std(samples))
    ci_lower, ci_upper = stats.norm.interval(0.95, loc=mean_val, scale=std_dev/np.sqrt(len(samples)))
    p10 = float(np.percentile(samples, 10))
    p90 = float(np.percentile(samples, 90))
    return {
        "mean": round(mean_val, 2),
        "median": round(median_val, 2),
        "std_dev": round(std_dev, 2),
        "ci_95": (round(float(ci_lower), 2), round(float(ci_upper), 2)),
        "likely_range": (round(p10, 2), round(p90, 2)),
        "sample_size": len(samples),
    }

def calculate_probabilistic_stats(df, target_date_str):
    """
    Method 1: Historical Anchor
    Calculates stats for BOTH AQI (primary) and PM2.5 (supplementary).
    Target Date Format: 'YYYY-MM-DD' (Year doesn't matter, we use Month-Day)
    """
    target_date = pd.to_datetime(target_date_str)
    
    print(f"\n--- Method 1: Analyzing Historical Anchor for {target_date.month}-{target_date.day} ---")
    
    df['DayOfYear'] = df['Date'].dt.dayofyear
    target_doy = target_date.dayofyear
    
    # ±3 day window
    window_mask = (df['DayOfYear'] >= target_doy - 3) & (df['DayOfYear'] <= target_doy + 3)
    windowed = df.loc[window_mask]
    
    # AQI stats (primary)
    aqi_samples = windowed['AQI'].dropna().values if 'AQI' in df.columns else np.array([])
    aqi_stats = _compute_stats_for_column(aqi_samples) if len(aqi_samples) >= 5 else None
    
    # PM2.5 stats (supplementary)
    pm25_samples = windowed['PM2.5'].dropna().values
    pm25_stats = _compute_stats_for_column(pm25_samples) if len(pm25_samples) >= 5 else None
    
    if aqi_stats is None and pm25_stats is None:
        print("Insufficient historical data for probabilistic analysis.")
        return None

    stats_output = {
        "Target Date": target_date_str,
        "aqi": aqi_stats,
        "pm25": pm25_stats,
    }
    
    print("\n[Historical Anchor Results]")
    if aqi_stats:
        print(f"  AQI  → Mean: {aqi_stats['mean']}, Median: {aqi_stats['median']}, Std: {aqi_stats['std_dev']}, Samples: {aqi_stats['sample_size']}")
    if pm25_stats:
        print(f"  PM2.5 → Mean: {pm25_stats['mean']}, Median: {pm25_stats['median']}, Std: {pm25_stats['std_dev']}, Samples: {pm25_stats['sample_size']}")
        
    return stats_output

if __name__ == "__main__":
    # Path adjustment for running from different directories
    base_dir = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH = os.path.join(base_dir, '..', 'data', 'raw', 'city_day.csv')
    
    if not os.path.exists(DATA_PATH):
        # Fallback if running from root
        DATA_PATH = os.path.join('data', 'raw', 'city_day.csv')

    df = load_data(DATA_PATH)
    
    if df is not None:
        delhi_df = preprocess_data(df, city='Delhi')
        
        if delhi_df is not None:
            # Test Method 1 for a specific date (e.g., Jan 18th)
            # We use a dummy year '2025' just to extract the Month-Day.
            calculate_probabilistic_stats(delhi_df, '2025-01-18')
