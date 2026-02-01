import pandas as pd
import matplotlib.pyplot as plt

print("Loading dataset...")

df = pd.read_csv("historical_pm25.csv")

print("\nFirst rows:")
print(df.head())

print("\nChecking for missing values:")
print(df.isnull().sum())

# Convert date column
df["date"] = pd.to_datetime(df["date"])

# Sort by date
df = df.sort_values("date")

print("\nBasic statistics:")
print(df.describe())

# Plot PM2.5 trend
plt.figure()
plt.plot(df["date"], df["pm25"])
plt.title("PM2.5 Pollution Trend Over Time")
plt.xlabel("Date")
plt.ylabel("PM2.5 Level")
plt.xticks(rotation=45)
plt.tight_layout()

plt.show()
