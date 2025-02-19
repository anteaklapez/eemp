import os
from datetime import datetime

import requests
from solar_models import LocationData
from dotenv import load_dotenv
import pandas as pd
from zoneinfo import ZoneInfo
import logging as logger
load_dotenv()

api_key = os.getenv("OPENWEATHER_API_KEY")

def get_weather(location: LocationData):
    url = 'http://api.openweathermap.org/data/2.5/forecast?lat={}&lon={}&appid={}&units=metric'.format(
        location.latitude, location.longitude, api_key)
    request = requests.get(url)
    return request.json()


def parse_openweatherapi_response(weather_api_response: dict, timezone_str: str) -> pd.DataFrame:
    """
    Parses the OpenWeatherAPI response into a Pandas DataFrame.
    Now fully utilizes Redis caching from `redis_service.py`.
    """
    tz = ZoneInfo(timezone_str)
    records = weather_api_response.get('list', [])
    if not records:
        logger.warning("No weather data found in OpenWeatherAPI response.")
        return pd.DataFrame()

    # Process records efficiently
    data = [
        {
            'datetime': datetime.fromtimestamp(record['dt'], tz=ZoneInfo("UTC")).astimezone(tz),
            'temperature': record['main']['temp'],
            'wind_speed': record['wind']['speed'],
            'cloud_cover': record['clouds']['all']
        }
        for record in records
    ]

    df_weather = pd.DataFrame(data)
    if df_weather.empty:
        logger.warning("Parsed weather DataFrame is empty.")
    else:
        df_weather['datetime'] = pd.to_datetime(df_weather['datetime'])
        df_weather.set_index('datetime', inplace=True)

    return df_weather


def get_hourly_weather(location: LocationData):
    """Fetches hourly forecast for 48 hours using One Call API 3.0"""
    url = f'https://api.openweathermap.org/data/3.0/onecall?lat={location.latitude}&lon={location.longitude}&exclude=current,minutely,daily,alerts&appid={api_key}&units=metric'
    response = requests.get(url)
    return response.json()


def get_daily_weather(location: LocationData):
    """Fetches daily forecast for 7 days using One Call API 3.0"""
    url = f'https://api.openweathermap.org/data/3.0/onecall?lat={location.latitude}&lon={location.longitude}&exclude=current,minutely,hourly,alerts&appid={api_key}&units=metric'
    response = requests.get(url)
    return response.json()


def parse_hourly_response(response: dict, timezone_str: str) -> pd.DataFrame:
    """Parses hourly forecast from One Call API response"""
    tz = ZoneInfo(timezone_str)
    records = response.get('hourly', [])

    if not records:
        logger.warning("No hourly weather data found in response.")
        return pd.DataFrame()

    data = [
        {
            'datetime': datetime.fromtimestamp(record['dt'], tz=ZoneInfo("UTC")).astimezone(tz),
            'temperature': record['temp'],
            'wind_speed': record['wind_speed'],
            'cloud_cover': record['clouds']
        }
        for record in records[:48]  # First 24 entries for single day
    ]

    df = pd.DataFrame(data)
    if df.empty:
        logger.warning("Parsed hourly DataFrame is empty.")
    else:
        df['datetime'] = pd.to_datetime(df['datetime'])
        df.set_index('datetime', inplace=True)
    return df


def parse_daily_response(response: dict, timezone_str: str) -> pd.DataFrame:
    """Parses daily forecast from One Call API response"""
    tz = ZoneInfo(timezone_str)
    records = response.get('daily', [])

    if not records:
        logger.warning("No daily weather data found in response.")
        return pd.DataFrame()

    data = [
        {
            'datetime': datetime.fromtimestamp(record['dt'], tz=ZoneInfo("UTC")).astimezone(tz),
            'temperature': record['temp']['day'],
            'wind_speed': record['wind_speed'],
            'cloud_cover': record['clouds']
        }
        for record in records
    ]

    df = pd.DataFrame(data)
    if df.empty:
        logger.warning("Parsed daily DataFrame is empty.")
    else:
        df['datetime'] = pd.to_datetime(df['datetime'])
        df.set_index('datetime', inplace=True)
    return df

location = LocationData(latitude=50.503887, longitude=4.469936, country='Belgium', altitude=123, name='Belgium', timezone='Europe/Brussels')

