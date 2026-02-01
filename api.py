from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import requests

app = FastAPI()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, set this to the specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load forecast file
try:
    forecast_df = pd.read_csv("forecast_results.csv")
    # Ensure 'ds' is string for easier matching
    forecast_df["ds"] = pd.to_datetime(forecast_df["ds"]).dt.strftime('%Y-%m-%d')
except Exception as e:
    print(f"Error loading forecast: {e}")
    forecast_df = pd.DataFrame(columns=["ds", "yhat"])

WAQI_TOKEN = "a87c8e2b990acd88caab2eb206b5f1f4467e228c"

@app.get("/")
def home():
    return {"status": "Veridian ML API is running"}

@app.get("/current")
def get_current_data(city: str):
    # Fetch Pollution Data
    waqi_url = f"https://api.waqi.info/feed/{city}/?token={WAQI_TOKEN}"
    try:
        aqi_res = requests.get(waqi_url).json()
        if aqi_res["status"] != "ok":
             raise HTTPException(status_code=404, detail="City not found for AQI data")
        
        data = aqi_res["data"]
        iaqi = data.get("iaqi", {})
        
        # safely get pollutants
        pm25 = iaqi.get("pm25", {}).get("v", 0)
        pm10 = iaqi.get("pm10", {}).get("v", 0)
        no2 = iaqi.get("no2", {}).get("v", 0)
        temp = iaqi.get("t", {}).get("v", 25) # temp from air station
        
        return {
            "location": data.get("city", {}).get("name", city),
            "aqi": data.get("aqi", 0),
            "pm25": pm25,
            "pm10": pm10,
            "no2": no2,
            "temp": temp,
            "condition": "Haze" if data.get("aqi", 0) > 100 else "Clear", # Simple inference
            "humidity": iaqi.get("h", {}).get("v", 50),
            "windSpeed": iaqi.get("w", {}).get("v", 5)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict")
def predict(date: str):
    # Expecting date format: YYYY-MM-DD
    match = forecast_df[forecast_df["ds"] == date]

    if match.empty:
        return {"error": f"Date {date} not found in forecast range."}

    prediction = float(match["yhat"].values[0])

    return {
        "date": date,
        "predicted_pm25": prediction
    }

@app.get("/forecast")
def get_forecast():
    # Return last 7 days history + 30 days prediction
    # This matches the "Little Ahead" chart requirements
    try:
        # Sort by date
        df_sorted = forecast_df.sort_values(by="ds")
        
        # Convert to list of dicts
        result = []
        for _, row in df_sorted.iterrows():
            result.append({
                "day": row["ds"], # Date string
                "aqi": float(row["yhat"]), # Predicted value
                "type": "prediction"
            })
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

