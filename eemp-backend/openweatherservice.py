import os
import requests
from solar_models import LocationData

api_key = os.environ.get("OPENWEATHER_API_KEY")

async def get_weather(location: LocationData):
    url = 'http://api.openweathermap.org/data/2.5/forecast?lat={}&lon={}&appid={}'.format(
        location.latitude, location.longitude, api_key)
    request = requests.get(url)
    return request.json()
