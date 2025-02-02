from fastapi import APIRouter, Request
from solar_models import EnergyCalculationRequest
from solar_calc_service import calculate_energy_with_tmy, calculate_radiation, calculate_energy
from openweatherapi_service import parse_openweatherapi_response
from redis_service import get_weather_data

router = APIRouter()

@router.post("/calculate-energy/")
async def calculate_energy_endpoint(request: Request, energy_request: EnergyCalculationRequest):
    """
    Endpoint to calculate energy production.
    Uses cached results when possible.
    """
    solar_panel_data = energy_request.solar_panel_data

    weather_data = get_weather_data(solar_panel_data.location)

    weather_parsed = parse_openweatherapi_response(weather_data, solar_panel_data.location.timezone)

    weather_full = calculate_radiation(solar_panel_data, weather_parsed)

    energy_output = await calculate_energy(request, solar_panel_data, weather_full)

    return {"energy_output": energy_output}


@router.post("/calculate-energy-tmy/")
async def calculate_energy_tmy(request: Request, energy_request: EnergyCalculationRequest):
    """
    Endpoint to calculate energy production using Typical Meteorological Year (TMY) data.
    Uses caching to avoid redundant calculations.
    """
    solar_panel_data = energy_request.solar_panel_data

    energy_output = await calculate_energy_with_tmy(request, solar_panel_data)

    return {"energy_output": energy_output.to_dict()}

