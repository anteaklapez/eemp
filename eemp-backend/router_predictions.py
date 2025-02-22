from typing import List
from zoneinfo import ZoneInfo

import joblib
import pandas as pd
import xgboost as xgb
import json
from redis_service import get_daily_weather_data, get_hourly_weather_data
from solar_models import SolarPanelData
from openweatherapi_service import parse_hourly_response, parse_daily_response
from solar_calc_service import calculate_radiation
from fastapi import APIRouter
from device_models import Device, PredictionRequest
from location_models import LocationData

router = APIRouter()

# Load the trained XGBoost model
model = xgb.Booster()
model.load_model('./ml_models/trained_model.json')

# Load the saved encoder and scaler
encoder = joblib.load('./ml_models/encoder.pkl')
scaler = joblib.load('./ml_models/scaler.pkl')

features_to_scale = ['latitude', 'longitude', 'average_consumption', 'temperature',
                     'radiation_direct_horizontal', 'radiation_diffuse_horizontal']


# New consumption calculation functions
def calculate_hourly_consumption(devices: List[Device], start_date: str, tz: ZoneInfo, hours: int = 48) -> pd.Series:
    """Calculate total kW consumption for each hour in 48-hour period"""
    start = pd.Timestamp(start_date).tz_localize(tz)
    end = start + pd.Timedelta(hours=hours)
    index = pd.date_range(start=start, periods=hours, freq='h', tz=tz)
    consumption = pd.Series(0.0, index=index, name='consumption')

    for device in devices:
        # Convert power values to kW
        active_power = device.powerRating.value / 1000
        standby_power = device.standbyPower.value / 1000
        num_devices = device.numberOfDevices

        # Initialize active duration matrix
        active_duration = pd.Series(0.0, index=index)

        # Calculate active times
        for usage in device.usagePattern.usage_times:
            usage_start = pd.Timestamp(usage.start).tz_convert(tz)
            usage_end = pd.Timestamp(usage.end).tz_convert(tz)

            # Clip to prediction window
            if usage_end <= start or usage_start >= end:
                continue

            # Calculate overlapping hours
            overlap_start = max(usage_start, start)
            overlap_end = min(usage_end, end)

            # Create range of affected hours
            hours_in_usage = pd.date_range(
                start=overlap_start.floor('h'),
                end=overlap_end.ceil('h'),
                freq='h',
                inclusive='left'
            )

            # Calculate duration per hour
            for hour in hours_in_usage:
                if hour not in active_duration.index:
                    continue
                hour_start = hour
                hour_end = hour + pd.Timedelta(hours=1)

                # Calculate overlap duration
                duration_start = max(overlap_start, hour_start)
                duration_end = min(overlap_end, hour_end)
                duration = (duration_end - duration_start).total_seconds() / 3600

                active_duration[hour] += duration

        # Calculate consumption (active + standby)
        standby_duration = 1 - active_duration.clip(0, 1)
        device_consumption = (active_duration * active_power + standby_duration * standby_power) * num_devices
        consumption += device_consumption

    return consumption.round(3)


def calculate_daily_consumption(hourly_consumption: pd.Series) -> pd.Series:
    """Convert hourly consumption to daily totals"""
    return hourly_consumption.resample('d').sum().round(3)


# Modified forecast preparation functions
def prepare_hourly_forecast(location: LocationData,
                            hourly_consumption: pd.Series,
                            weather_df: pd.DataFrame) -> pd.DataFrame:
    """Prepares DataFrame for hourly forecast using actual consumption"""
    # Align weather data with consumption index
    weather_df = weather_df.reindex(hourly_consumption.index, method='ffill')

    rows = []
    for timestamp, row in weather_df.iterrows():
        rows.append({
            'temperature': row['temperature'],
            'radiation_direct_horizontal': row['dni'],
            'radiation_diffuse_horizontal': row['dhi'],
            'latitude': location.latitude,
            'longitude': location.longitude,
            'average_consumption': hourly_consumption[timestamp],
            'time': timestamp,
            'country': location.country
        })
    return pd.DataFrame(rows)


def prepare_daily_forecast(location: LocationData,
                           daily_consumption: pd.Series,
                           weather_df: pd.DataFrame) -> pd.DataFrame:
    """Prepares DataFrame for daily forecast using actual consumption"""
    # Resample weather to daily
    daily_weather = weather_df.resample('d').mean()

    # Align with consumption data
    daily_weather = daily_weather.reindex(daily_consumption.index, method='ffill')

    rows = []
    for timestamp, row in daily_weather.iterrows():
        rows.append({
            'temperature': row['temperature'],
            'radiation_direct_horizontal': row['dni'],
            'radiation_diffuse_horizontal': row['dhi'],
            'latitude': location.latitude,
            'longitude': location.longitude,
            'average_consumption': daily_consumption[timestamp],
            'time': timestamp + pd.Timedelta(hours=12),
            'country': location.country
        })
    return pd.DataFrame(rows)


# Modified prediction endpoints
@router.post('/consumption/hourly')
async def predict_hourly(request: PredictionRequest):
    # Calculate consumption
    tz = ZoneInfo(request.location.timezone)
    hourly_consumption = calculate_hourly_consumption(
        request.devices,
        request.start_date,
        tz
    )

    # Get weather data
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

def predict_consumption_hourly(location: LocationData, consumption: float):
    """Predict consumption for 48-hour hourly forecast"""
    # Get cached hourly data
    hourly_weather = get_hourly_weather_data(location)
    weather_parsed = parse_hourly_response(hourly_weather, location.timezone)
    weather_full = calculate_radiation(SolarPanelData(tilt=30, orientation=180), weather_parsed, location)
    df_forecast = prepare_hourly_forecast(location, consumption, weather_full)
    return make_predictions(df_forecast)


def predict_consumption_daily(location: LocationData, consumption: float):
    """Predict consumption for 7-day daily forecast"""
    # Get cached daily data
    daily_weather = get_daily_weather_data(location)
    weather_parsed = parse_daily_response(daily_weather, location.timezone)
    weather_full = calculate_radiation(SolarPanelData(tilt=30, orientation=180), weather_parsed, location)

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

    return {"energy_output": energy_output}


