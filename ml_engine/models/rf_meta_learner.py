import os
import joblib
from sklearn.ensemble import RandomForestRegressor
import numpy as np

class RFMetaLearner:
    def __init__(self, model_path=None):
        if model_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.model_path = os.path.join(current_dir, "..", "saved_models", "meta_rf_model.pkl")
        else:
            self.model_path = model_path
            
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
        else:
            self.model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)

    def train(self, X, y):
        self.model.fit(X, y)
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump(self.model, self.model_path)
        print(f"Meta-learner saved to {self.model_path}")

    def predict(self, xgb_pred, lstm_pred, gru_pred, tcn_pred):
        X = np.array([[xgb_pred, lstm_pred, gru_pred, tcn_pred]])
        pred = self.model.predict(X)
        return float(pred[0])
        
    def get_contributions(self):
        """Returns the feature importances (trust weights) allocated to each model"""
        if hasattr(self.model, "feature_importances_"):
            imp = self.model.feature_importances_
            return {"XGB": float(imp[0]), "LSTM": float(imp[1]), "GRU": float(imp[2]), "TCN": float(imp[3])}
        return {"XGB": 0.25, "LSTM": 0.25, "GRU": 0.25, "TCN": 0.25}

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, "..", "processed_data")
    
    meta_X = np.load(os.path.join(data_dir, "meta_X.npy"))
    meta_y = np.load(os.path.join(data_dir, "meta_y.npy"))
    
    print("Training RF Meta-Learner Judge...")
    learner = RFMetaLearner()
    learner.train(meta_X, meta_y)
    
    importances = learner.get_contributions()
    print(f"Model Contributions - XGB: {importances['XGB']:.2f}, LSTM: {importances['LSTM']:.2f}, GRU: {importances['GRU']:.2f}, TCN: {importances['TCN']:.2f}")
