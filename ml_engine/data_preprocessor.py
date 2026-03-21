import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import joblib
import os

def create_windows(data, lookback=7, target_idx=0):
    X, y = [], []
    for i in range(len(data) - lookback):
        X.append(data[i:(i + lookback), :])
        y.append(data[i + lookback, target_idx])
    return np.array(X), np.array(y)

def main():
    # 1. Load Data
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(current_dir, "..", "data", "processed", "city_day_enriched.csv")
    
    df = pd.read_csv(csv_path)
    
    # 2. Feature Selection
    # Target is AQI. Exogenous are Wind_Speed, Temperature, Humidity. 
    # We will include all numerical features.
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if 'AQI' in numeric_cols:
        numeric_cols.remove('AQI')
        
    # Put AQI at index 0
    features = ['AQI'] + numeric_cols
    
    df = df.dropna(subset=features).copy()
    data_values = df[features].values
    
    # 3. Normalization
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(data_values)
    
    # 4. Sliding Window & Reshaping
    lookback = 7
    X, y = create_windows(scaled_data, lookback=lookback, target_idx=0)
    
    # 5. Train/Test Partitioning (80/20 chronological)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    # Verify no NaN values
    assert not np.isnan(X_train).any(), "NaN values found in X_train"
    assert not np.isnan(X_test).any(), "NaN values found in X_test"
    
    # 6. Persistent Storage
    save_dir = os.path.join(current_dir, "processed_data")
    os.makedirs(save_dir, exist_ok=True)
    
    np.save(os.path.join(save_dir, "X_train.npy"), X_train)
    np.save(os.path.join(save_dir, "X_test.npy"), X_test)
    np.save(os.path.join(save_dir, "y_train.npy"), y_train)
    np.save(os.path.join(save_dir, "y_test.npy"), y_test)
    
    joblib.dump(scaler, os.path.join(save_dir, "minmax_scaler.pkl"))
    
    # Success Metric Output
    print(f"Training tensor shape: {X_train.shape}")
    print(f"Testing tensor shape: {X_test.shape}")
    print("Verification: No NaN values exist in the final arrays.")

if __name__ == "__main__":
    main()
