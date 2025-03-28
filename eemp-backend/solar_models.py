from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from location_models import LocationData
from device_models import Device
from weather_models import WeatherData,WeatherDataFull
from temperature_models import CustomTempModelParams



class CustomSolarModule(BaseModel):
    name: str
    pdc0: float
    gamma_pdc: float
    bvoco: float
    bvmpo: float
    impo: float
    vmpo: float
    pmpo: float
    a_c: float
    n_s: float
    t_noct: float

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




class SolarPanelData(BaseModel):
    inverter_name: str | None = None
    module_name: str | None = None
    tilt: float
    orientation: float
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
    weather_data: Optional[List[WeatherData]] = None


class PromptRequest(BaseModel):
    solar_panel_data: Optional[SolarPanelData] | None = None
    devices: Optional[List[Device]] | None = None
    location: LocationData
    weather_data: Optional[List[WeatherDataFull]] | None = None

    def __str__(self):

        weather_str = "\n".join(str(w) for w in self.weather_data) if self.weather_data else "No weather data currently"


        devices_str = "\n".join(f"- {device}" for device in self.devices) if self.devices else "No devices currently"


        solar_panel_str = str(self.solar_panel_data) if self.solar_panel_data else "No solar panels currently"

        return f"""
        Energy Optimization Analysis Request
        ------------------------------------
        📍 Location: {self.location}

        ☀️ Solar Panel System:
        {solar_panel_str}

        🌦️ Weather Forecast:
        {weather_str}

        💡 Devices in Use:
        {devices_str}
        ------------------------------------
        """