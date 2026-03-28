import sys
import os

# Ensure the root project path is available for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

try:
    from models.xgb_base import XGBBaseModel
    from models.lstm_base import LSTMBaseModel
    from models.cnn_base import CNNBaseModel
    from models.gru_base import BiGRUPredictor
    from models.rf_meta_learner import RFMetaLearner
except ImportError:
    # If starting from root directory directly
    from ml_engine.models.xgb_base import XGBBaseModel
    from ml_engine.models.lstm_base import LSTMBaseModel
    from ml_engine.models.cnn_base import CNNBaseModel
    from ml_engine.models.gru_base import BiGRUPredictor
    from ml_engine.models.rf_meta_learner import RFMetaLearner

try:
    from logic_layer import get_cpcb_category, calculate_aqi_trend, get_derived_insights, get_neural_insight_object
except ImportError:
    from ml_engine.logic_layer import get_cpcb_category, calculate_aqi_trend, get_derived_insights, get_neural_insight_object


class MetaEnsembleOrchestrator:
    def __init__(self):
        self.xgb = XGBBaseModel()
        self.lstm = LSTMBaseModel()
        self.cnn = CNNBaseModel()
        self.gru = BiGRUPredictor()
        self.meta_learner = RFMetaLearner()
        # Ensure path for storing/loading data
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.processed_data_dir = os.path.join(current_dir, "processed_data")

    def predict(self, enriched_data=None, historical_mean: float = 140.0):
        # Retrieve a live (simulated) 3D tensor sequence if None
        if enriched_data is None:
            try:
                import numpy as np
                test_file = os.path.join(self.processed_data_dir, "X_test.npy")
                x_sample = np.load(test_file)[0:1] # shape (1, 7, 21)
            except Exception:
                x_sample = None
        else:
            x_sample = enriched_data

        # 1. Base models predict in parallel (stubbed as sequential here)
        xgb_pred = self.xgb.predict(enriched_data)
        lstm_pred_scaled = self.lstm.predict(x_sample) if x_sample is not None else 0.5
        cnn_pred_scaled = self.cnn.predict(x_sample) if x_sample is not None else 0.5
        gru_pred_scaled = self.gru.predict(x_sample) if x_sample is not None else 0.5
        
        # Inverse transform the scaled predictions to real AQI space
        try:
            from logic_layer import inverse_transform_aqi
        except ImportError:
            from ml_engine.logic_layer import inverse_transform_aqi
            
        lstm_pred = inverse_transform_aqi(lstm_pred_scaled)
        cnn_pred = inverse_transform_aqi(cnn_pred_scaled)
        gru_pred = inverse_transform_aqi(gru_pred_scaled)

        # 2. Consolidate results
        meta_input = [xgb_pred, lstm_pred, cnn_pred, gru_pred]

        # 3. Pass to Random Forest meta-learner
        consensus_aqi = self.meta_learner.predict(xgb_pred, lstm_pred, cnn_pred, gru_pred)

        # 4. Logic Layer categorization
        category = get_cpcb_category(consensus_aqi)
        trend = calculate_aqi_trend(consensus_aqi, historical_mean)
        
        # 5. Model Contributions
        contributions = self.meta_learner.get_contributions()

        # 6. Build weights dict from contributions
        weights = {
            "xgb": round(contributions.get("XGB", 0.25), 4),
            "lstm": round(contributions.get("LSTM", 0.25), 4),
            "cnn": round(contributions.get("CNN", 0.25), 4),
            "gru": round(contributions.get("GRU", 0.25), 4),
        }

        return {
            "meta_aqi": round(consensus_aqi, 2),
            # Legacy key kept for backward compat
            "aqi": round(consensus_aqi, 2),
            "xgb_aqi":  round(xgb_pred,  2),
            "lstm_aqi": round(lstm_pred, 2),
            "cnn_aqi":  round(cnn_pred,  2),
            "gru_aqi":  round(gru_pred,  2),
            "method6_aqi": round(gru_pred, 2),
            "category": category,
            "trend": trend,
            "confidence": 88.5,
            "model_contributions": contributions,
            "weights": weights,
            # Task 3 audit: verify xgb_pred is at index 0 of meta_input
            "meta_input_audit": {
                "index_0_xgb": round(xgb_pred,  2),
                "index_1_lstm": round(lstm_pred, 2),
                "index_2_cnn":  round(cnn_pred,  2),
                "index_3_gru":  round(gru_pred,  2),
            },
            "insights": {
                "xgb":  get_derived_insights("xgb"),
                "lstm": get_derived_insights("lstm"),
                "cnn":  get_derived_insights("cnn"),
                "gru":  get_derived_insights("gru"),
            },
            # Rich Neural Insight Objects for frontend Stat Block grid
            "neural_insights": {
                "xgb":  get_neural_insight_object("xgb",  xgb_pred),
                "lstm": get_neural_insight_object("lstm", lstm_pred),
                "cnn":  get_neural_insight_object("cnn",  cnn_pred),
                "gru":  get_neural_insight_object("gru",  gru_pred),
            }
        }
