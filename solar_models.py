from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class LocationData(BaseModel):
    name: str
    latitude: float
    longitude: float
    altitude: float
    country: str | None = None
    timezone: str | None = None

class CustomSolarModule(BaseModel):
    name: str
    pdc0: float     #DC power at reference conditions (in watts)
    gamma_pdc: float # Temperature coefficient of power (1/°C)
    bvoco: float    # Open-circuit voltage temperature coefficient (1/°C)
    bvmpo: float    # Voltage at max power temperature coefficient (1/°C)
    impo: float     # Current at max power (A)
    vmpo: float     # Voltage at max power (V)
    pmpo: float     # Maximum power output (W)
    a_c: float      # Area of the module (m²)
    n_s: float      # Number of cells in the module
    t_noct: float   # Nominal operating cell temperature (°C)

class CustomInverter(BaseModel):
    name: str
    pdc0: float
    paco: float
    pdco: float
    vdco: float
    pso: float
    c0: float
    c1: float
    c2: float
    c3: float

class CustomTempModelParams(BaseModel):
    u_c: float
    u_v: float
    eta_m: float
    alpha_absorption: float

class WeatherData(BaseModel):
    datetime: datetime
    temperature: float
    wind_speed: float
    ghi: float
    dhi: float
    dni: float

class SolarPanelData(BaseModel):
    inverter_name: str | None = None
    module_name: str | None = None
    location: LocationData
    tilt: float # tilt in degrees
    orientation: float # == azimuth
    custom_solar_module: CustomSolarModule | None = None
    custom_inverter: CustomInverter | None = None
    custom_temp_model_params: CustomTempModelParams | None = None

class DateRange(BaseModel):
    start_datetime: datetime
    end_datetime: datetime

class EnergyCalculationRequest(BaseModel):
    solar_panel_data: SolarPanelData
    weather_data: Optional[List[WeatherData]] = None  # Optional for partial data
