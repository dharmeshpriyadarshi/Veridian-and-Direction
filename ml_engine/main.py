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
    """
    print(f"Preprocessing data for {city}...")
    
    # Filter for city
    city_df = df[df['City'] == city].copy()
    
    if city_df.empty:
        print(f"Error: No data found for city {city}")
        return None
        
    # Sort by date to ensure interpolation works correctly
    city_df = city_df.sort_values('Date')
    
    # Linear Imputation for PM2.5
    # Limit direction='both' handles leading/trailing NaNs if reasonable
    city_df['PM2.5'] = city_df['PM2.5'].interpolate(method='linear', limit_direction='both')
    
    # Drop any remaining NaNs if interpolation completely failed (rare)
    city_df = city_df.dropna(subset=['PM2.5'])
    
    return city_df

def calculate_probabilistic_stats(df, target_date_str):
    """
    Method 1: Historical Anchor
    Calculates Mean, Median, StdDev, and Confidence Intervals for a specific calendar day across years.
    Target Date Format: 'YYYY-MM-DD' (Year doesn't matter for the anchor, we use Month-Day)
    """
    target_date = pd.to_datetime(target_date_str)
    month = target_date.month
    day = target_date.day
    
    print(f"\n--- Method 1: Analyzing Historical Anchor for {month}-{day} ---")
    
    # Create a 'Month-Day' string column for grouping
    df['MonthDay'] = df['Date'].dt.strftime('%m-%d')
    target_md = target_date.strftime('%m-%d')
    
    # Filter for this specific day across all available years (2015-2024)
    # We broaden the window to +/- 3 days to get a more robust distribution (Smoothing)
    df['DayOfYear'] = df['Date'].dt.dayofyear
    target_doy = target_date.dayofyear
    
    # Handle wrap-around for year end/start if needed, but simple range is usually enough for middle of year
    # Using a 7-day rolling window center on the date to increase sample size
    window_mask = (df['DayOfYear'] >= target_doy - 3) & (df['DayOfYear'] <= target_doy + 3)
    
    historical_samples = df.loc[window_mask, 'PM2.5'].values
    
    if len(historical_samples) < 5:
        print("Insufficient historical data for probabilistic analysis.")
        return None

    # Calculate Statistics
    mean_val = np.mean(historical_samples)
    median_val = np.median(historical_samples)
    std_dev = np.std(historical_samples)
    
    # Calculate 95% Confidence Interval
    # Assuming Normal Distribution for the CI calculation (can be improved with KDE later)
    ci_lower, ci_upper = stats.norm.interval(0.95, loc=mean_val, scale=std_dev/np.sqrt(len(historical_samples)))
    
    # For pollution, we often want the Prediction Interval (where a *new* observation likely falls), 
    # not just the CI of the mean. Let's provide the 10th and 90th percentiles as a "Likely Range".
    p10 = np.percentile(historical_samples, 10)
    p90 = np.percentile(historical_samples, 90)

    stats_output = {
        "Target Date": target_date_str,
        "Sample Size": len(historical_samples),
        "Mean AQI": round(mean_val, 2),
        "Median AQI": round(median_val, 2),
        "Std Dev": round(std_dev, 2),
        "95% CI (Mean)": (round(ci_lower, 2), round(ci_upper, 2)),
        "Likely Range (10th-90th percentile)": (round(p10, 2), round(p90, 2))
    }
    
    print("\n[Historical Anchor Results]")
    for k, v in stats_output.items():
        print(f"{k}: {v}")
        
    return stats_output

if __name__ == "__main__":
    # Path adjustment for running from different directories
    base_dir = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH = os.path.join(base_dir, '..', 'data', 'city_day.csv')
    
    if not os.path.exists(DATA_PATH):
        # Fallback if running from root
        DATA_PATH = os.path.join('data', 'city_day.csv')

    df = load_data(DATA_PATH)
    
    if df is not None:
        delhi_df = preprocess_data(df, city='Delhi')
        
        if delhi_df is not None:
            # Test Method 1 for a specific date (e.g., Jan 18th)
            # We use a dummy year '2025' just to extract the Month-Day.
            calculate_probabilistic_stats(delhi_df, '2025-01-18')
