import os
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, "processed_data")
    save_dir = os.path.join(current_dir, "saved_models")
    os.makedirs(save_dir, exist_ok=True)
    
    # Load 4-dimensional meta dataset from Phase 17: [XGB, LSTM, GRU, TCN]
    meta_X = np.load(os.path.join(data_dir, "meta_X.npy"))
    meta_y = np.load(os.path.join(data_dir, "meta_y.npy"))
    
    # Model A (Historian): Inputs [XGB, Bi-LSTM, TCN] -> indices 0, 1, 3
    X_A = meta_X[:, [0, 1, 3]]
    
    # Model B (Scanner): Inputs [XGB, Bi-GRU, TCN] -> indices 0, 2, 3
    X_B = meta_X[:, [0, 2, 3]]
    
    print("Training META-A: The Deep Historian...")
    model_a = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
    model_a.fit(X_A, meta_y)
    path_a = os.path.join(save_dir, "meta_a_historian.pkl")
    joblib.dump(model_a, path_a)
    print(f"Meta-A saved to {path_a}")
    
    print("\nTraining META-B: The Agile Scanner...")
    model_b = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=43)
    model_b.fit(X_B, meta_y)
    path_b = os.path.join(save_dir, "meta_b_scanner.pkl")
    joblib.dump(model_b, path_b)
    print(f"Meta-B saved to {path_b}")

    print("\n--- Weights ---")
    imp_a = model_a.feature_importances_
    print(f"Meta-A [XGB, LSTM, TCN]: {imp_a[0]:.2f}, {imp_a[1]:.2f}, {imp_a[2]:.2f}")
    
    imp_b = model_b.feature_importances_
    print(f"Meta-B [XGB, GRU, TCN]:  {imp_b[0]:.2f}, {imp_b[1]:.2f}, {imp_b[2]:.2f}")

if __name__ == "__main__":
    main()
