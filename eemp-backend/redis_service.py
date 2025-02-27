import redis
import json
import hashlib
from openweatherapi_service import get_weather, get_daily_weather, get_hourly_weather
from location_models import LocationData
import os

redis_client = redis.StrictRedis(
    host=os.getenv('REDISHOST'),
    port=os.getenv('REDISPORT'),
    password=os.getenv('REDISPASSWORD'),
    decode_responses=True
)
def generate_cache_key(prefix: str, params: dict) -> str:
    """
    Generates a unique cache key using a prefix and a dictionary of parameters.

    Args:
        prefix (str): A prefix for the cache key (e.g., "weather", "solar_energy").
        params (dict): A dictionary containing relevant parameters.

    Returns:
        str: A unique cache key.
    """
    key_string = json.dumps(params, sort_keys=True)  # Convert dict to JSON string
    hash_digest = hashlib.md5(key_string.encode()).hexdigest()  # Create hash
    return f"{prefix}:{hash_digest}"


def get_weather_data(location: LocationData):
    """
    Fetches weather data, using Redis caching.
    """
    redis_key = generate_cache_key("weather", {
        "latitude": location.latitude,
        "longitude": location.longitude
    })

    cached_data = redis_client.get(redis_key)
    if cached_data:
        print("✅ Cache hit")
        return json.loads(cached_data)

    print("🚀 Cache miss - Fetching from OpenWeatherAPI")
    weather_data = get_weather(location)

    redis_client.setex(redis_key, 86400, json.dumps(weather_data))
    return weather_data

def get_hourly_weather_data(location: LocationData):
    """
    Fetches hourly weather data, using Redis caching.
    """
    redis_key = generate_cache_key("hourly_weather", {
        "latitude": location.latitude,
        "longitude": location.longitude
    })

    cached_data = redis_client.get(redis_key)
    if cached_data:
        print("✅ Cache hit (hourly)")
        return json.loads(cached_data)

    print("🚀 Cache miss (hourly) - Fetching from OpenWeatherAPI")
    hourly_data = get_hourly_weather(location)

    redis_client.setex(redis_key, 86400, json.dumps(hourly_data))
    return hourly_data


def get_daily_weather_data(location: LocationData):
    """
    Fetches daily weather data, using Redis caching.
    """
    redis_key = generate_cache_key("daily_weather", {
        "latitude": location.latitude,
        "longitude": location.longitude
    })

    cached_data = redis_client.get(redis_key)
    if cached_data:
        print("✅ Cache hit (daily)")
        return json.loads(cached_data)

    print("🚀 Cache miss (daily) - Fetching from OpenWeatherAPI")
    daily_data = get_daily_weather(location)

    redis_client.setex(redis_key, 86400, json.dumps(daily_data))
    return daily_data
