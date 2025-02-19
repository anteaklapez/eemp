from zoneinfo import ZoneInfo

import joblib
import pandas as pd
import xgboost as xgb
import json
from redis_service import get_daily_weather_data, get_hourly_weather_data
from solar_models import LocationData, SolarPanelData
from openweatherapi_service import parse_hourly_response, parse_daily_response
from solar_calc_service import calculate_radiation
from fastapi import APIRouter

router = APIRouter()

# Load the trained XGBoost model
model = xgb.Booster()
model.load_model('./ml_models/trained_model.json')

# Load the saved encoder and scaler
encoder = joblib.load('./ml_models/encoder.pkl')
scaler = joblib.load('./ml_models/scaler.pkl')

features_to_scale = ['latitude', 'longitude', 'average_consumption', 'temperature',
                     'radiation_direct_horizontal', 'radiation_diffuse_horizontal']


# [Keep existing model loading code unchanged]

def prepare_hourly_forecast(location: LocationData, consumption: float, weather_df: pd.DataFrame):
    """Prepares DataFrame for hourly forecast (48 hours)"""
    tz = ZoneInfo(location.timezone)

    # Create a complete hourly index for the next 48 hours
    start_time = pd.Timestamp.now(tz=tz).floor('h')
    full_index = pd.date_range(start=start_time, periods=48, freq='h', tz=tz)

    # Reindex the weather data to fill missing hours
    weather_df = weather_df.reindex(full_index, method='ffill')

    # Build rows from the properly aligned DataFrame
    rows = []
    for timestamp, row in weather_df.iterrows():
        rows.append({
            'temperature': row['temperature'],
            'radiation_direct_horizontal': row['dni'],
            'radiation_diffuse_horizontal': row['dhi'],
            'latitude': location.latitude,
            'longitude': location.longitude,
            'average_consumption': consumption,
            'time': timestamp,
            'country': location.country
        })
    return pd.DataFrame(rows)


def prepare_daily_forecast(location: LocationData, consumption: float, weather_df: pd.DataFrame):
    """Prepares DataFrame for daily forecast (7 days)"""
    tz = ZoneInfo(location.timezone)

    # Create daily index at noon for the next 7 days
    start_date = pd.Timestamp.now(tz=tz).normalize() + pd.Timedelta(hours=12)
    full_index = pd.date_range(start=start_date, periods=7, freq='d', tz=tz)

    # Resample to daily averages
    daily_df = weather_df.resample('d').mean()
    daily_df = daily_df.reindex(full_index.normalize(), method='ffill')

    # Build rows from the daily data
    rows = []
    for timestamp, row in daily_df.iterrows():
        rows.append({
            'temperature': row['temperature'],
            'radiation_direct_horizontal': row['dni'],
            'radiation_diffuse_horizontal': row['dhi'],
            'latitude': location.latitude,
            'longitude': location.longitude,
            'average_consumption': consumption,
            'time': timestamp + pd.Timedelta(hours=12),  # Set to midday
            'country': location.country
        })

    return pd.DataFrame(rows)

def predict_consumption_hourly(location: LocationData, consumption: float):
    """Predict consumption for 48-hour hourly forecast"""
    # Get cached hourly data
    hourly_weather = get_hourly_weather_data(location)
    weather_parsed = parse_hourly_response(hourly_weather, location.timezone)
    weather_full = calculate_radiation(SolarPanelData(location=location, tilt=30, orientation=180), weather_parsed)
    df_forecast = prepare_hourly_forecast(location, consumption, weather_full)
    return make_predictions(df_forecast)


def predict_consumption_daily(location: LocationData, consumption: float):
    """Predict consumption for 7-day daily forecast"""
    # Get cached daily data
    daily_weather = get_daily_weather_data(location)
    weather_parsed = parse_daily_response(daily_weather, location.timezone)
    weather_full = calculate_radiation(SolarPanelData(location=location, tilt=30, orientation=180), weather_parsed)

    df_forecast = prepare_daily_forecast(location, consumption, weather_full)
    return make_predictions(df_forecast)


def make_predictions(df_forecast: pd.DataFrame):
    """Common prediction logic for all forecast types"""
    # Extract time-based features
    df = df_forecast.copy()
    df['hour'] = df['time'].dt.hour
    df['day_of_week'] = df['time'].dt.dayofweek
    df['month'] = df['time'].dt.month

    # One-hot encoding
    country_encoded = encoder.transform(df[['country']])
    country_df = pd.DataFrame(country_encoded.toarray(),
                              columns=encoder.get_feature_names_out(['country']))
    df = pd.concat([df.reset_index(drop=True), country_df], axis=1)
    df.drop(columns=['country', 'time'], inplace=True)

    # Ensure correct feature order
    expected_features = [
        'latitude', 'longitude', 'average_consumption', 'temperature',
        'radiation_direct_horizontal', 'radiation_diffuse_horizontal',
        'hour', 'day_of_week', 'month',
        'country_Austria', 'country_Belgium', 'country_Denmark', 'country_France',
        'country_Germany', 'country_Ireland', 'country_Italy', 'country_Luxembourg',
        'country_Netherlands', 'country_Norway', 'country_Portugal', 'country_Spain',
        'country_Sweden', 'country_Switzerland', 'country_United Kingdom'
    ]
    df = df.reindex(columns=expected_features, fill_value=0)
    # Scale features
    df[features_to_scale] = scaler.transform(df[features_to_scale])

    # Make predictions
    dinput = xgb.DMatrix(df)
    predictions = model.predict(dinput)

    # Format output
    energy_output = {
        df_forecast.iloc[i]['time'].strftime("%Y-%m-%dT%H:%M:%S%z"): round(float(pred), 2)
        for i, pred in enumerate(predictions)
    }

    return json.dumps({"energy_output": energy_output})


# [Keep existing 5-day prediction code if needed for legacy support]

# Updated test example
location = LocationData(latitude=50.503887, longitude=4.469936, country='Belgium',
                        altitude=123, name='Belgium', timezone='Europe/Brussels')
consumption = 2.3

# Test hourly prediction
hourly_pred = predict_consumption_hourly(location, consumption)
print("Hourly Prediction:", hourly_pred)

# Test daily prediction
daily_pred = predict_consumption_daily(location, consumption)
print("Daily Prediction:", daily_pred)