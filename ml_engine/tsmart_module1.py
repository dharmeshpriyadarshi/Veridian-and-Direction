import pandas as pd
import json
import os

def extract_historical_spikes(csv_path="data/raw/city_day.csv", city="Delhi"):
    """
    Extracts the highest 7-day rolling average AQI for each month, each year.
    Returns the centroid date and peak AQI average.
    """
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        print(f"Error: Could not find {csv_path}")
        return []

    # Ensure necessary columns exist
    if 'City' not in df.columns or 'Datetime' not in df.columns or 'AQI' not in df.columns:
        print(f"Error: Missing columns in {csv_path}. Needed City, Datetime, AQI. Found: {list(df.columns)}")
        return []

    # Filter by city
    df = df[df['City'] == city].copy()
    
    # Process dates and AQI
    df['Date'] = pd.to_datetime(df['Datetime'])
    df = df.sort_values('Date')
    df = df.dropna(subset=['AQI']) # Or interpolate, but simple drop for rolling is okay for prototype
    
    # Set index to Date to use rolling easily with '7D'
    df.set_index('Date', inplace=True)
    
    results = []

    # Iterate over unique years and months
    # Group by Year and Month
    df['Year'] = df.index.year
    df['Month'] = df.index.month

    for (year, month), group in df.groupby(['Year', 'Month']):
        # If we have less than 7 days of data for the month, it might not be a valid full window,
        # but for this prototype, we'll take the rolling average on available data within the month.
        # To get a strict 7-day rolling window, we use pandas rolling:
        
        # Calculate 7-day rolling average (right-aligned by default, so index is the *end* date of the window)
        rolling_aqi = group['AQI'].rolling(window=7, min_periods=1).mean()
        
        if rolling_aqi.empty:
            continue
            
        # Find the max average
        max_avg_val = rolling_aqi.max()
        # Find the date (end date of window) where max average occurred
        # .idxmax() returns the first occurrence
        end_date = rolling_aqi.idxmax()
        
        # Centroid date is approx 3 days before the end date of a 7 day window
        centroid_date = end_date - pd.Timedelta(days=3)
        
        # If min_periods=1, the actual window size might be less than 7 at the beginning of the month.
        # But this is okay for a start.
        
        # Round AQI to 2 decimal places
        max_avg_val = round(float(max_avg_val), 2)
        
        results.append({
            "month": int(month),
            "year": int(year),
            "centroid_date": centroid_date.strftime('%Y-%m-%d'),
            "peak_aqi_average": max_avg_val
        })

    # Save to JSON
    output_dir = "data"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "tsmart_module1_historical.json")
    
    with open(output_path, "w") as f:
        json.dump(results, f, indent=4)
        
    print(f"Extraction complete. Results saved to {output_path}")
    return results

if __name__ == "__main__":
    extract_historical_spikes()
