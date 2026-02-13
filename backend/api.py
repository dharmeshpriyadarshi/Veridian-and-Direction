from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import requests
import os
import sys

# Add ml_engine to path so we can import from it
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ml_engine'))
from main import load_data, preprocess_data, calculate_probabilistic_stats

app = FastAPI()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, set this to the specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load forecast file (legacy Prophet)
try:
    forecast_df = pd.read_csv("forecast_results.csv")
    # Ensure 'ds' is string for easier matching
    forecast_df["ds"] = pd.to_datetime(forecast_df["ds"]).dt.strftime('%Y-%m-%d')
except Exception as e:
    print(f"Error loading forecast: {e}")
    forecast_df = pd.DataFrame(columns=["ds", "yhat"])

# --- Load ML Engine Data (One-time at startup) ---
DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'city_day.csv')
ml_raw_data = None
ml_delhi_data = None

try:
    ml_raw_data = load_data(DATA_PATH)
    if ml_raw_data is not None:
        ml_delhi_data = preprocess_data(ml_raw_data, city='Delhi')
        print("✅ ML Engine: Delhi data loaded and preprocessed successfully.")
except Exception as e:
    print(f"⚠️ ML Engine: Could not load data: {e}")

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


# =====================================================
# NEW: Method 1 — Historical Anchor Prediction Endpoint
# =====================================================
@app.get("/predict-anchor")
def predict_anchor(date: str):
    """
    Returns probabilistic prediction for a given date using 10 years of historical data.
    Also returns a transparent 'evaluation' breakdown showing HOW the result was derived.
    
    Query param: date (YYYY-MM-DD format, must be in 2026)
    """
    if ml_delhi_data is None:
        raise HTTPException(status_code=503, detail="ML Engine data not loaded. Ensure city_day.csv is in the data/ folder.")
    
    # Validate date is in 2026
    try:
        parsed = pd.to_datetime(date)
        if parsed.year != 2026:
            raise HTTPException(status_code=400, detail="Date must be in the year 2026.")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    
    # Run Method 1
    result = calculate_probabilistic_stats(ml_delhi_data.copy(), date)
    
    if result is None:
        raise HTTPException(status_code=404, detail="Insufficient historical data for this date.")
    
    # Build transparent evaluation breakdown
    month_day = parsed.strftime("%B %d")  # e.g. "January 18"
    mean_aqi = result["Mean AQI"]
    median_aqi = result["Median AQI"]
    std_dev = result["Std Dev"]
    ci = result["95% CI (Mean)"]
    likely_range = result["Likely Range (10th-90th percentile)"]
    sample_size = result["Sample Size"]
    
    # Determine AQI category
    if mean_aqi <= 50:
        category = "Good"
        color = "#4ade80"
        severity = "low"
    elif mean_aqi <= 100:
        category = "Moderate"
        color = "#facc15"
        severity = "moderate"
    elif mean_aqi <= 200:
        category = "Unhealthy"
        color = "#f97316"
        severity = "high"
    elif mean_aqi <= 300:
        category = "Very Unhealthy"
        color = "#ef4444"
        severity = "very_high"
    else:
        category = "Hazardous"
        color = "#991b1b"
        severity = "severe"
    
    # Years span in the dataset
    years_in_data = ml_delhi_data['Date'].dt.year.unique().tolist()
    
    return {
        "prediction": {
            "date": date,
            "display_date": month_day,
            "predicted_aqi": round(mean_aqi, 1),
            "median_aqi": round(median_aqi, 1),
            "category": category,
            "category_color": color,
            "severity": severity,
            "confidence_interval": {
                "lower": round(ci[0], 1),
                "upper": round(ci[1], 1)
            },
            "likely_range": {
                "lower": round(likely_range[0], 1),
                "upper": round(likely_range[1], 1)
            },
            "std_dev": round(std_dev, 1)
        },
        "evaluation": {
            "method": "Historical Anchor (Probabilistic Distribution)",
            "description": f"Analyzed PM2.5 readings for days around {month_day} across {len(years_in_data)} years of historical data.",
            "steps": [
                {
                    "step": 1,
                    "title": "Data Source",
                    "detail": f"Kaggle India Air Quality Dataset — {min(years_in_data)} to {max(years_in_data)} ({len(years_in_data)} years)"
                },
                {
                    "step": 2,
                    "title": "City Filter",
                    "detail": "Filtered for Delhi (target city)"
                },
                {
                    "step": 3,
                    "title": "Imputation",
                    "detail": "Missing sensor readings filled using Linear Interpolation"
                },
                {
                    "step": 4,
                    "title": "Date Window",
                    "detail": f"Selected ±3 days around {month_day} across all years → {sample_size} data points"
                },
                {
                    "step": 5,
                    "title": "Statistical Calculation",
                    "detail": f"Mean: {round(mean_aqi, 1)} | Median: {round(median_aqi, 1)} | Std Dev: {round(std_dev, 1)}"
                },
                {
                    "step": 6,
                    "title": "Confidence Interval",
                    "detail": f"95% CI: [{round(ci[0], 1)} — {round(ci[1], 1)}] (where the true mean likely falls)"
                },
                {
                    "step": 7,
                    "title": "Prediction Range",
                    "detail": f"10th–90th percentile: [{round(likely_range[0], 1)} — {round(likely_range[1], 1)}] (where a new reading likely falls)"
                }
            ],
            "data_quality": {
                "sample_size": sample_size,
                "years_covered": years_in_data,
                "window_days": 7
            }
        },
        "method2_status": {
            "name": "Adaptive Brain (DTW Trend Matching)",
            "status": "coming_soon",
            "description": "Will analyze the current pollution trend shape and match it against historical patterns to refine this prediction."
        }
    }
