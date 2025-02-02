import redis
import json
import hashlib
from openweatherapi_service import get_weather
from solar_models import LocationData

redis_client = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)


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
