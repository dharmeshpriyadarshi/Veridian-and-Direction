import os
import numpy as np
from tensorflow.keras.callbacks import EarlyStopping
from models.lstm_base import LSTMBaseModel
from models.cnn_base import CNNBaseModel

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, "processed_data")
    save_dir = os.path.join(current_dir, "saved_models")
    os.makedirs(save_dir, exist_ok=True)
    
    print("Loading datasets from ml_engine/processed_data/...")
    try:
        X_train = np.load(os.path.join(data_dir, "X_train.npy"))
        y_train = np.load(os.path.join(data_dir, "y_train.npy"))
        X_test = np.load(os.path.join(data_dir, "X_test.npy"))
        y_test = np.load(os.path.join(data_dir, "y_test.npy"))
    except Exception as e:
        print(f"Failed to load data: {e}")
        return
    
    input_shape = X_train.shape[1:]
    es = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    
    # 1. Train LSTM
    print(f"\n--- Training LSTM Architect (Input Shape: {input_shape}) ---")
    lstm = LSTMBaseModel(input_shape=input_shape)
    lstm.model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=50,
        batch_size=32,
        callbacks=[es]
    )
    lstm_path = os.path.join(save_dir, "lstm_model.keras")
    lstm.model.save(lstm_path)
    print(f"LSTM saved to: {lstm_path}")
    
    # 2. Train CNN
    print(f"\n--- Training CNN Architect (Input Shape: {input_shape}) ---")
    cnn = CNNBaseModel(input_shape=input_shape)
    cnn.model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=50,
        batch_size=32,
        callbacks=[es]
    )
    cnn_path = os.path.join(save_dir, "cnn_model.keras")
    cnn.model.save(cnn_path)
    print(f"CNN saved to: {cnn_path}")

if __name__ == "__main__":
    import tensorflow as tf
    # Avoid TF warnings
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
    tf.get_logger().setLevel('ERROR')
    main()
