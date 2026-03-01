import pandas as pd
import numpy as np
import os
import pickle
import json
import sys

# Setup Paths to use backend models and scripts
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT_DIR, 'scripts'))
from generate_weather_proxy import generate_proxy

city = 'Delhi'
target_date = '2026-06-15'

# Replicate the exact forecast generation logic from predict_tsmart
start_forecast_dt = pd.to_datetime(target_date) + pd.Timedelta(days=1)
# Create a dummy array of length 14 to simulate the future 14-days prediction length
forecast_dates = [ (start_forecast_dt + pd.Timedelta(days=i)).strftime('%Y-%m-%d') for i in range(14) ]

end_forecast_date = forecast_dates[-1]
sarimax_overlay = []

try:
    proxy_exog = generate_proxy(city, end_forecast_date)
    sarimax_steps = len(proxy_exog)
    
    # Check what proxy_exog dates look like:
    print("Proxy Index 0:", proxy_exog.index[0], "Type:", type(proxy_exog.index[0]))
    print("Target end date:", end_forecast_date)
    
    sarimax_model_path = os.path.join(ROOT_DIR, "models", "sarimax", f"{city.lower().replace(' ', '_')}_model.pkl")
    with open(sarimax_model_path, "rb") as f:
        s_model = pickle.load(f)
        
    s_forecast = s_model.get_forecast(steps=sarimax_steps, exog=proxy_exog)
    s_mean = s_forecast.predicted_mean
    
    print("\ns_mean Index 0:", s_mean.index[0], "Type:", type(s_mean.index[0]))
    print("s_mean Index -1:", s_mean.index[-1])
    
    # Try looking up the dates
    for fd in forecast_dates:
        fd_dt = pd.to_datetime(fd)
        if fd_dt in s_mean.index:
            val = s_mean.loc[fd_dt]
            print(f"Match found for {fd}: {val}")
            
            # Simulated Meta Loading
            meta_path = os.path.join(ROOT_DIR, "models", "sarimax", "model_metadata.json")
            with open(meta_path, "r") as mf:
                m_meta = json.load(mf).get(city, {})
                if m_meta.get("log_transform_used", False):
                    val = np.expm1(val)
            sarimax_overlay.append({
                "date": fd,
                "sarimax_aqi": max(0.0, round(float(val), 1))
            })
        else:
            print(f"NO MATCH for {fd} (Looked for {fd_dt})")
            
except Exception as e:
    import traceback
    traceback.print_exc()

print(f"\nFinal overlay length: {len(sarimax_overlay)}")
