import pandas as pd
import json
import os

def extract_historical_spikes(csv_path="data/raw/city_day.csv"):
    """
    Extracts the highest 7-day rolling average AQI for each month, each year, for each city.
    Returns a dict with city names mapping to their respective historical spikes.
    """
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        print(f"Error: Could not find {csv_path}")
        return {}

    # Ensure necessary columns exist
    if 'City' not in df.columns or 'Datetime' not in df.columns or 'AQI' not in df.columns:
        print(f"Error: Missing columns in {csv_path}. Needed City, Datetime, AQI. Found: {list(df.columns)}")
        return {}

    # Find the top cities (that have enough data to be relevant - e.g., have been filtered in available_cities)
    # We'll just process all of them that have enough data
    city_counts = df.groupby('City')['AQI'].count()
    valid_cities = sorted(city_counts[city_counts >= 30].index.tolist())
    
    all_city_results = {}
    
    for city in valid_cities:
        # Filter by city
        city_df = df[df['City'] == city].copy()
        
        # Process dates and AQI
        city_df['Date'] = pd.to_datetime(city_df['Datetime'])
        city_df = city_df.sort_values('Date')
        city_df = city_df.dropna(subset=['AQI'])
        
        if city_df.empty:
            continue
            
        # Set index to Date to use rolling easily with '7D'
        city_df.set_index('Date', inplace=True)
        
        results = []

        # Group by Year and Month
        city_df['Year'] = city_df.index.year
        city_df['Month'] = city_df.index.month

        for (year, month), group in city_df.groupby(['Year', 'Month']):
            # Calculate 7-day rolling average
            rolling_aqi = group['AQI'].rolling(window=7, min_periods=1).mean()
            
            if rolling_aqi.empty:
                continue
                
            # Find the max average
            max_avg_val = rolling_aqi.max()
            end_date = rolling_aqi.idxmax()
            
            # Centroid date is approx 3 days before the end date of a 7 day window
            centroid_date = end_date - pd.Timedelta(days=3)
            max_avg_val = round(float(max_avg_val), 2)
            
            results.append({
                "month": int(month),
                "year": int(year),
                "centroid_date": centroid_date.strftime('%Y-%m-%d'),
                "peak_aqi_average": max_avg_val
            })
            
        all_city_results[city] = results

    # Save to JSON
    output_dir = "data"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "tsmart_module1_historical.json")
    
    with open(output_path, "w") as f:
        json.dump(all_city_results, f, indent=4)
        
    print(f"Extraction complete. Results saved to {output_path}")
    return all_city_results

if __name__ == "__main__":
    extract_historical_spikes()
