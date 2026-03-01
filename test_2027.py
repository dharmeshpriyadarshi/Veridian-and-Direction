import pandas as pd
import numpy as np
import os
import pickle
import json
import sys

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT_DIR, 'scripts'))
from generate_weather_proxy import generate_proxy


city = 'Delhi'
target_date = '2026-12-31'

try:
    target_dt = pd.to_datetime(target_date)
    start_forecast_dt = target_dt + pd.Timedelta(days=1)
    
    # Simulate forecast dates based on module 2 trajectory length
    forecast_dates = [ (start_forecast_dt + pd.Timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7) ]
    
    print("Forecast dates:", forecast_dates)
    end_forecast_date = forecast_dates[-1]
    
    proxy_exog = generate_proxy(city, end_forecast_date)
    sarimax_steps = len(proxy_exog)
    proxy_dates = pd.to_datetime(proxy_exog.index)
    print("Proxy dates length:", len(proxy_dates))
    print("Last 5 proxy dates:", proxy_dates[-5:])
    
    sarimax_overlay = []
    
    # Try looking up the dates
    for fd in forecast_dates:
        fd_dt = pd.to_datetime(fd)
        if fd_dt in proxy_dates:
            print(f"Match found for {fd}")
            idx = proxy_dates.get_loc(fd_dt)
            sarimax_overlay.append(fd)
        else:
            print(f"NO MATCH for {fd} in proxy dates!!")
            
except Exception as e:
    import traceback
    traceback.print_exc()

print(f"\nFinal overlay length: {len(sarimax_overlay)}")
