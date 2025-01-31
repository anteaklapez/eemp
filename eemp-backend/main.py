from fastapi import FastAPI, Request
from pvlib.pvsystem import retrieve_sam
from solar_models import EnergyCalculationRequest
from solar_calc_service import calculate_energy_with_tmy, calculate_energy, calculate_radiation
import pandas as pd
from solar_models import LocationData
from openweatherapi_service import parse_openweatherapi_response
from redis_service import get_weather_data

async def lifespan(app: FastAPI):
    app.state.sandia_modules = retrieve_sam('SandiaMod')
    app.state.cec_modules = retrieve_sam('CECMod')
    app.state.cec_inverters = retrieve_sam('cecinverter')
    yield

app = FastAPI(lifespan=lifespan)

@app.get("/")
async def read_root():
    return {"message": "Datasets loaded successfully!"}

@app.post("/calculate-energy/")
async def calculate_energy_endpoint(
    request: Request,
    energy_request: EnergyCalculationRequest
):
    """
    Endpoint to calculate energy production.
    Combines OpenWeatherAPI data with PVGIS irradiance data or simulated irradiance.
    """
    solar_panel_data = energy_request.solar_panel_data
    weather_data = get_weather_data(solar_panel_data.location)

    weather_parsed = parse_openweatherapi_response(weather_data, solar_panel_data.location.timezone)

    weather_parsed.index = pd.to_datetime(weather_parsed.index)

    weather_full = calculate_radiation(solar_panel_data, weather_parsed)
    energy_output = await calculate_energy(request, solar_panel_data, weather_full)

    return {"energy_output": energy_output.to_dict()}


@app.post("/calculate-energy-tmy/")
async def calculate_energy_tmy(request: Request, energy_request: EnergyCalculationRequest):
    solar_panel_data = energy_request.solar_panel_data
    energy_output = await calculate_energy_with_tmy(request, solar_panel_data)
    return {"energy_output": energy_output.to_dict()}

@app.post("/weather/")
async def weather_endpoint(location: LocationData):
    return get_weather_data(location)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
