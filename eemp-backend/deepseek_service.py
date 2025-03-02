from typing import List
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
import re
from pydantic import BaseModel, Field, ValidationError
from datetime import datetime, timedelta
import calendar
import pytz
import random

load_dotenv()
api_key = os.getenv("OPENROUTER_API_KEY")

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=api_key,
)

PROMPT_TEMPLATE = """Analyze these energy parameters and provide JSON recommendations:
{{
  "recommendations": [
    {{
      "title": "short title",
      "suggestion": "concrete advice",
      "savings_predictions": ["specific metric 1", "specific metric 2 (optional)", "specific metric 3 (optional)"],
      "efficiency": {{
        "daily": 5.5,
        "monthly": 15,
        "yearly": 180
      }}
    }}
  ]
}}

Input Data:
Location: {location}
Solar: {panel_data}
Weather: {weather_data}
Devices: {devices}

Return ONLY VALID JSON following the example format. Use numbers between 0-100 for daily and monthly efficiency percentages, and 0-1200 for yearly (no % symbol). The yearly value should represent the annualized efficiency gain. Do not add explanations."""


class Efficiency(BaseModel):
    daily: float = Field(..., ge=0, le=100, description="Daily energy savings percentage")
    monthly: float = Field(..., ge=0, le=100, description="Monthly energy savings percentage")
    yearly: float = Field(..., ge=0, le=1200, description="Yearly energy savings percentage")

class SavingsPrediction(BaseModel):
    title: str = Field(..., max_length=40)
    suggestion: str = Field(..., max_length=180)
    savings_predictions: List[str] = Field(..., min_items=1, max_items=3)
    efficiency: Efficiency  # Now using numeric values


class RecommendationResponse(BaseModel):
    recommendations: List[SavingsPrediction] = Field(..., min_items=1, max_items=10)


async def get_recommendations(request):
    try:
      prompt = PROMPT_TEMPLATE.format(
        panel_data=str(request.solar_panel_data),
        weather_data="\n\n".join(str(w) for w in request.weather_data),
        devices="\n".join(str(d) for d in request.devices),
        location=str(request.location)
      )
      completion = client.chat.completions.create(
        extra_body={},
        model="deepseek/deepseek-chat:free",
        messages=[
          {
            "role": "user",
            "content": prompt
          }
        ]
      )

      # Extract JSON from response using regex
      raw_response = completion.choices[0].message.content
      json_match = re.search(r'(?s)\{.*\}', raw_response)

      if not json_match:
        await get_recommendations(request)

      json_str = json_match.group(0)
      parsed = RecommendationResponse.model_validate_json(json_str)
      return parsed

    except (json.JSONDecodeError, ValidationError) as e:
        return {"error": f"Invalid JSON response from API: {str(e)}"}





def calculate_efficiency_gains(recommendations_data, timezone="Europe/Berlin"):
    """
    Calculate efficiency gains for different time periods with realistic variations.

    Args:
        recommendations_data: A RecommendationResponse Pydantic model or dict
        timezone: The timezone string of the user's location

    Returns a dictionary with timestamped efficiency gains
    """
    # Get current date in the user's timezone
    try:
        tz = pytz.timezone(timezone)
        current_date = datetime.now(tz)
    except pytz.exceptions.UnknownTimeZoneError:
        # Fallback to UTC if timezone is invalid
        tz = pytz.UTC
        current_date = datetime.now(tz)
        print(f"Unknown timezone: {timezone}, falling back to UTC")

    results = {
        "weekly": {},
        "monthly": {},
        "yearly": {}
    }

    # Ensure we're working with the right data structure
    if isinstance(recommendations_data, dict) and "recommendations" in recommendations_data:
        recommendations = recommendations_data["recommendations"]
    elif hasattr(recommendations_data, "recommendations"):
        recommendations = recommendations_data.recommendations
    else:
        return {"error": "Invalid recommendations data structure"}

    # Get base efficiency values
    if isinstance(recommendations[0], dict):
        base_daily = sum(rec["efficiency"]["daily"] for rec in recommendations)
        base_monthly = sum(rec["efficiency"]["monthly"] for rec in recommendations)
    else:
        base_daily = sum(rec.efficiency.daily for rec in recommendations)
        base_monthly = sum(rec.efficiency.monthly for rec in recommendations)

    # Define weekday patterns (e.g., weekends might have different usage patterns)
    weekday_factors = {
        0: 1.1,  # Monday
        1: 1.0,  # Tuesday
        2: 1.0,  # Wednesday
        3: 1.0,  # Thursday
        4: 1.1,  # Friday
        5: 0.9,  # Saturday
        6: 0.8,  # Sunday
    }

    # Define seasonal factors for months
    seasonal_factors = {
        1: 0.8,  # January
        2: 0.85,  # February
        3: 0.9,  # March
        4: 1.0,  # April
        5: 1.1,  # May
        6: 1.2,  # June
        7: 1.2,  # July
        8: 1.15,  # August
        9: 1.05,  # September
        10: 0.95,  # October
        11: 0.85,  # November
        12: 0.8,  # December
    }

    # Calculate weekly gains (7 days) with daily variations
    for day in range(7):
        # Calculate date for this day
        day_date = current_date + timedelta(days=day)
        # Format timestamp in ISO 8601 with the correct timezone offset
        timestamp = day_date.strftime("%Y-%m-%dT12:00:00%z")
        # Insert colon in timezone offset (e.g., +0100 -> +01:00) for ISO 8601 compliance
        timestamp = f"{timestamp[:-2]}:{timestamp[-2:]}"

        # Apply weekday factor and small random variation
        weekday = day_date.weekday()
        daily_factor = weekday_factors.get(weekday, 1.0)
        random_factor = 1.0 + random.uniform(-0.05, 0.05)  # ±5% random variation

        daily_total = base_daily * daily_factor * random_factor
        results["weekly"][timestamp] = round(daily_total, 1)

    # Calculate monthly gains (30 days) with daily variations and cumulative effect
    cumulative_factor = 1.0
    for day in range(30):
        # Calculate date for this day
        day_date = current_date + timedelta(days=day)
        # Format timestamp in ISO 8601 with the correct timezone offset
        timestamp = day_date.strftime("%Y-%m-%dT12:00:00%z")
        # Insert colon in timezone offset (e.g., +0100 -> +01:00) for ISO 8601 compliance
        timestamp = f"{timestamp[:-2]}:{timestamp[-2:]}"

        # Apply weekday factor, small random variation, and small cumulative improvement
        weekday = day_date.weekday()
        daily_factor = weekday_factors.get(weekday, 1.0)
        random_factor = 1.0 + random.uniform(-0.05, 0.05)  # ±5% random variation

        # Small cumulative improvement over time (0.5% per day)
        cumulative_factor += 0.005

        daily_total = base_daily * daily_factor * random_factor * cumulative_factor
        results["monthly"][timestamp] = round(daily_total, 1)

    # Calculate yearly gains (12 months) with seasonal variations
    for month_offset in range(12):
        # Calculate target month
        target_month = (current_date.month + month_offset) % 12
        if target_month == 0:
            target_month = 12

        # Get month name
        month_name = calendar.month_name[target_month]

        # Apply seasonal factor and small random variation
        seasonal_factor = seasonal_factors.get(target_month, 1.0)
        random_factor = 1.0 + random.uniform(-0.03, 0.03)  # ±3% random variation

        monthly_total = base_monthly * seasonal_factor * random_factor
        results["yearly"][month_name] = round(monthly_total, 1)

    return results


def calculate_current_efficiency(solar_panel_data, devices, timezone="Europe/Berlin"):
    """
    Calculate current efficiency metrics with proper formatting.

    Args:
        solar_panel_data: Solar panel data
        devices: List of devices with usage patterns
        timezone: The timezone string of the user's location

    Returns a dictionary with current efficiency metrics formatted like predicted efficiency
    """
    # Get current date in the user's timezone
    try:
        tz = pytz.timezone(timezone)
        current_date = datetime.now(tz)
    except pytz.exceptions.UnknownTimeZoneError:
        # Fallback to UTC if timezone is invalid
        tz = pytz.UTC
        current_date = datetime.now(tz)
        print(f"Unknown timezone: {timezone}, falling back to UTC")

    # Calculate base efficiency values
    panel_capacity_kw = solar_panel_data.capacity / 1000  # Convert W to kW
    panel_efficiency = solar_panel_data.efficiency / 100  # Convert % to decimal
    avg_sunlight_hours = 4.5  # Assume average sunlight hours per day for Belgium
    solar_daily_production = panel_capacity_kw * panel_efficiency * avg_sunlight_hours

    # Device current energy consumption (kWh/day)
    total_device_consumption = 0
    for device in devices:
        print(device.powerRating.value)
        if device.powerRating.unit=='kW':
            power_rating_kw = device.powerRating.value            # Convert W to kW
        else:
            power_rating_kw = device.powerRating.value / 1000
        if device.standbyPower.unit == 'kW':
            standby_power_kw = device.standbyPower.value            # Convert W to kW
        else:
            standby_power_kw = device.standbyPower.value / 1000

        number_of_devices = device.numberOfDevices

        # Calculate daily usage time in hours
        daily_usage_hours = 0
        for usage in device.usagePattern.usage_times:
            start_time = datetime.fromisoformat(usage.start)
            end_time = datetime.fromisoformat(usage.end)
            usage_duration = (end_time - start_time).total_seconds() / 3600  # Convert seconds to hours
            daily_usage_hours += usage_duration

        # Average daily usage (divide by 7 days)
        avg_daily_usage = daily_usage_hours / 7

        # Calculate daily consumption for the device
        daily_consumption = (power_rating_kw * avg_daily_usage + standby_power_kw * 24) * number_of_devices
        total_device_consumption += daily_consumption

    # Calculate efficiency as percentage of consumption covered by solar
    if total_device_consumption > 0:
        efficiency_percentage = (solar_daily_production / total_device_consumption) * 100
        # Cap efficiency at 100%
        efficiency_percentage = min(efficiency_percentage, 100)
    else:
        efficiency_percentage = 100  # If no consumption, we're 100% efficient

    # Calculate net energy balance
    net_energy = solar_daily_production - total_device_consumption

    # Format the results in the same structure as predicted efficiency
    results = {
        "weekly": {},
        "monthly": {},
        "yearly": {}
    }

    # Define seasonal factors for months (solar production varies by season)
    seasonal_factors = {
        1: 0.7,  # January
        2: 0.8,  # February
        3: 0.9,  # March
        4: 1.0,  # April
        5: 1.1,  # May
        6: 1.2,  # June
        7: 1.2,  # July
        8: 1.1,  # August
        9: 1.0,  # September
        10: 0.9,  # October
        11: 0.8,  # November
        12: 0.7,  # December
    }

    # Fill in weekly data
    for day in range(7):
        day_date = current_date + timedelta(days=day)
        timestamp = day_date.strftime("%Y-%m-%dT12:00:00%z")
        timestamp = f"{timestamp[:-2]}:{timestamp[-2:]}"

        # Apply small daily variation
        daily_factor = 1.0 + ((day % 7) - 3) * 0.02  # Small variation based on day of week
        daily_efficiency = efficiency_percentage * daily_factor

        results["weekly"][timestamp] = round(daily_efficiency, 1)

    # Fill in monthly data
    for day in range(30):
        day_date = current_date + timedelta(days=day)
        timestamp = day_date.strftime("%Y-%m-%dT12:00:00%z")
        timestamp = f"{timestamp[:-2]}:{timestamp[-2:]}"

        # Apply small daily variation
        daily_factor = 1.0 + ((day % 7) - 3) * 0.02  # Small variation based on day of week
        daily_efficiency = efficiency_percentage * daily_factor

        results["monthly"][timestamp] = round(daily_efficiency, 1)

    # Fill in yearly data
    for month_offset in range(12):
        target_month = (current_date.month + month_offset) % 12
        if target_month == 0:
            target_month = 12
        month_name = calendar.month_name[target_month]

        # Apply seasonal factor for month
        seasonal_factor = seasonal_factors.get(target_month, 1.0)
        monthly_efficiency = efficiency_percentage * seasonal_factor

        results["yearly"][month_name] = round(monthly_efficiency, 1)

    return results