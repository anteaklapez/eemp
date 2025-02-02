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
