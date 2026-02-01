# Veridian - Nature's Intelligence

Veridian is a dual-stack application combining a **Next.js Frontend** and a **Python (FastAPI) Backend** to predict and simulate air pollution mitigation.

## 🚀 Quick Start Guide

You need to run **two** separate terminals to use the full application.

### 1. Start the Backend (Python)
This powers the Machine Learning model and API.

1.  Open a terminal in the root folder: `Veridian and Direction`
2.  Install dependencies (if not already installed):
    ```bash
    pip install fastapi uvicorn pandas plotly requests prophet
    ```
3.  Run the server:
    ```bash
    uvicorn api:app --reload
    ```
    ✅ The API will start at: `http://127.0.0.1:8000`

### 2. Start the Frontend (Next.js)
This runs the visual website.

1.  Open a **new** terminal.
2.  Navigate to the app folder:
    ```bash
    cd veridian-app
    ```
3.  Install dependencies (only needed once):
    ```bash
    npm install
    ```
4.  Run the development server:
    ```bash
    npm run dev -- -p 3005
    ```
    ✅ The Website will be live at: `http://localhost:3005`

---

## 🌟 Features

-   **Home**: Immersive storytelling of the pollution crisis.
-   **Insights**: Real-time pollution data (Search any city).
-   **Little Ahead**: AI-driven 10-day pollution forecast.
-   **Simulate**: Interactive map to deploy "Liquid Trees" and see their impact.

## 📁 Project Structure

-   `/` (Root): Contains Python Backend scripts (`api.py`, `train_model.py`, `fetch_data.py`).
-   `/veridian-app`: Contains the Next.js Frontend code.
