from pydantic import BaseModel
from typing import List
from location_models import LocationData


class PowerRating(BaseModel):
    value: float
    unit: str

    def __str__(self):
        return f"{self.value} {self.unit}"


class UsageTime(BaseModel):
    start: str
    end: str

    def __str__(self):
        start_time = self.start.split("T")[1][:5]  # Extract HH:MM
        end_time = self.end.split("T")[1][:5]
        return f"{start_time}-{end_time}"


class UsagePattern(BaseModel):
    frequency_unit: str
    frequency_value: int
    usage_times: List[UsageTime]

    def __str__(self):
        times = ", ".join(str(t) for t in self.usage_times)
        return f"Used {self.frequency_value} times {self.frequency_unit} at {times}"


class StandbyPower(BaseModel):
    value: float
    unit: str

    def __str__(self):
        return f"{self.value} {self.unit} standby"


class Room(BaseModel):
    roomId: str
    roomName: str

    def __str__(self):
        return self.roomName


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

    def __str__(self):
        return (
            f"{self.deviceName} ({self.numberOfDevices}x)\n"
            f"Power: {self.powerRating.value}{self.powerRating.unit} | "
            f"Standby: {self.standbyPower.value}{self.standbyPower.unit}\n"
            f"Usage: {self.usagePattern}\n"
            f"Location: {self.room.roomName}"
        )


class PredictionRequest(BaseModel):
    location: LocationData
    start_date: str
    devices: List[Device]

    def __str__(self):
        devices_list = "\n".join(f"- {d}" for d in self.devices)
        return (
            f"Location: {self.location}\n"
            f"Start Date: {self.start_date}\n"
            f"Devices:\n{devices_list}"
        )