import requests
import pandas as pd

API_KEY = "a87c8e2b990acd88caab2eb206b5f1f4467e228c"
CITY = "delhi"

def fetch_aqi():
    print("Fetching historical AQI data from WAQI...")

    url = f"https://api.waqi.info/feed/{CITY}/?token={API_KEY}"
    response = requests.get(url)
    data = response.json()

    if data["status"] != "ok":
        print("API Error:", data)
        return

    forecast = data["data"]["forecast"]["daily"]["pm25"]

    rows = []

    for day in forecast:
        rows.append({
            "date": day["day"],
            "pm25": day["avg"]
        })

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])

    df.to_csv("historical_pm25.csv", index=False)

    print("Saved: historical_pm25.csv")
    print(df.head())

if __name__ == "__main__":
    fetch_aqi()
