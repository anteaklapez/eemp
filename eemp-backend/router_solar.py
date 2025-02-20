from fastapi import APIRouter, Request
from solar_models import EnergyCalculationRequest
from solar_calc_service import calculate_energy_with_tmy, calculate_radiation, calculate_energy
from redis_service import get_daily_weather_data, get_hourly_weather_data
from openweatherapi_service import parse_daily_response, parse_hourly_response

router = APIRouter()

@router.post("/production/yearly")
async def calculate_energy_tmy(request: Request, energy_request: EnergyCalculationRequest):
    """
    Endpoint to calculate energy production using Typical Meteorological Year (TMY) data.
    Uses caching to avoid redundant calculations.
    """
    solar_panel_data = energy_request.solar_panel_data

    energy_output = await calculate_energy_with_tmy(request, solar_panel_data)

    return {"energy_output": energy_output.to_dict()}

@router.post("/production/hourly")
async def calculate_energy_hourly(request: Request, energy_request: EnergyCalculationRequest):
    """
    Endpoint for hourly energy calculations (48-hour forecast)
    """
    solar_panel_data = energy_request.solar_panel_data

    # Get cached hourly data
    hourly_weather = get_hourly_weather_data(solar_panel_data.location)
    weather_parsed = parse_hourly_response(hourly_weather, solar_panel_data.location.timezone)

    # Process radiation and calculate energy
    weather_full = calculate_radiation(solar_panel_data, weather_parsed)
    weather_full.drop(columns=["temperature"], inplace=True)
    energy_output = await calculate_energy(request, solar_panel_data, weather_full)

    return {"energy_output": energy_output}


@router.post("/production/daily")
async def calculate_energy_daily(request: Request, energy_request: EnergyCalculationRequest):
    """
    Endpoint for daily energy calculations (7-day forecast)
    """
    solar_panel_data = energy_request.solar_panel_data

    # Get cached daily data
    daily_weather = get_daily_weather_data(solar_panel_data.location)
    weather_parsed = parse_daily_response(daily_weather, solar_panel_data.location.timezone)

    # Process radiation and calculate energy
    weather_full = calculate_radiation(solar_panel_data, weather_parsed)
    weather_full.drop(columns=["temperature"], inplace=True)
    energy_output = await calculate_energy(request, solar_panel_data, weather_full)

    return {"energy_output": energy_output}

