from typing import List
from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
from pvlib.pvsystem import retrieve_sam
from models import SolarPanelData, WeatherData
from solar import calculate_energy
import pandas as pd

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
    solar_panel_data: SolarPanelData,
    weather_data: List[WeatherData]
):
    # Convert weather data to DataFrame
    weather_dict = [data.model_dump() for data in weather_data]
    weather_df = pd.DataFrame(weather_dict)

    # Convert 'datetime' column to datetime objects and set as index
    weather_df['datetime'] = pd.to_datetime(weather_df['datetime'])
    weather_df.set_index('datetime', inplace=True)

    energy_output = await calculate_energy(request, solar_panel_data, weather_df)
    return {"energy_output": energy_output.to_dict()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
