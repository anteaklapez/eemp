
from zoneinfo import ZoneInfo
from prediction_service import calculate_hourly_consumption,calculate_daily_consumption,prepare_hourly_forecast,prepare_daily_forecast,make_predictions

import numpy as np

import joblib
import pandas as pd

from fastapi import APIRouter
from redis_service import get_daily_weather_data, get_hourly_weather_data
from solar_models import SolarPanelData
from openweatherapi_service import parse_hourly_response, parse_daily_response
from solar_calc_service import calculate_radiation
from device_models import PredictionRequest
from location_models import LocationData

router = APIRouter()


EXPECTED_FEATURES = [
    'latitude', 'longitude', 'average_consumption', 'temperature',
    'radiation_direct_horizontal', 'radiation_diffuse_horizontal',
    'hour', 'day_of_week', 'month',
    'country_Austria', 'country_Belgium', 'country_Denmark', 'country_France',
    'country_Germany', 'country_Ireland', 'country_Italy', 'country_Luxembourg',
    'country_Netherlands', 'country_Norway', 'country_Portugal', 'country_Spain',
    'country_Sweden', 'country_Switzerland', 'country_United Kingdom'
]



@router.post('/consumption/hourly')
async def predict_hourly(request: PredictionRequest):

    tz = ZoneInfo(request.location.timezone)
    hourly_consumption = calculate_hourly_consumption(
        request.devices,
        request.start_date,
        tz
    )


    hourly_weather = get_hourly_weather_data(request.location)
    weather_parsed = parse_hourly_response(hourly_weather, request.location.timezone)
    weather_full = calculate_radiation(
        SolarPanelData(tilt=30, orientation=180, number_of_strings=0, modules_per_string=0),
        weather_parsed,
        request.location
    )


    df_forecast = prepare_hourly_forecast(
        request.location,
        hourly_consumption,
        weather_full
    )
    return make_predictions(df_forecast)


@router.post('/consumption/daily')
async def predict_daily(request: PredictionRequest):

    tz = ZoneInfo(request.location.timezone)
    hourly_consumption = calculate_hourly_consumption(
        request.devices,
        request.start_date,
        tz,
        hours=7 * 24
    )
    daily_consumption = calculate_daily_consumption(hourly_consumption)


    daily_weather = get_daily_weather_data(request.location)
    weather_parsed = parse_daily_response(daily_weather, request.location.timezone)
    weather_full = calculate_radiation(
        SolarPanelData(tilt=30, orientation=180, number_of_strings=0, modules_per_string=0),
        weather_parsed,
        request.location
    )


    df_forecast = prepare_daily_forecast(
        request.location,
        daily_consumption,
        weather_full
    )
    return make_predictions(df_forecast)
