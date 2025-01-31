import redis
import json
from openweatherapi_service import get_weather
from solar_models import LocationData

redis_client = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)

def get_weather_data(location: LocationData):
    redis_key = f"weather:{location.latitude}:{location.longitude}"

    cached_data = redis_client.get(redis_key)
    if cached_data:
        print("Cache hit")
        return json.loads(cached_data)  # Return cached data

    print("Cache miss")
    weather_data = get_weather(location)

    # Store data in Redis with 24-hour expiration
    redis_client.setex(redis_key, 864000, json.dumps(weather_data))
    return weather_data
