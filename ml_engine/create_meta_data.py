import os
import numpy as np
from logic_layer import inverse_transform_aqi
from models.xgb_base import XGBBaseModel
from models.lstm_base import LSTMBaseModel
from models.tcn_base import TCNPredictor
from models.gru_base import BiGRUPredictor

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, "processed_data")
    
    # Load validation data
    X_test = np.load(os.path.join(data_dir, "X_test.npy"))
    y_test_scaled = np.load(os.path.join(data_dir, "y_test.npy"))
    
    print("Loading base models...")
    xgb = XGBBaseModel()
    lstm = LSTMBaseModel()
    tcn = TCNPredictor()
    gru = BiGRUPredictor()

    print("Generating predictions...")
    
    meta_X = []
    meta_y = []
    
    # Batch prediction
    lstm_preds_scaled = lstm.model.predict(X_test, verbose=0)
    tcn_preds_scaled = tcn.model.predict(X_test, verbose=0)
    gru_preds_scaled = gru.model.predict(X_test, verbose=0)
    
    for i in range(len(X_test)):
        x_i = X_test[i:i+1]
        p_xgb = xgb.predict(x_i)
        
        p_lstm = inverse_transform_aqi(float(lstm_preds_scaled[i][0]))
        p_tcn = inverse_transform_aqi(float(tcn_preds_scaled[i][0]))
        p_gru = inverse_transform_aqi(float(gru_preds_scaled[i][0]))
        
        true_aqi = inverse_transform_aqi(float(y_test_scaled[i]))
        
        meta_X.append([p_xgb, p_lstm, p_gru, p_tcn])
        meta_y.append(true_aqi)
        
    meta_X = np.array(meta_X)
    meta_y = np.array(meta_y)
    
    np.save(os.path.join(data_dir, "meta_X.npy"), meta_X)
    np.save(os.path.join(data_dir, "meta_y.npy"), meta_y)
    print(f"Meta-dataset created! X shape: {meta_X.shape}, y shape: {meta_y.shape}")

if __name__ == "__main__":
    import tensorflow as tf
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
    tf.get_logger().setLevel('ERROR')
    main()
