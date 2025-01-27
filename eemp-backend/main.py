# main.py

from typing import List, Optional
from fastapi import FastAPI, Request, HTTPException
from contextlib import asynccontextmanager
from pvlib.pvsystem import retrieve_sam
from solar_models import SolarPanelData, WeatherData, EnergyCalculationRequest
from solar import calculate_energy_with_tmy, calculate_energy
import pandas as pd
from openweatherservice import get_weather
from solar_models import LocationData

async def lifespan(app: FastAPI):
    # Load datasets during startup
    app.state.sandia_modules = retrieve_sam('SandiaMod')
    app.state.cec_modules = retrieve_sam('CECMod')
    app.state.cec_inverters = retrieve_sam('cecinverter')
    yield
    # Perform any necessary cleanup during shutdown

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
    If weather_data is provided, it uses that; otherwise, it uses TMY data.
    """
    solar_panel_data = energy_request.solar_panel_data
    weather_data = energy_request.weather_data

    # User provided weather data
    weather_dict = [data.model_dump() for data in weather_data]
    weather_df = pd.DataFrame(weather_dict)

    # Convert 'datetime' column to datetime objects and set as index
    weather_df['datetime'] = pd.to_datetime(weather_df['datetime'])
    weather_df.set_index('datetime', inplace=True)

    energy_output = await calculate_energy(request, solar_panel_data, weather_df)

    return {"energy_output": energy_output.to_dict()}


@app.post("/calculate-energy-tmy/")
async def calculate_energy_tmy(request: Request, energy_request: EnergyCalculationRequest):
    solar_panel_data = energy_request.solar_panel_data
    energy_output = await calculate_energy_with_tmy(request, solar_panel_data)
    return {"energy_output": energy_output.to_dict()}

@app.post("/weather/")
async def weather_endpoint(location: LocationData):
    return await get_weather(location)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
