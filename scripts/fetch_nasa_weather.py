import requests
import pandas as pd
import os

print("Fetching NASA POWER weather data...")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
output_path = os.path.join(BASE_DIR, "data", "raw", "nasa_weather.csv")

# Define city coordinates
city_coords = {
    "Delhi": (28.6139, 77.2090),
    "Mumbai": (19.0760, 72.8777),
    "Bangalore": (12.9716, 77.5946),
    "Chennai": (13.0827, 80.2707),
    "Kolkata": (22.5726, 88.3639)
}

all_data = []

for city, (lat, lon) in city_coords.items():
    print(f"Fetching data for {city}...")
    
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    
    params = {
    	"latitude": lat,
    	"longitude": lon,
    	"start": "20150101",
    	"end": "20241231",
    	"parameters": "T2M,WS10M,RH2M",
    	"community": "AG",
    	"format": "JSON"
    }

    response = requests.get(url, params=params)
    
    data = response.json()

    
    
    daily = data["properties"]["parameter"]
    
    df_city = pd.DataFrame({
        "Date": daily["T2M"].keys(),
        "Temperature": daily["T2M"].values(),
        "Wind_Speed": daily["WS10M"].values(),
        "Humidity": daily["RH2M"].values()
    })
    
    df_city["City"] = city
    df_city["Date"] = pd.to_datetime(df_city["Date"])
    
    all_data.append(df_city)

weather_df = pd.concat(all_data, ignore_index=True)
weather_df.to_csv(output_path, index=False)

print("NASA weather data saved successfully.")
print(f"File saved at: {output_path}")