from solar_models import WeatherDataFull
from typing import List

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