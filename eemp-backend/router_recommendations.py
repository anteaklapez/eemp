from typing import List

from fastapi import APIRouter
from deepseek_service import get_recommendations, calculate_efficiency_gains, RecommendationResponse, \
    calculate_current_efficiency
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


import pandas as pd


@router.post('/recommendations')
async def recommendations(request: PromptRequest):
    weather = get_daily_weather_data(request.location)
    request.weather_data = parse_weather_data(weather)
    recommendations_data = await get_recommendations(request)

    # Calculate efficiency gains
    efficiency_gains = calculate_efficiency_gains(recommendations_data, request.location.timezone)

    # Calculate current efficiency
    current_efficiency = calculate_current_efficiency(request.solar_panel_data, request.devices,
                                                      request.location.timezone)

    # Calculate predicted efficiency using pandas
    predicted_efficiency = {}

    # Handle weekly data
    if current_efficiency and 'weekly' in current_efficiency and efficiency_gains and 'weekly' in efficiency_gains:
        weekly_current = pd.Series(current_efficiency['weekly'])
        weekly_gains = pd.Series(efficiency_gains['weekly'])
        weekly_predicted = weekly_current.add(weekly_gains, fill_value=0).round(1)
        predicted_efficiency['weekly'] = weekly_predicted.to_dict()
    else:
        predicted_efficiency['weekly'] = {}

    # Handle monthly data
    if current_efficiency and 'monthly' in current_efficiency and efficiency_gains and 'monthly' in efficiency_gains:
        monthly_current = pd.Series(current_efficiency['monthly'])
        monthly_gains = pd.Series(efficiency_gains['monthly'])
        monthly_predicted = monthly_current.add(monthly_gains, fill_value=0).round(1)
        predicted_efficiency['monthly'] = monthly_predicted.to_dict()
    else:
        predicted_efficiency['monthly'] = {}

    # Handle yearly data
    if current_efficiency and 'yearly' in current_efficiency and efficiency_gains and 'yearly' in efficiency_gains:
        yearly_current = pd.Series(current_efficiency['yearly'])
        yearly_gains = pd.Series(efficiency_gains['yearly'])
        yearly_predicted = yearly_current.add(yearly_gains, fill_value=0).round(1)
        predicted_efficiency['yearly'] = yearly_predicted.to_dict()
    else:
        predicted_efficiency['yearly'] = {}

    # Return recommendations, predicted efficiency, and current efficiency
    return {
        "recommendations": recommendations_data.recommendations,
        "predicted_efficiency": predicted_efficiency,
        "current_efficiency": current_efficiency
    }
