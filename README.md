# Veridian - Nature's Intelligence

Veridian is a **tri-stack application** combining a **Next.js Frontend**, a **FastAPI Backend**, and a **Python ML Engine** to predict and simulate air pollution mitigation using real 10-year historical data.

## 🚀 Quick Start Guide

You need to run **three** components to use the full application.

---

### 1. Setup the ML Engine (One-time)

The ML Engine uses **10 years of Kaggle pollution data** to provide probabilistic forecasts.

#### Install Dependencies
```bash
pip install -r requirements.txt
```

#### Configure API Key (Optional)
If you have an **OpenAQ API Key** for real-time data:
1. Create a `.env` file in `ml_engine/`:
   ```bash
   cd ml_engine
   copy .env.example .env
   ```
2. Edit `.env` and add your key:
   ```
   OPENAQ_API_KEY=your_actual_key_here
   ```

#### Test the ML Engine
```bash
python ml_engine/main.py
```
You should see output like:
```
[Historical Anchor Results]
Target Date: 2025-01-18
Mean AQI: 267.46
Likely Range (10th-90th percentile): (90.16, 444.07)
```

---

### 2. Start the Backend API (Python)

This powers the FastAPI server that the frontend calls.

1. Open a terminal in the root folder: `Veridian and Direction`
2. Run the server:
   ```bash
   uvicorn api:app --reload
   ```
   ✅ The API will start at: `http://127.0.0.1:8000`

---

### 3. Start the Frontend (Next.js)

This runs the visual website.

1. Open a **new** terminal
2. Navigate to the app folder:
   ```bash
   cd veridian-app
   ```
3. Install dependencies (only needed once):
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
   ✅ The Website will be live at: `http://localhost:3000`

---

## 🌟 Features

- **Home**: Immersive storytelling of the pollution crisis.
- **Insights**: Real-time pollution data (Search any city).
- **Little Ahead**: AI-driven pollution forecast using **Dual-Path Prediction**:
  - **Method 1 (Historical Anchor)**: 10-year probabilistic baseline
  - **Method 2 (Adaptive Brain)**: DTW trend pattern matching *(in progress)*
- **Simulate**: Interactive map to deploy "Liquid Trees" and see their impact.

---

## 📁 Project Structure

```
Veridian and Direction/
├── data/
│   └── city_day.csv           # Kaggle India Air Quality (2015-2024)
├── ml_engine/                  # ML Prediction Engine
│   ├── main.py                 # Method 1: Historical Anchor
│   ├── trend_matching.py       # Method 2: DTW (In Progress)
│   └── .env                    # API Keys
├── api.py                      # FastAPI Backend
├── fetch_data.py               # Data fetching utilities
├── train_model.py              # Legacy Prophet model
├── requirements.txt            # Python dependencies
└── veridian-app/               # Next.js Frontend
    ├── src/
    │   ├── app/                # Pages (home, insights, simulate)
    │   └── components/         # Reusable UI components
    └── package.json
```

---

## 🧪 Testing the ML Engine

To test Method 1 (Historical Anchor) for a specific date:

```python
# In ml_engine/main.py, modify the test date at the bottom:
calculate_probabilistic_stats(delhi_df, '2026-02-15')
```

Then run:
```bash
python ml_engine/main.py
```

---

## 🔧 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Leaflet Maps
- **Backend**: FastAPI, Pandas, Prophet
- **ML Engine**: NumPy, SciPy, dtaidistance (DTW), scikit-learn
- **Data**: Kaggle India AQI (2015-2024), OpenAQ API
