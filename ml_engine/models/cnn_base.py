import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv1D, MaxPooling1D, Flatten, Dense
import os

class CNNBaseModel:
    def __init__(self, input_shape=(7, 21), model_path=None):
        self.input_shape = input_shape
        if model_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.model_path = os.path.join(current_dir, "..", "saved_models", "cnn_model.keras")
        else:
            self.model_path = model_path
            
        self.model = self._build_model()
        
        if os.path.exists(self.model_path):
            try:
                self.model = tf.keras.models.load_model(self.model_path, compile=False)
                self.model.compile(optimizer='adam', loss='mse')
            except Exception as e:
                print(f"Could not load CNN model from {self.model_path}: {e}")

    def _build_model(self):
        model = Sequential([
            Conv1D(64, kernel_size=2, activation='relu', input_shape=self.input_shape),
            MaxPooling1D(pool_size=2),
            Flatten(),
            Dense(32, activation='relu'),
            Dense(1)
        ])
        model.compile(optimizer='adam', loss='mse')
        return model

    def predict(self, x):
        # x should be shaped (1, 7, 21) or (N, 7, 21)
        preds = self.model.predict(x, verbose=0)
        return float(preds[0][0]) if len(preds) == 1 else preds
