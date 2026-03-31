import sys
import os
import joblib
import numpy as np

# Ensure the root project path is available for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

try:
    from models.xgb_base import XGBBaseModel
    from models.lstm_base import LSTMBaseModel
    from models.tcn_base import TCNPredictor
    from models.gru_base import BiGRUPredictor
except ImportError:
    from ml_engine.models.xgb_base import XGBBaseModel
    from ml_engine.models.lstm_base import LSTMBaseModel
    from ml_engine.models.tcn_base import TCNPredictor
    from ml_engine.models.gru_base import BiGRUPredictor

try:
    from logic_layer import get_cpcb_category, calculate_aqi_trend, get_derived_insights, get_neural_insight_object
except ImportError:
    from ml_engine.logic_layer import get_cpcb_category, calculate_aqi_trend, get_derived_insights, get_neural_insight_object

try:
    from inference_builder import build_input_tensor
except ImportError:
    from ml_engine.inference_builder import build_input_tensor

class MetaEnsembleOrchestrator:
    def __init__(self):
        self.xgb = XGBBaseModel()
        self.lstm = LSTMBaseModel()
        self.tcn = TCNPredictor()
        self.gru = BiGRUPredictor()
        
        # Load the dual parallel meta-learners natively
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.processed_data_dir = os.path.join(current_dir, "processed_data")
        
        path_a = os.path.join(current_dir, "saved_models", "meta_a_historian.pkl")
        path_b = os.path.join(current_dir, "saved_models", "meta_b_scanner.pkl")
        
        self.meta_a = joblib.load(path_a) if os.path.exists(path_a) else None
        self.meta_b = joblib.load(path_b) if os.path.exists(path_b) else None

    def predict(self, enriched_data=None, city: str = "Delhi", date: str = None, historical_mean: float = 140.0):
        """
        Run the dual meta-learner inference pipeline.
        
        If city+date are provided, build a date-aware input tensor from the
        historical CSV so that predictions change with each city/date combo.
        Falls back to X_test[0] only as a last resort.
        """
        # 1. Build the input tensor from city + date
        x_sample = enriched_data
        
        if x_sample is None and date is not None:
            x_sample = build_input_tensor(city, date)
        
        if x_sample is None:
            # Final fallback: use first test sample
            try:
                test_file = os.path.join(self.processed_data_dir, "X_test.npy")
                x_sample = np.load(test_file)[0:1]  # shape (1, 7, 21)
            except Exception:
                x_sample = None

        # 2. Base models predict in parallel
        xgb_pred = self.xgb.predict(x_sample)
        lstm_pred_scaled = self.lstm.predict(x_sample) if x_sample is not None else 0.5
        tcn_pred_scaled = self.tcn.predict(x_sample) if x_sample is not None else 0.5
        gru_pred_scaled = self.gru.predict(x_sample) if x_sample is not None else 0.5
        
        # Inverse transform
        try:
            from logic_layer import inverse_transform_aqi
        except ImportError:
            from ml_engine.logic_layer import inverse_transform_aqi
            
        lstm_pred = inverse_transform_aqi(lstm_pred_scaled)
        tcn_pred = inverse_transform_aqi(tcn_pred_scaled)
        gru_pred = inverse_transform_aqi(gru_pred_scaled)

        # 3. Parallel Meta-Learner Execution
        X_A = np.array([[xgb_pred, lstm_pred, tcn_pred]])
        X_B = np.array([[xgb_pred, gru_pred, tcn_pred]])
        
        consensus_a = float(self.meta_a.predict(X_A)[0]) if self.meta_a else xgb_pred
        consensus_b = float(self.meta_b.predict(X_B)[0]) if self.meta_b else xgb_pred

        # 4. Categorization logic
        cat_a = get_cpcb_category(consensus_a)
        cat_b = get_cpcb_category(consensus_b)
        trend_a = calculate_aqi_trend(consensus_a, historical_mean)
        trend_b = calculate_aqi_trend(consensus_b, historical_mean)
        
        # 5. Weights calculation
        weights_a = {}
        if self.meta_a and hasattr(self.meta_a, "feature_importances_"):
            imp = self.meta_a.feature_importances_
            weights_a = {"xgb": round(float(imp[0]), 4), "lstm": round(float(imp[1]), 4), "tcn": round(float(imp[2]), 4)}
            
        weights_b = {}
        if self.meta_b and hasattr(self.meta_b, "feature_importances_"):
            imp = self.meta_b.feature_importances_
            weights_b = {"xgb": round(float(imp[0]), 4), "gru": round(float(imp[1]), 4), "tcn": round(float(imp[2]), 4)}

        # 6. Return Dual Payload
        return {
            "meta_a_consensus": round(consensus_a, 2),
            "meta_b_consensus": round(consensus_b, 2),
            "meta_a_category": cat_a,
            "meta_b_category": cat_b,
            "meta_a_trend": trend_a,
            "meta_b_trend": trend_b,
            "meta_a_weights": weights_a,
            "meta_b_weights": weights_b,
            # Common output for other cards
            "xgb_aqi":  round(xgb_pred,  2),
            "lstm_aqi": round(lstm_pred, 2),
            "gru_aqi":  round(gru_pred,  2),
            "method6_aqi": round(gru_pred, 2),
            "tcn_aqi":  round(tcn_pred,  2),
            "method7_aqi": round(tcn_pred, 2),
            # General fallbacks to keep UI un-broken for other legacy components
            "trend": trend_a,
            "category": cat_a,
            "meta_aqi": round(consensus_a, 2),
            "aqi": round(consensus_a, 2),
            "weights": weights_a,  # fallback
            
            "insights": {
                "xgb":  get_derived_insights("xgb"),
                "lstm": get_derived_insights("lstm"),
                "gru":  get_derived_insights("gru"),
                "tcn":  get_derived_insights("tcn"),
            },
            "neural_insights": {
                "xgb":  get_neural_insight_object("xgb",  xgb_pred),
                "lstm": get_neural_insight_object("lstm", lstm_pred),
                "gru":  get_neural_insight_object("gru",  gru_pred),
                "tcn":  get_neural_insight_object("tcn",  tcn_pred),
            }
        }
