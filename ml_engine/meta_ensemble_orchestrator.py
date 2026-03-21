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
    from models.rf_meta_learner import RFMetaLearner
except ImportError:
    # If starting from root directory directly
    from ml_engine.models.xgb_base import XGBBaseModel
    from ml_engine.models.lstm_base import LSTMBaseModel
    from ml_engine.models.cnn_base import CNNBaseModel
    from ml_engine.models.rf_meta_learner import RFMetaLearner

try:
    from logic_layer import get_cpcb_category, calculate_aqi_trend
except ImportError:
    from ml_engine.logic_layer import get_cpcb_category, calculate_aqi_trend


class MetaEnsembleOrchestrator:
    def __init__(self):
        self.xgb = XGBBaseModel()
        self.lstm = LSTMBaseModel()
        self.cnn = CNNBaseModel()
        self.meta_learner = RFMetaLearner()

    def predict(self, enriched_data=None, historical_mean: float = 140.0):
        # 1. Base models predict in parallel (stubbed as sequential here)
        xgb_pred = self.xgb.predict(enriched_data)
        lstm_pred = self.lstm.predict(enriched_data)
        cnn_pred = self.cnn.predict(enriched_data)

        # 2. Consolidate results
        meta_input = [xgb_pred, lstm_pred, cnn_pred]

        # 3. Pass to Random Forest meta-learner
        consensus_aqi = self.meta_learner.predict(xgb_pred, lstm_pred, cnn_pred)

        # 4. Logic Layer categorization
        category = get_cpcb_category(consensus_aqi)
        trend = calculate_aqi_trend(consensus_aqi, historical_mean)

        return {
            "aqi": round(consensus_aqi, 2),
            "category": category,
            "trend": trend,
            "confidence": 88.5
        }
