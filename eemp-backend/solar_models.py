from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from location_models import LocationData
from device_models import Device




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

    def __hash__(self):
        return hash((
            self.name,
            self.pdc0,
            self.gamma_pdc,
            self.bvoco,
            self.bvmpo,
            self.impo,
            self.vmpo,
            self.pmpo,
            self.a_c,
            self.n_s,
            self.t_noct
        ))

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

    def __hash__(self):
        return hash((
            self.name,
            self.pdc0,
            self.paco,
            self.pdco,
            self.vdco,
            self.pso,
            self.c0,
            self.c1,
            self.c2,
            self.c3
        ))

class CustomTempModelParams(BaseModel):
    u_c: float
    u_v: float
    eta_m: float
    alpha_absorption: float

    def __hash__(self):
        return hash((
            self.u_c,
            self.u_v,
            self.eta_m,
            self.alpha_absorption
        ))

class WeatherData(BaseModel):
    datetime: datetime
    temperature: float
    wind_speed: float
    ghi: float
    dhi: float
    dni: float

    def __hash__(self):
        return hash((
            self.datetime,
            self.temperature,
            self.wind_speed,
            self.ghi,
            self.dhi,
            self.dni
        ))

class SolarPanelData(BaseModel):
    inverter_name: str | None = None
    module_name: str | None = None
    tilt: float # tilt in degrees
    orientation: float # == azimuth
    number_of_strings: int
    modules_per_string: int
    capacity: float | None = None
    efficiency: float | None = None
    installation_year: int | None = None
    custom_solar_module: CustomSolarModule | None = None
    custom_inverter: CustomInverter | None = None
    custom_temp_model_params: CustomTempModelParams | None = None

    def __str__(self):
        return (
            f"Solar System: {self.module_name or 'Custom Module'}\n"
            f"Tilt: {self.tilt}°, Orientation: {self.orientation}°\n"
            f"Capacity: {self.capacity}°, Efficiency: {self.efficiency}%\n"
            f"Inverter: {self.inverter_name or 'Custom Inverter'}"
        )

class DateRange(BaseModel):
    start_datetime: datetime
    end_datetime: datetime

class EnergyCalculationRequest(BaseModel):
    solar_panel_data: Optional[SolarPanelData] = None
    devices: Optional[List[Device]] = None
    location: LocationData
    weather_data: Optional[List[WeatherData]] = None  # Optional for partial data

class WeatherDataFull(BaseModel):
    date: int
    summary: str
    max_temp: float
    min_temp: float
    cloud_cover: int
    sunlight_hours: float
    precipitation: str  # Combined probability and amount

    def __str__(self):
        date_str = datetime.fromtimestamp(self.date).strftime("%a %b %d")
        return (
            f"Weather: {date_str} - {self.summary}\n"
            f"Max: {self.max_temp}°C, Min: {self.min_temp}°C\n"
            f"Clouds: {self.cloud_cover}%, Sun: {self.sunlight_hours}h\n"
            f"Precipitation: {self.precipitation}"
        )


class PromptRequest(BaseModel):
    solar_panel_data: SolarPanelData
    devices: List[Device]
    location: LocationData
    weather_data: Optional[List[WeatherDataFull]] = None

    def __str__(self):
        # Format weather data if present
        weather_str = "\n".join(str(w) for w in self.weather_data) if self.weather_data else "No weather data provided"

        # Format device list
        devices_str = "\n".join(f"- {device}" for device in self.devices)

        return f"""
        Energy Optimization Analysis Request
        ------------------------------------
        📍 Location: {self.location}
    
        ☀️ Solar Panel System:
        {self.solar_panel_data}
    
        🌦️ Weather Forecast:
        {weather_str}
    
        💡 Devices in Use:
        {devices_str}
        ------------------------------------
        """

