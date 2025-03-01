from typing import List
from zoneinfo import ZoneInfo
from functools import lru_cache
import concurrent.futures
import numpy as np

import joblib
import pandas as pd
import xgboost as xgb
from fastapi import APIRouter
from redis_service import get_daily_weather_data, get_hourly_weather_data
from solar_models import SolarPanelData
from openweatherapi_service import parse_hourly_response, parse_daily_response
from solar_calc_service import calculate_radiation
from device_models import Device, PredictionRequest
from location_models import LocationData

router = APIRouter()

# Load models and preprocessors at startup (only once)
model = xgb.Booster()
model.load_model('./ml_models/trained_model.json')
encoder = joblib.load('./ml_models/encoder.pkl')
scaler = joblib.load('./ml_models/scaler.pkl')

# Define constants
features_to_scale = ['latitude', 'longitude', 'average_consumption', 'temperature',
                     'radiation_direct_horizontal', 'radiation_diffuse_horizontal']

# Precompute expected feature columns for faster prediction
EXPECTED_FEATURES = [
    'latitude', 'longitude', 'average_consumption', 'temperature',
    'radiation_direct_horizontal', 'radiation_diffuse_horizontal',
    'hour', 'day_of_week', 'month',
    'country_Austria', 'country_Belgium', 'country_Denmark', 'country_France',
    'country_Germany', 'country_Ireland', 'country_Italy', 'country_Luxembourg',
    'country_Netherlands', 'country_Norway', 'country_Portugal', 'country_Spain',
    'country_Sweden', 'country_Switzerland', 'country_United Kingdom'
]


@lru_cache(maxsize=128)
def convert_power_to_kw(value, unit):
    """Convert power values to kW with caching for repeated conversions"""
    return value / 1000 if unit == 'W' else value


def calculate_hourly_consumption(devices: List[Device], start_date: str, tz: ZoneInfo, hours: int = 48) -> pd.Series:
    """Calculate total kW consumption for each hour in 48-hour period - optimized version"""
    start = pd.Timestamp(start_date).tz_localize(tz)
    index = pd.date_range(start=start, periods=hours, freq='h', tz=tz)
    consumption = pd.Series(0.0, index=index, name='consumption')

    # Pre-allocate arrays for all devices to avoid repeated Series creation
    all_active_durations = pd.DataFrame(0.0, index=index, columns=range(len(devices)))

    for i, device in enumerate(devices):
        # Convert power values to kW once using cached function
        active_power = convert_power_to_kw(device.powerRating.value, device.powerRating.unit)
        standby_power = convert_power_to_kw(device.standbyPower.value, device.standbyPower.unit)
        num_devices = device.numberOfDevices

        # Process all usage patterns
        for usage in device.usagePattern.usage_times:
            usage_start = pd.Timestamp(usage.start).tz_convert(tz)
            usage_end = pd.Timestamp(usage.end).tz_convert(tz)

            # Skip if usage period is outside our window
            if usage_end <= start or usage_start >= start + pd.Timedelta(hours=hours):
                continue

            # Calculate overlapping hours - vectorized approach
            overlap_start = max(usage_start, start)
            overlap_end = min(usage_end, start + pd.Timedelta(hours=hours))

            # Create range of affected hours
            hours_in_usage = pd.date_range(
                start=overlap_start.floor('h'),
                end=overlap_end.ceil('h'),
                freq='h',
                inclusive='left'
            )

            # Vectorized duration calculation for all affected hours
            for hour in hours_in_usage:
                if hour not in index:
                    continue
                hour_start = hour
                hour_end = hour + pd.Timedelta(hours=1)

                # Calculate overlap duration
                duration_start = max(overlap_start, hour_start)
                duration_end = min(overlap_end, hour_end)
                duration = (duration_end - duration_start).total_seconds() / 3600

                all_active_durations.loc[hour, i] += duration

        # Calculate consumption in one operation
        standby_duration = 1 - all_active_durations[i].clip(0, 1)
        consumption += (all_active_durations[i] * active_power + standby_duration * standby_power) * num_devices

    return consumption.round(3)


def calculate_daily_consumption(hourly_consumption: pd.Series) -> pd.Series:
    """Convert hourly consumption to daily totals"""
    return hourly_consumption.resample('d').sum().round(3)


def prepare_hourly_forecast(location: LocationData,
                            hourly_consumption: pd.Series,
                            weather_df: pd.DataFrame) -> pd.DataFrame:
    """Prepares DataFrame for hourly forecast using actual consumption - optimized"""
    # Align weather data with consumption index
    weather_df = weather_df.reindex(hourly_consumption.index, method='ffill')

    # Create DataFrame directly instead of building list of dicts
    df = pd.DataFrame({
        'temperature': weather_df['temperature'],
        'radiation_direct_horizontal': weather_df['dni'],
        'radiation_diffuse_horizontal': weather_df['dhi'],
        'latitude': location.latitude,
        'longitude': location.longitude,
        'average_consumption': hourly_consumption,
        'time': weather_df.index,
        'country': location.country
    })

    return df


def prepare_daily_forecast(location: LocationData,
                           daily_consumption: pd.Series,
                           weather_df: pd.DataFrame) -> pd.DataFrame:
    """Prepares DataFrame for daily forecast using actual consumption - optimized"""
    # Resample weather to daily
    daily_weather = weather_df.resample('d').mean()

    # Align with consumption data
    daily_weather = daily_weather.reindex(daily_consumption.index, method='ffill')

    # Create DataFrame directly
    df = pd.DataFrame({
        'temperature': daily_weather['temperature'],
        'radiation_direct_horizontal': daily_weather['dni'],
        'radiation_diffuse_horizontal': daily_weather['dhi'],
        'latitude': location.latitude,
        'longitude': location.longitude,
        'average_consumption': daily_consumption,
        'time': [ts + pd.Timedelta(hours=12) for ts in daily_weather.index],
        'country': location.country
    })

    return df


def get_data_parallel(location):
    """Fetch weather data in parallel"""
    with concurrent.futures.ThreadPoolExecutor() as executor:
        hourly_future = executor.submit(get_hourly_weather_data, location)
        daily_future = executor.submit(get_daily_weather_data, location)

        hourly_weather = hourly_future.result()
        daily_weather = daily_future.result()

    return hourly_weather, daily_weather


def make_predictions(df_forecast: pd.DataFrame):
    # Extract time-based features
    df = df_forecast.copy()
    df['hour'] = df['time'].dt.hour
    df['day_of_week'] = df['time'].dt.dayofweek
    df['month'] = df['time'].dt.month

    # Handle unknown countries
    known_countries = encoder.categories_[0]
    unknown_mask = ~df['country'].isin(known_countries)

    if unknown_mask.any():
        # Map unknown countries to a similar or neighboring country
        # Or use a default fallback country
        unknown_countries = df.loc[unknown_mask, 'country'].unique()
        print(f"Warning: Found unknown countries: {unknown_countries}. Using fallback mapping.")

        # Option: Map to geographically closest country in the training set
        # For simplicity, using a default fallback
        df.loc[unknown_mask, 'country'] = 'Germany'  # Choose an appropriate fallback

    # One-hot encode countries
    country_encoded = encoder.transform(df[['country']])
    country_features = encoder.get_feature_names_out(['country'])

    # Create prediction DataFrame with numerical features
    prediction_df = pd.DataFrame()
    for col in features_to_scale:
        prediction_df[col] = df[col]

    # Add time features
    prediction_df['hour'] = df['hour']
    prediction_df['day_of_week'] = df['day_of_week']
    prediction_df['month'] = df['month']

    # Add country features
    for i, col in enumerate(country_features):
        prediction_df[col] = country_encoded[:, i].toarray().flatten()

    # Scale features
    prediction_df[features_to_scale] = scaler.transform(df[features_to_scale])

    # Create DMatrix and predict
    dinput = xgb.DMatrix(prediction_df)
    predictions = model.predict(dinput)

    return {"energy_output": {
        df_forecast.iloc[i]['time'].strftime("%Y-%m-%dT%H:%M:%S%z"): round(float(pred), 2)
        for i, pred in enumerate(predictions)
    }}


@router.post('/consumption/hourly')
async def predict_hourly(request: PredictionRequest):
    # Calculate consumption
    tz = ZoneInfo(request.location.timezone)
    hourly_consumption = calculate_hourly_consumption(
        request.devices,
        request.start_date,
        tz
    )

    # Get weather data - using parallel fetching
    hourly_weather = get_hourly_weather_data(request.location)
    weather_parsed = parse_hourly_response(hourly_weather, request.location.timezone)
    weather_full = calculate_radiation(
        SolarPanelData(tilt=30, orientation=180),
        weather_parsed,
        request.location
    )

    # Make predictions
    df_forecast = prepare_hourly_forecast(
        request.location,
        hourly_consumption,
        weather_full
    )
    return make_predictions(df_forecast)


@router.post('/consumption/daily')
async def predict_daily(request: PredictionRequest):
    # First calculate hourly to aggregate to daily
    tz = ZoneInfo(request.location.timezone)
    hourly_consumption = calculate_hourly_consumption(
        request.devices,
        request.start_date,
        tz,
        hours=7 * 24  # 7 days
    )
    daily_consumption = calculate_daily_consumption(hourly_consumption)

    # Get weather data
    daily_weather = get_daily_weather_data(request.location)
    weather_parsed = parse_daily_response(daily_weather, request.location.timezone)
    weather_full = calculate_radiation(
        SolarPanelData(tilt=30, orientation=180),
        weather_parsed,
        request.location
    )

    # Make predictions
    df_forecast = prepare_daily_forecast(
        request.location,
        daily_consumption,
        weather_full
    )
    return make_predictions(df_forecast)
