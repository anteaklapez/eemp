from typing import List

from fastapi import APIRouter
from deepseek_service import get_recommendations, calculate_efficiency_gains, RecommendationResponse
from solar_models import PromptRequest, WeatherDataFull
from redis_service import get_daily_weather_data

router = APIRouter()


def parse_weather_data(raw_weather: dict) -> List[WeatherDataFull]:
    parsed = []
    for day in raw_weather.get("daily", []):
        sunlight_hours = (day["sunset"] - day["sunrise"]) / 3600
        precip = f"{day['pop'] * 100}% chance"
        if day.get('rain'):
            precip += f" ({day['rain']}mm rain)"

        parsed.append(WeatherDataFull(
            date=day["dt"],
            summary=day["summary"],
            max_temp=day["temp"]["max"],
            min_temp=day["temp"]["min"],
            cloud_cover=day["clouds"],
            sunlight_hours=round(sunlight_hours, 1),
            precipitation=precip
        ))
    return parsed


@router.post('/recommendations')
async def recommendations(request: PromptRequest):
    weather = get_daily_weather_data(request.location)
    request.weather_data = parse_weather_data(weather)
    recommendations_data = await get_recommendations(request)

    # Calculate efficiency gains
    efficiency_gains = calculate_efficiency_gains(recommendations_data, request.location.timezone)

    # Return both the recommendations and efficiency gains
    return {
        "recommendations": recommendations_data.recommendations,
        "efficiency_gains": efficiency_gains
    }
