from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from solar_models import LocationData


# Add new models for request body
class PowerRating(BaseModel):
    value: float
    unit: str

class UsageTime(BaseModel):
    start: str
    end: str

class UsagePattern(BaseModel):
    frequency_unit: str
    frequency_value: int
    usage_times: List[UsageTime]

class StandbyPower(BaseModel):
    value: float
    unit: str

class Room(BaseModel):
    roomId: str
    roomName: str

class Device(BaseModel):
    deviceId: str
    deviceName: str
    powerRating: PowerRating
    usagePattern: UsagePattern
    energyType: str
    standbyPower: StandbyPower
    deviceCategory: str
    numberOfDevices: int
    room: Room

class PredictionRequest(BaseModel):
    location: LocationData
    start_date: str
    devices: List[Device]