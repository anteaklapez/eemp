from pydantic import BaseModel


class LocationData(BaseModel):
    name: str
    latitude: float
    longitude: float
    altitude: float
    country: str | None = None
    timezone: str | None = None

    def __str__(self):
        lat_dir = 'N' if self.latitude >= 0 else 'S'
        lon_dir = 'E' if self.longitude >= 0 else 'W'
        return (
            f"{self.name}, {self.country} \n"
            f"Altitude: {self.altitude} \n"
            f"({abs(self.latitude):.4f}°{lat_dir}, {abs(self.longitude):.4f}°{lon_dir})\n"
        )