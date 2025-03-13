import { Device, IDevice, UsageTime } from '../models/interfaces/deviceInterfaces';
import { calculateDurationInHours } from './dateUtils';
import { EnergyBreakdown } from '../models/interfaces/energyInterfaces';

/**
 * Convert power value to kilowatts based on the unit
 */
export function convertToKW(value: number, unit: string): number {
    if (unit.toLowerCase() === 'w') {
        return value / 1000;
    }
    return value; // Assume already in kW
}

/**
 * Calculate energy consumption for a single time slot in kWh
 */
export function calculateEnergyForTimeSlot(
    powerKW: number,
    hours: number,
    standbyPowerKW: number = 0
): EnergyBreakdown {
    const activeEnergy = powerKW * hours;
    // These are example splits; adapt if you have different logic
    const peakEnergy = activeEnergy * 0.4;
    const offPeakEnergy = activeEnergy * 0.6;
    const standbyEnergy = standbyPowerKW * (24 - hours);

    return {
        peak: peakEnergy,
        offPeak: offPeakEnergy,
        standby: standbyEnergy
    };
}

/**
 * Calculate total daily energy consumption for a device in kWh
 */
export function calculateDailyEnergy(
    device: IDevice
): number {
    // Get power values
    const powerRatingKW = device.powerRating
        ? convertToKW(device.powerRating.value, device.powerRating.unit)
        : device.powerRatingValue
            ? convertToKW(Number(device.powerRatingValue), device.powerRatingUnit || 'W')
            : 0;

    const standbyPowerKW = device.standbyPower
        ? convertToKW(device.standbyPower.value, device.standbyPower.unit)
        : device.standbyPowerValue
            ? convertToKW(Number(device.standbyPowerValue), device.standbyPowerUnit || 'W')
            : 0;

    // Get usage times
    const usageTimes: UsageTime[] = device.usagePattern?.usage_times || device.usageTimes || [];

    if (usageTimes.length === 0) {
        return 0;
    }

    // Calculate energy for each usage time slot
    const dailyConsumptions = usageTimes.map(timeSlot => {
        const hours = calculateDurationInHours(timeSlot.start, timeSlot.end);
        const { peak, offPeak, standby } = calculateEnergyForTimeSlot(powerRatingKW, hours, standbyPowerKW);
        return peak + offPeak + standby;
    });

    // Average daily consumption
    const totalConsumption = dailyConsumptions.reduce((sum, value) => sum + value, 0);
    const averageDailyConsumption = totalConsumption / usageTimes.length;

    // Multiply by quantity
    const quantity = device.quantity !== undefined
        ? device.quantity
        : device.numberOfDevices
            ? Number(device.numberOfDevices)
            : 1;

    return averageDailyConsumption * quantity;
}

/**
 * Calculate monthly energy consumption for a device in kWh
 */
export function calculateMonthlyEnergy(device: IDevice): number {
    const dailyConsumption = calculateDailyEnergy(device);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return dailyConsumption * daysInMonth;
}

/**
 * Calculate total consumption for multiple devices
 */
export function calculateTotalConsumption(devices: IDevice[]): number {
    return devices.reduce((total, device) => {
        return total + calculateDailyEnergy(device);
    }, 0);
}

/**
 * Calculate consumption by category
 */
export function calculateConsumptionByCategory(devices: Device[]): Record<string, number> {
    const categoryConsumption: Record<string, number> = {};

    devices.forEach(device => {
        // Skip solar panels in consumption calculation
        const category = device.category || device.deviceCategory || 'Other';
        if (category === 'Solar Panel') {
            return;
        }

        if (!categoryConsumption[category]) {
            categoryConsumption[category] = 0;
        }

        categoryConsumption[category] += calculateDailyEnergy(device as IDevice);
    });

    return categoryConsumption;
}