from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Model for power rating (watts)
class PowerRating(BaseModel):
    value: float  # Power consumption in watts (e.g., 10W, 15W)
    unit: str = "W"  # Unit of measurement (always watts)

# Model for the usage pattern of the device
class UsagePattern(BaseModel):
    frequency_unit: str  # "days" or "weeks"
    frequency_value: int  # How often the device is used (e.g., 1 per day or 3 per week)
    usage_times: List[dict]  # List of start and end timestamps

    class Config:
        # Ensure timestamps are parsed into datetime objects
        anystr_strip_whitespace = True

# Model for the standby power consumption (optional)
class StandbyPower(BaseModel):
    value: Optional[float]  # Standby power consumption in watts (e.g., 5W)
    unit: str = "W"  # Unit of measurement for standby power (default is "W")

# Model for Room categorization (room name)
class Room(BaseModel):
    roomId: str  # Unique identifier for the room (e.g., "livingRoom")
    roomName: str  # Name of the room (e.g., "Living Room", "Bedroom")

# Main model for the device
class Device(BaseModel):
    deviceId: str  # Unique identifier for the device (e.g., "bulb1")
    deviceName: str  # Name of the device (e.g., "LED Bulb")
    powerRating: PowerRating  # Power consumption details
    usagePattern: UsagePattern  # Usage pattern details
    energyType: str  # "AC" or "DC" input power type (depending on the device)
    standbyPower: Optional[StandbyPower]  # Standby power (optional)
    deviceCategory: str  # Category of the device ("lighting", "appliance", etc.)
    numberOfDevices: int  # Number of identical devices in the room
    annualEnergyConsumption: Optional[dict]  # Optional annual consumption (e.g., {"value": 438, "unit": "kWh"})
    room: Room  # Specify which room the device belongs to

    class Config:
        # Automatically parse date-time strings into Python datetime objects
        anystr_strip_whitespace = True
        json_encoders = {
            datetime: lambda v: v.isoformat()  # Encode datetime as ISO string
        }