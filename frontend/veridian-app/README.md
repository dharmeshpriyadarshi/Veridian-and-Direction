# Veridian

## Gets Started
This is the frontend for the Veridian pollution prediction platform.

### Prerequisites
- Node.js installed

### Running the App
1.  Open your terminal.
2.  Navigate to this folder:
    ```bash
    cd veridian-app
    ```
3.  Install dependencies (if you haven't):
    ```bash
    npm install
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```
5.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Backend Integration
- **Insights**: Edit `src/app/insights/page.tsx` to fetch real weather/AQI from your Python backend.
- **Little Ahead**: Edit `src/app/little-ahead/page.tsx`. Current data is in the `data` constant. Replace this with an API call to your ML model.
- **Simulate**: The map logic is in `src/app/simulate/page.tsx`.
