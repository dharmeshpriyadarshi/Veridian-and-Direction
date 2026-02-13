from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from scipy import stats
import requests
import os
import sys
import warnings

warnings.filterwarnings('ignore')

# Add ml_engine to path so we can import from it
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Go up from backend/ to root
sys.path.insert(0, os.path.join(ROOT_DIR, 'ml_engine'))
from main import load_data, preprocess_data, calculate_probabilistic_stats

app = FastAPI()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load forecast file (legacy Prophet)
FORECAST_PATH = os.path.join(ROOT_DIR, 'data', 'outputs', 'forecast_results.csv')
try:
    forecast_df = pd.read_csv(FORECAST_PATH)
    forecast_df["ds"] = pd.to_datetime(forecast_df["ds"]).dt.strftime('%Y-%m-%d')
    print(f"✅ Legacy Forecast: Loaded from {FORECAST_PATH}")
except Exception as e:
    print(f"⚠️ Legacy Forecast: {e}")
    forecast_df = pd.DataFrame(columns=["ds", "yhat"])

# --- Load ML Engine Data (One-time at startup) ---
DATA_PATH = os.path.join(ROOT_DIR, 'data', 'raw', 'city_day.csv')
ml_raw_data = None
ml_city_cache = {}  # Cache preprocessed data per city

try:
    ml_raw_data = load_data(DATA_PATH)
    if ml_raw_data is not None:
        # Get list of cities that have enough data
        city_counts = ml_raw_data.groupby('City')['PM2.5'].count()
        available_cities = sorted(city_counts[city_counts >= 30].index.tolist())
        print(f"✅ ML Engine: Data loaded. {len(available_cities)} cities available: {available_cities}")
    else:
        available_cities = []
except Exception as e:
    print(f"⚠️ ML Engine: Could not load data: {e}")
    available_cities = []

def get_city_data(city: str):
    """Get preprocessed data for a city, with caching."""
    if city not in ml_city_cache:
        ml_city_cache[city] = preprocess_data(ml_raw_data, city=city)
    return ml_city_cache[city]

WAQI_TOKEN = "a87c8e2b990acd88caab2eb206b5f1f4467e228c"

# =====================================================
# Existing Endpoints
# =====================================================

@app.get("/")
def home():
    return {"status": "Veridian ML API is running"}

@app.get("/current")
def get_current_data(city: str):
    waqi_url = f"https://api.waqi.info/feed/{city}/?token={WAQI_TOKEN}"
    try:
        aqi_res = requests.get(waqi_url).json()
        if aqi_res["status"] != "ok":
             raise HTTPException(status_code=404, detail="City not found for AQI data")
        
        data = aqi_res["data"]
        iaqi = data.get("iaqi", {})
        
        pm25 = iaqi.get("pm25", {}).get("v", 0)
        pm10 = iaqi.get("pm10", {}).get("v", 0)
        no2 = iaqi.get("no2", {}).get("v", 0)
        temp = iaqi.get("t", {}).get("v", 25)
        
        return {
            "location": data.get("city", {}).get("name", city),
            "aqi": data.get("aqi", 0),
            "pm25": pm25,
            "pm10": pm10,
            "no2": no2,
            "temp": temp,
            "condition": "Haze" if data.get("aqi", 0) > 100 else "Clear",
            "humidity": iaqi.get("h", {}).get("v", 50),
            "windSpeed": iaqi.get("w", {}).get("v", 5)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
def predict(date: str):
    match = forecast_df[forecast_df["ds"] == date]
    if match.empty:
        return {"error": f"Date {date} not found in forecast range."}
    prediction = float(match["yhat"].values[0])
    return {"date": date, "predicted_pm25": prediction}

@app.get("/forecast")
def get_forecast():
    try:
        df_sorted = forecast_df.sort_values(by="ds")
        result = []
        for _, row in df_sorted.iterrows():
            result.append({
                "day": row["ds"],
                "aqi": float(row["yhat"]),
                "type": "prediction"
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# NEW: City List Endpoint
# =====================================================
@app.get("/cities")
def get_cities():
    """Returns list of cities available for prediction."""
    return {"cities": available_cities}


# =====================================================
# NEW: Method 1 — Historical Anchor (Enhanced)
# =====================================================
@app.get("/predict-anchor")
def predict_anchor(date: str, city: str = "Delhi"):
    """
    Returns probabilistic prediction for a given date and city.
    Includes year-by-year historical breakdown with deviation from yearly mean.
    
    Query params:
      - date: YYYY-MM-DD (must be 2026)
      - city: city name (default: Delhi)
    """
    if ml_raw_data is None:
        raise HTTPException(status_code=503, detail="ML Engine data not loaded.")
    
    if city not in available_cities:
        raise HTTPException(status_code=400, detail=f"City '{city}' not available. Use /cities endpoint.")
    
    # Validate date is in 2026
    try:
        parsed = pd.to_datetime(date)
        if parsed.year != 2026:
            raise HTTPException(status_code=400, detail="Date must be in the year 2026.")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    
    # Get preprocessed city data
    city_df = get_city_data(city)
    if city_df is None or city_df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for city '{city}'.")
    
    # Run Method 1
    result = calculate_probabilistic_stats(city_df.copy(), date)
    if result is None:
        raise HTTPException(status_code=404, detail="Insufficient historical data for this date.")
    
    # ============================================================
    # YEAR-BY-YEAR BREAKDOWN
    # For each year in the dataset, get:
    #   1. The PM2.5 value for that specific day (±3 day window avg)
    #   2. The overall yearly mean PM2.5
    #   3. How far the day's value deviates from the year mean
    # ============================================================
    month_day = parsed.strftime("%B %d")
    target_doy = parsed.dayofyear
    
    yearly_breakdown = []
    years_in_data = sorted(city_df['Date'].dt.year.unique().tolist())
    
    for year in years_in_data:
        year_df = city_df[city_df['Date'].dt.year == year]
        if year_df.empty:
            continue
        
        # Overall stats for the ENTIRE year
        year_mean = float(year_df['PM2.5'].mean())
        year_median = float(year_df['PM2.5'].median())
        year_std = float(year_df['PM2.5'].std())
        year_total_days = len(year_df)
        
        # The specific day's data (±3 day window for that year)
        year_df_doy = year_df.copy()
        year_df_doy['DayOfYear'] = year_df_doy['Date'].dt.dayofyear
        window_mask = (year_df_doy['DayOfYear'] >= target_doy - 3) & (year_df_doy['DayOfYear'] <= target_doy + 3)
        day_samples = year_df_doy.loc[window_mask, 'PM2.5']
        
        if day_samples.empty:
            continue
        
        day_mean = float(day_samples.mean())
        day_count = len(day_samples)
        
        # Deviation from the year's overall mean
        deviation = day_mean - year_mean
        deviation_pct = ((day_mean - year_mean) / year_mean) * 100 if year_mean != 0 else 0
        
        # Z-score: how many standard deviations away is this day from the year mean
        z_score = (day_mean - year_mean) / year_std if year_std != 0 else 0
        
        yearly_breakdown.append({
            "year": int(year),
            "day_aqi": round(day_mean, 1),
            "day_sample_count": day_count,
            "year_mean": round(year_mean, 1),
            "year_median": round(year_median, 1),
            "year_std": round(year_std, 1),
            "year_total_days": year_total_days,
            "deviation": round(deviation, 1),
            "deviation_pct": round(deviation_pct, 1),
            "z_score": round(z_score, 2),
            "interpretation": (
                "Well below average" if z_score < -1.5 else
                "Below average" if z_score < -0.5 else
                "Near average" if z_score < 0.5 else
                "Above average" if z_score < 1.5 else
                "Well above average"
            )
        })
    
    # Build response
    mean_aqi = result["Mean AQI"]
    median_aqi = result["Median AQI"]
    std_dev = result["Std Dev"]
    ci = result["95% CI (Mean)"]
    likely_range = result["Likely Range (10th-90th percentile)"]
    sample_size = result["Sample Size"]
    
    # AQI category
    if mean_aqi <= 50:
        category, color, severity = "Good", "#4ade80", "low"
    elif mean_aqi <= 100:
        category, color, severity = "Moderate", "#facc15", "moderate"
    elif mean_aqi <= 200:
        category, color, severity = "Unhealthy", "#f97316", "high"
    elif mean_aqi <= 300:
        category, color, severity = "Very Unhealthy", "#ef4444", "very_high"
    else:
        category, color, severity = "Hazardous", "#991b1b", "severe"
    
    return {
        "prediction": {
            "date": date,
            "city": city,
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
        "yearly_breakdown": yearly_breakdown,
        "evaluation": {
            "method": "Historical Anchor (Probabilistic Distribution)",
            "description": f"Analyzed PM2.5 readings for days around {month_day} in {city} across {len(yearly_breakdown)} years of historical data.",
            "steps": [
                {
                    "step": 1,
                    "title": "Data Source",
                    "detail": f"Kaggle India Air Quality Dataset — {min(years_in_data)} to {max(years_in_data)} ({len(years_in_data)} years)"
                },
                {
                    "step": 2,
                    "title": "City Filter",
                    "detail": f"Filtered for {city}"
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
                    "title": "Year-by-Year Analysis",
                    "detail": f"Computed deviation from each year's annual mean to show whether {month_day} is typically worse or better than the annual average"
                },
                {
                    "step": 7,
                    "title": "Confidence Interval",
                    "detail": f"95% CI: [{round(ci[0], 1)} — {round(ci[1], 1)}]"
                },
                {
                    "step": 8,
                    "title": "Prediction Range",
                    "detail": f"10th–90th percentile: [{round(likely_range[0], 1)} — {round(likely_range[1], 1)}]"
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
