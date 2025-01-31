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
    Parses the OpenWeatherAPI response and extracts datetime, temperature, and wind_speed.
    Converts datetime to the specified timezone.

    Args:
        weather_api_response (dict): The JSON response from OpenWeatherAPI.
        timezone_str (str): Timezone string, e.g., 'Europe/Zagreb'.

    Returns:
        pd.DataFrame: DataFrame containing datetime, temperature, and wind_speed.
    """
    tz = ZoneInfo(timezone_str)
    records = weather_api_response.get('list', [])
    if not records:
        logger.warning("No weather data found in OpenWeatherAPI response.")
    data = []
    for record in records:
        try:
            # Convert UNIX timestamp to UTC datetime with timezone info
            dt_utc = datetime.fromtimestamp(record['dt'], tz=ZoneInfo("UTC"))
            # Convert UTC datetime to local timezone
            dt_local = dt_utc.astimezone(tz)
            temp = record['main']['temp']
            wind_speed = record['wind']['speed']
            cloud_cover = record['clouds']['all']

            data.append({
                'datetime': dt_local,
                'temperature': temp,
                'wind_speed': wind_speed,
                'cloud_cover': cloud_cover

            })
        except KeyError as e:
            logger.error(f"Missing key in weather data: {e}")
            continue
        except Exception as e:
            logger.error(f"Error parsing weather data: {e}")
            continue
    df_weather = pd.DataFrame(data)
    if df_weather.empty:
        logger.warning("Parsed weather DataFrame is empty.")
    else:
        # Ensure 'datetime' is of datetime type and set as index
        df_weather['datetime'] = pd.to_datetime(df_weather['datetime'])
        df_weather.set_index('datetime', inplace=True)

    return df_weather
