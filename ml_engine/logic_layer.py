def get_cpcb_category(aqi: float) -> str:
    """
    Returns categories (Good, Satisfactory, Moderate, Poor, Very Poor, Severe)
    based on official CPCB breakpoints.
    """
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Satisfactory"
    elif aqi <= 200:
        return "Moderate"
    elif aqi <= 300:
        return "Poor"
    elif aqi <= 400:
        return "Very Poor"
    else:
        return "Severe"

def calculate_aqi_trend(current: float, historical_mean: float) -> str:
    """
    Returns a 'Trend' string (Improving, Stable, or Deteriorating).
    """
    margin = historical_mean * 0.05
    if current < (historical_mean - margin):
        return "Improving"
    elif current > (historical_mean + margin):
        return "Deteriorating"
    else:
        return "Stable"
