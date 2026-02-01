import pandas as pd
from prophet import Prophet

print("Loading dataset...")

df = pd.read_csv("historical_pm25.csv")

# Prophet requires specific column names:
# ds = date, y = value
df = df.rename(columns={"date": "ds", "pm25": "y"})

df["ds"] = pd.to_datetime(df["ds"])

print("Training Prophet model...")

model = Prophet()
model.fit(df)

# Create future dates (next 30 days)
future = model.make_future_dataframe(periods=30)

forecast = model.predict(future)

forecast.to_csv("forecast_results.csv", index=False)

print("Saved predictions: forecast_results.csv")
print(forecast[["ds", "yhat"]].tail())

