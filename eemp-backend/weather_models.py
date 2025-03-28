from pydantic import BaseModel
from datetime import datetime


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


class WeatherDataFull(BaseModel):
    date: int
    summary: str
    max_temp: float
    min_temp: float
    cloud_cover: int
    sunlight_hours: float
    precipitation: str

    def __str__(self):
        date_str = datetime.fromtimestamp(self.date).strftime("%a %b %d")
        return (
            f"Weather: {date_str} - {self.summary}\n"
            f"Max: {self.max_temp}°C, Min: {self.min_temp}°C\n"
            f"Clouds: {self.cloud_cover}%, Sun: {self.sunlight_hours}h\n"
            f"Precipitation: {self.precipitation}"
        )

