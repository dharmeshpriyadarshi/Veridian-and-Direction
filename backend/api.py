from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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
from tsmart_module2 import extract_trajectory_vector
import pickle
import json

# Add scripts directory to path for generate_proxy
sys.path.insert(0, os.path.join(ROOT_DIR, 'scripts'))
from generate_weather_proxy import generate_proxy

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
    Includes both AQI and PM2.5 stats, plus year-by-year breakdown.
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
    
    aqi_stats = result.get("aqi")
    pm25_stats = result.get("pm25")
    
    # Use AQI as primary; fall back to PM2.5 if AQI is missing
    primary = aqi_stats if aqi_stats else pm25_stats
    primary_label = "AQI" if aqi_stats else "PM2.5"
    
    month_day = parsed.strftime("%B %d")
    target_doy = parsed.dayofyear
    
    # AQI category based on primary mean
    mean_val = primary["mean"]
    if mean_val <= 50:
        category, color, severity = "Good", "#4ade80", "low"
    elif mean_val <= 100:
        category, color, severity = "Satisfactory", "#a3e635", "satisfactory"
    elif mean_val <= 200:
        category, color, severity = "Moderate", "#facc15", "moderate"
    elif mean_val <= 300:
        category, color, severity = "Poor", "#f97316", "high"
    elif mean_val <= 400:
        category, color, severity = "Very Poor", "#ef4444", "very_high"
    else:
        category, color, severity = "Severe", "#991b1b", "severe"
    
    # ============================================================
    # YEAR-BY-YEAR BREAKDOWN — EXACT DAY VALUES (not window avg)
    # ============================================================
    yearly_breakdown = []
    years_in_data = sorted(city_df['Date'].dt.year.unique().tolist())
    has_aqi_col = 'AQI' in city_df.columns
    
    # Pre-compute DayOfYear for lookups
    city_df_indexed = city_df.copy()
    city_df_indexed['DayOfYear'] = city_df_indexed['Date'].dt.dayofyear
    
    for year in years_in_data:
        year_df = city_df_indexed[city_df_indexed['Date'].dt.year == year]
        if year_df.empty:
            continue
        
        # Year-wide stats
        year_aqi_mean = float(year_df['AQI'].mean()) if has_aqi_col else None
        year_aqi_std = float(year_df['AQI'].std()) if has_aqi_col else None
        year_pm25_mean = float(year_df['PM2.5'].mean())
        year_pm25_std = float(year_df['PM2.5'].std())
        year_total_days = len(year_df)
        
        # --- EXACT DAY lookup (not window average) ---
        # First try the exact target day-of-year
        exact_match = year_df[year_df['DayOfYear'] == target_doy]
        
        if not exact_match.empty:
            row = exact_match.iloc[0]
            exact_date = row['Date'].strftime('%Y-%m-%d')
        else:
            # Fallback: nearest day within ±3 days
            nearby = year_df[(year_df['DayOfYear'] >= target_doy - 3) & (year_df['DayOfYear'] <= target_doy + 3)]
            if nearby.empty:
                continue
            # Pick the closest day
            nearby = nearby.copy()
            nearby['_dist'] = (nearby['DayOfYear'] - target_doy).abs()
            row = nearby.sort_values('_dist').iloc[0]
            exact_date = row['Date'].strftime('%Y-%m-%d')
        
        # Read exact values from this single row
        day_aqi = float(row['AQI']) if has_aqi_col and not pd.isna(row['AQI']) else None
        day_pm25 = float(row['PM2.5']) if not pd.isna(row['PM2.5']) else None
        
        # Deviation (using AQI as primary)
        if day_aqi is not None and year_aqi_mean is not None:
            deviation = day_aqi - year_aqi_mean
            deviation_pct = ((day_aqi - year_aqi_mean) / year_aqi_mean) * 100 if year_aqi_mean != 0 else 0
            z_score = (day_aqi - year_aqi_mean) / year_aqi_std if year_aqi_std and year_aqi_std != 0 else 0
        elif day_pm25 is not None:
            deviation = day_pm25 - year_pm25_mean
            deviation_pct = ((day_pm25 - year_pm25_mean) / year_pm25_mean) * 100 if year_pm25_mean != 0 else 0
            z_score = (day_pm25 - year_pm25_mean) / year_pm25_std if year_pm25_std != 0 else 0
        else:
            continue
        
        yearly_breakdown.append({
            "year": int(year),
            "exact_date": exact_date,
            "day_aqi": round(day_aqi, 1) if day_aqi is not None else None,
            "day_pm25": round(day_pm25, 1) if day_pm25 is not None else None,
            "year_aqi_mean": round(year_aqi_mean, 1) if year_aqi_mean is not None else None,
            "year_pm25_mean": round(year_pm25_mean, 1),
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
    
    # ============================================================
    # MODULE 3: THE INTENSITY INDEX & SURGE OVERLAY
    # ============================================================
    # 1. Intensity Index Calculation: Weighted average of 10-year historical peaks for this 7-day window.
    yearly_peaks = {}
    for year in years_in_data:
        year_df = city_df_indexed[city_df_indexed['Date'].dt.year == year]
        window_df = year_df[(year_df['DayOfYear'] >= target_doy - 3) & (year_df['DayOfYear'] <= target_doy + 3)]
        if not window_df.empty and has_aqi_col:
            yearly_peaks[year] = float(window_df['AQI'].max())

    weighted_sum = 0
    weight_total = 0
    for year, peak in yearly_peaks.items():
        w = 1.2 if year in [2022, 2023, 2024] else 1.0
        weighted_sum += peak * w
        weight_total += w
    intensity_value = weighted_sum / weight_total if weight_total > 0 else (aqi_stats["mean"] if aqi_stats else 0)

    # 2. Surge Overlay Logic: Gaussian Bell Curve across 7-day window
    baseline_aqi = aqi_stats["mean"] if aqi_stats else 0
    # The max value of the surge added to the baseline should reach the IntensityValue
    surge_max = max(0, intensity_value - baseline_aqi)
    
    forecast_7_day = []
    target_dt = pd.to_datetime(date)
    for i in range(-3, 4):
        day_dt = target_dt + pd.Timedelta(days=i)
        
        # Gaussian curve focused on day 0 (the target centroid)
        # using sigma=1.2 to give a nice bell curve across 7 days
        sigma = 1.2
        surge_mag = surge_max * np.exp(- (i**2) / (2 * sigma**2))
        
        forecast_7_day.append({
            "date": day_dt.strftime('%Y-%m-%d'),
            "day_offset": i,
            "baseline": round(baseline_aqi, 1),
            "surge_magnitude": round(surge_mag, 1),
            "is_surge": bool(surge_mag > (surge_max * 0.1)), # True if surge magnitude is > 10% of max
            "predicted_aqi": round(baseline_aqi + surge_mag, 1)
        })

    # Build the prediction response
    sample_size = primary["sample_size"]
    
    return {
        "prediction": {
            "date": date,
            "city": city,
            "display_date": month_day,
            "primary_metric": primary_label,
            "predicted_aqi": round(aqi_stats["mean"], 1) if aqi_stats else None,
            "median_aqi": round(aqi_stats["median"], 1) if aqi_stats else None,
            "predicted_pm25": round(pm25_stats["mean"], 1) if pm25_stats else None,
            "median_pm25": round(pm25_stats["median"], 1) if pm25_stats else None,
            "category": category,
            "category_color": color,
            "severity": severity,
            "confidence_interval": {
                "lower": round(primary["ci_95"][0], 1),
                "upper": round(primary["ci_95"][1], 1)
            },
            "likely_range": {
                "lower": round(primary["likely_range"][0], 1),
                "upper": round(primary["likely_range"][1], 1)
            },
            "std_dev": round(primary["std_dev"], 1),
            "aqi_stats": aqi_stats,
            "pm25_stats": pm25_stats,
        },
        "forecast_7_day": forecast_7_day,
        "intensity_index": {
            "value": round(intensity_value, 1),
            "surge_max": round(surge_max, 1)
        },
        "yearly_breakdown": yearly_breakdown,
        "evaluation": {
            "method": "Historical Anchor (Probabilistic Distribution)",
            "description": f"Analyzed AQI + PM2.5 readings for days around {month_day} in {city} across {len(yearly_breakdown)} years of historical data.",
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
                    "detail": "Missing AQI & PM2.5 readings filled using Linear Interpolation"
                },
                {
                    "step": 4,
                    "title": "Date Window",
                    "detail": f"Selected ±3 days around {month_day} across all years → {sample_size} data points"
                },
                {
                    "step": 5,
                    "title": "AQI Statistics",
                    "detail": f"Mean: {aqi_stats['mean']} | Median: {aqi_stats['median']} | Std Dev: {aqi_stats['std_dev']}" if aqi_stats else "AQI data not available"
                },
                {
                    "step": 6,
                    "title": "PM2.5 Statistics",
                    "detail": f"Mean: {pm25_stats['mean']} | Median: {pm25_stats['median']} | Std Dev: {pm25_stats['std_dev']}" if pm25_stats else "PM2.5 data not available"
                },
                {
                    "step": 7,
                    "title": "Year-by-Year Deviation",
                    "detail": f"Computed Z-score deviation from each year's annual mean across {len(yearly_breakdown)} years"
                },
                {
                    "step": 8,
                    "title": "Confidence Interval",
                    "detail": f"95% CI: [{round(primary['ci_95'][0], 1)} — {round(primary['ci_95'][1], 1)}]"
                },
                {
                    "step": 9,
                    "title": "Prediction Range",
                    "detail": f"10th–90th percentile: [{round(primary['likely_range'][0], 1)} — {round(primary['likely_range'][1], 1)}]"
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


# =====================================================
# T-SMART Module 1: Historical Spikes
# =====================================================
@app.get("/tsmart/historical_spikes")
def get_historical_spikes(city: str = "Delhi"):
    """
    Returns the pre-calculated historical 7-day AQI peak drift array for a specific city.
    Used for Module 1 visualization (The Historical Drift Table).
    """
    import json
    historical_data_path = os.path.join(ROOT_DIR, 'data', 'tsmart_module1_historical.json')
    try:
        with open(historical_data_path, "r") as f:
            data = json.load(f)
        
        # If city exists in the parsed JSON, return its array, else empty array
        return data.get(city, [])
    except FileNotFoundError:
        # If the file hasn't been generated yet, just return an empty array
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================
# T-SMART Module 2: Trajectory Vector
# =====================================================
@app.get("/tsmart/trajectory_vector")
def get_trajectory_vector(city: str = "Delhi", target_date: str = "2024-01-14"):
    """
    Returns the DTW matched trajectory vector for a given city and target date.
    Analyses the preceding 14 days and matches against historical data.
    """
    # Use cached city data if available
    city_df = get_city_data(city)
    if city_df is None or city_df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for city '{city}'")
        
    try:
        # The extract_trajectory_vector function expects the full dataframe in its signature,
        # but since we already filtered it for the city, we can just pass city_df.
        # Let's adjust slightly: pass city_df directly, and tell the function it's already filtered,
        # OR we can just pass the original dataframe structure.
        # Wait, the function in tsmart_module2 does: city_df = df[df['City'] == city].copy()
        # It expects the full df! But it also works if city_df is passed as long as city column exists.
        result = extract_trajectory_vector(city_df, city=city, target_date=target_date)
        
        if "error" in result:
             raise HTTPException(status_code=400, detail=result["error"])
             
        # Format the result to match the expected API structure
        # Add the evaluation metadata
        result["evaluation"] = {
            "method": "Adaptive Brain (DTW Trend Matching)",
            "description": f"Analyzed 14-day AQI trend leading up to {target_date} in {city} and found the top {len(result['historical_matches'])} matching historical patterns.",
            "drift_velocity": result["drift_velocity"]
        }
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================
# T-SMART Module 4: The Insight Engine ("Deep Observation")
# =====================================================
class InsightRequest(BaseModel):
    drift_velocity: float
    intensity_index: float
    historical_mean: float
    centroid_dates: list[str] = []
    target_date: str
    city: str

def generate_research_narrative(req: InsightRequest) -> dict:
    """
    Synthesizes the Trajectory (Module 2) and Intensity (Module 3) data into a human-readable research narrative.
    """
    try:
        target_month = int(req.target_date.split("-")[1])
    except:
        target_month = 1

    trajectory_name = ""
    drift_summary = ""
    
    # Calculate difference between expected and current intensity
    intensity_diff = req.intensity_index - req.historical_mean
    is_high_intensity = intensity_diff > (req.historical_mean * 0.1)  # 10% higher than average
    
    # Analyze drift (negative = backwards/early shift, positive = forwards/delayed shift)
    if req.drift_velocity < -5:
        if is_high_intensity:
            trajectory_name = "Accelerated Accumulation"
            drift_summary = f"The {req.city} pollution peak is shifting forward (arriving roughly {abs(int(req.drift_velocity))} days earlier than historical norms). Combined with a dangerously high intensity value of {req.intensity_index:.1f}, this indicates a severe and prematurely forming smog wave."
        else:
            trajectory_name = "Early Dispersion"
            drift_summary = f"The historical peak is arriving earlier (by ~{abs(int(req.drift_velocity))} days), but with below-average severity, indicating early wind dispersion and atmospheric instability."
    elif req.drift_velocity > 5:
        if is_high_intensity:
            trajectory_name = "Delayed Spike Synthesis"
            drift_summary = f"The pollution peak is delayed by ~{abs(int(req.drift_velocity))} days compared to historical baselines. However, the intensity remains exceptionally high ({req.intensity_index:.1f}), indicating a massive airborne accumulation period currently deferred by meteorology."
        else:
            trajectory_name = "Stagnant Deferred Pattern"
            drift_summary = f"The expected smog peak is delayed by ~{abs(int(req.drift_velocity))} days, but the overall calculated severity remains relatively low and stable."
    else:
        if is_high_intensity:
            trajectory_name = "Intense Baseline Spike"
            drift_summary = f"The pollution pattern aligns closely with historical centroid dates (minimal drift), but the magnitude ({req.intensity_index:.1f}) is significantly higher than the 10-year historical average."
        else:
            trajectory_name = "Stable Historic Pattern"
            drift_summary = f"The atmospheric accumulation in {req.city} is highly stable, arriving perfectly on schedule with predictable historical severity."

    # Base confidence score on the magnitude of the drift. 
    # High drift = lower confidence in exact matching, but highly valuable insight.
    # If drift is minor, pattern is very confident.
    confidence = min(96, max(68, 100 - (abs(int(req.drift_velocity)) // 2)))
    
    return {
        "trajectory_name": trajectory_name,
        "drift_summary": drift_summary,
        "confidence_score": f"{confidence}%"
    }

@app.post("/tsmart/insights")
def get_tsmart_insights(req: InsightRequest):
    """
    Dynamic endpoint to synthesize Module 1-3 metrics into a textual Insight Engine output.
    """
    try:
        return generate_research_narrative(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================
# NEW: MODEL 3 SARIMAX ENDPOINT
# =====================================================
@app.post("/predict/sarimax")
def predict_sarimax(city: str, target_date: str):
    """
    Returns the SARIMAX 2026 forecast using the 10-year meteorological proxy engine.
    Also returns the 95% Confidence Intervals.
    """
    try:
        t_date = pd.to_datetime(target_date)
        if t_date < pd.to_datetime("2025-01-01"):
            raise HTTPException(status_code=400, detail="SARIMAX out-of-sample forecasting starts from 2025-01-01")
            
        # 1. Load Model Metadata to check log_transform status
        metadata_path = os.path.join(ROOT_DIR, "models", "sarimax", "model_metadata.json")
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
            
        if city not in metadata:
            raise HTTPException(status_code=404, detail=f"SARIMAX model for {city} not found.")
            
        city_meta = metadata[city]
        is_log_transformed = city_meta.get("log_transform_used", False)
        
        # 2. Load Model Object
        model_path = os.path.join(ROOT_DIR, "models", "sarimax", f"{city.lower().replace(' ', '_')}_model.pkl")
        with open(model_path, "rb") as f:
            model = pickle.load(f)
            
        # 3. Generate Weather Proxy
        # This will create a daily dataframe from 2025-01-01 up to target_date
        proxy_exog = generate_proxy(city, target_date)
        steps = len(proxy_exog) # The number of out-of-sample days
        
        # 4. Continuous State-Space Forecasting
        forecast_obj = model.get_forecast(steps=steps, exog=proxy_exog)
        predicted_mean = forecast_obj.predicted_mean
        
        # In statsmodels 0.14+, conf_int() might return a numpy array or a DataFrame
        # depending on whether the exogenous was a pandas object
        conf_int = forecast_obj.conf_int(alpha=0.05) # 95% CI
        
        if isinstance(conf_int, pd.DataFrame):
            lower_idx = conf_int.columns[0]
            upper_idx = conf_int.columns[1]
            target_lower = conf_int.iloc[-1][lower_idx]
            target_upper = conf_int.iloc[-1][upper_idx]
        else:
            # It's a numpy array
            target_lower = conf_int[-1, 0]
            target_upper = conf_int[-1, 1]
            
        # Get the target date value (the last step)
        target_pred = predicted_mean.iloc[-1] if isinstance(predicted_mean, pd.Series) else predicted_mean[-1]
        
        # 5. Transformation Inversion & Physical Bounds
        if is_log_transformed:
            target_pred = np.expm1(target_pred)
            target_lower = np.expm1(target_lower)
            target_upper = np.expm1(target_upper)
            
        # Clip at AQI = 0
        target_pred = max(0.0, float(target_pred))
        target_lower = max(0.0, float(target_lower))
        target_upper = max(0.0, float(target_upper))
        
        return {
            "model_name": "SARIMAX (1,1,1)x(1,1,1,12)",
            "city": city,
            "target_date": target_date,
            "predicted_aqi": round(target_pred, 1),
            "lower_bound": round(target_lower, 1),
            "upper_bound": round(target_upper, 1),
            "horizon_days": steps,
            "log_transformed_in_training": is_log_transformed,
            "metrics_on_test_set": city_meta.get("metrics", {})
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
