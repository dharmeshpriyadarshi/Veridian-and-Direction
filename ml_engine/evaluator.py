import os
import json
import numpy as np
import joblib
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from scipy import stats

def evaluate_models():
    # 1. Paths
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, "processed_data")
    save_dir = os.path.join(current_dir, "saved_models")
    
    # 2. Load Data
    meta_X = np.load(os.path.join(data_dir, "meta_X.npy"))
    meta_y = np.load(os.path.join(data_dir, "meta_y.npy"))
    
    # 3. Load Models
    model_a = joblib.load(os.path.join(save_dir, "meta_a_historian.pkl"))
    model_b = joblib.load(os.path.join(save_dir, "meta_b_scanner.pkl"))
    
    # 4. Generate Predictions
    X_A = meta_X[:, [0, 1, 3]] # [XGB, Bi-LSTM, TCN]
    X_B = meta_X[:, [0, 2, 3]] # [XGB, Bi-GRU, TCN]
    
    y_pred_a = model_a.predict(X_A)
    y_pred_b = model_b.predict(X_B)
    
    # 5. Calculate Standard Metrics
    rmse_a = float(np.sqrt(mean_squared_error(meta_y, y_pred_a)))
    mae_a = float(mean_absolute_error(meta_y, y_pred_a))
    r2_a = float(r2_score(meta_y, y_pred_a))
    sd_a = float(np.std(y_pred_a)) # Standard Deviation of predictions = Stability
    
    rmse_b = float(np.sqrt(mean_squared_error(meta_y, y_pred_b)))
    mae_b = float(mean_absolute_error(meta_y, y_pred_b))
    r2_b = float(r2_score(meta_y, y_pred_b))
    sd_b = float(np.std(y_pred_b))
    
    # 6. Paired Sample t-test (on Absolute Errors)
    errors_a = np.abs(meta_y - y_pred_a)
    errors_b = np.abs(meta_y - y_pred_b)
    
    t_stat, p_value = stats.ttest_rel(errors_a, errors_b)
    
    # Guard against NaN if errors are identical
    t_stat = float(t_stat) if not np.isnan(t_stat) else 0.0
    p_value = float(p_value) if not np.isnan(p_value) else 1.0
    
    is_significant = bool(p_value < 0.05)
    
    # Determine Winner (Lower RMSE wins)
    winner = "A" if rmse_a < rmse_b else "B"
    if rmse_a == rmse_b:
        winner = "Tie"
        
    # 7. Construct Report
    report = {
        "metrics": {
            "A": {
                "name": "The Deep Historian",
                "rmse": round(rmse_a, 2),
                "mae": round(mae_a, 2),
                "r2": round(r2_a, 4),
                "sd": round(sd_a, 2)
            },
            "B": {
                "name": "The Agile Scanner",
                "rmse": round(rmse_b, 2),
                "mae": round(mae_b, 2),
                "r2": round(r2_b, 4),
                "sd": round(sd_b, 2)
            }
        },
        "statistical_test": {
            "test_name": "Paired Sample t-test (Absolute Error Residuals)",
            "t_statistic": round(t_stat, 4),
            "p_value": round(p_value, 6),
            "is_significant": is_significant,
            "interpretation": "Statistically Significant difference in error" if is_significant else "Difference is marginal noise (Null Hypothesis holds)"
        },
        "winner": winner
    }
    
    # 8. Dump to JSON
    output_dir = os.path.join(os.path.dirname(current_dir), "data", "outputs")
    os.makedirs(output_dir, exist_ok=True)
    report_path = os.path.join(output_dir, "model_evaluation_report.json")
    
    with open(report_path, "w") as f:
        json.dump(report, f, indent=4)
        
    print(f"Evaluation complete. Report saved to {report_path}")
    print(f"Winner: {'Meta-A (Historian)' if winner == 'A' else 'Meta-B (Scanner)'} | p-value: {p_value:.6f}")

if __name__ == "__main__":
    evaluate_models()
