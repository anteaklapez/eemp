from fastapi import APIRouter
from location_models import LocationData
from redis_service import get_hourly_weather_data, get_daily_weather_data

router = APIRouter()

@router.post("/weather/daily")
async def weather_endpoint(location: LocationData):
    """
    Fetch weather data using OpenWeather API, using caching for optimization.
    """
    return get_daily_weather_data(location)

@router.post("/weather/hourly")
async def weather_endpoint(location: LocationData):
    """
    Fetch weather data using OpenWeather API, using caching for optimization.
    """
    return get_hourly_weather_data(location)