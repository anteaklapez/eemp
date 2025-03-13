import { useState, useEffect, useCallback } from 'react';
import { energyRepository } from '../models/repositories/energyRepository';
import { deviceRepository } from '../models/repositories/deviceRepository';
import { locationRepository } from '../models/repositories/locationRepository';
import {
    EnergyData,
    ChartDataPoint,
    ConsumptionData,
    ProductionData
} from '../models/interfaces/energyInterfaces';
import { Device } from '../models/interfaces/deviceInterfaces';
import { calculateConsumptionByCategory } from '../utils/calculationUtils';
import { getWeeksInCurrentMonth } from '../utils/dateUtils';

export function useEnergyViewModel() {
    const [energyData, setEnergyData] = useState<EnergyData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isCalculating, setIsCalculating] = useState<boolean>(false);
    const [mode, setMode] = useState<'consumption' | 'production'>('consumption');
    const [timeframe, setTimeframe] = useState<'day' | 'week' | 'year'>('day');
    const [consumptionData, setConsumptionData] = useState<ConsumptionData>({ day: [], week: [] });
    const [productionData, setProductionData] = useState<ProductionData>({ day: [], week: [], year: [] });
    const [categoryConsumption, setCategoryConsumption] = useState<Record<string, number>>({});
    const [totalConsumption, setTotalConsumption] = useState<number>(0);
    const [totalProduction, setTotalProduction] = useState<number>(0);

    // Base URL for API calls
    const BASE_URL = 'https://eemp-backend-production.up.railway.app';

    // Load energy data on mount
    useEffect(() => {
        loadEnergyData();
    }, []);

    // Load energy data from repository
    const loadEnergyData = useCallback(async () => {
        try {
            setLoading(true);

            // Get energy data from repository
            const storedEnergyData = energyRepository.getEnergyData();

            if (storedEnergyData) {
                setEnergyData(storedEnergyData);
                processEnergyData(storedEnergyData);
            } else {
                // If no stored data, calculate it
                await calculateEnergyData();
            }

            // Get devices for category consumption
            const devices = deviceRepository.getAllDevices();
            const categoriesConsumption = calculateConsumptionByCategory(devices);
            setCategoryConsumption(categoriesConsumption);

            setLoading(false);
        } catch (err) {
            console.error('Error loading energy data:', err);
            setError('Failed to load energy data');
            setLoading(false);
        }
    }, []);

    // Process energy data into chart format
    const processEnergyData = useCallback((data: EnergyData) => {
        if (!data) return;

        // Process consumption data
        if (data.consumption) {
            // Process hourly consumption data
            if (data.consumption.hourly && data.consumption.hourly.energy_output) {
                const hourlyData = processHourlyConsumptionData(data.consumption.hourly);
                setConsumptionData(prev => ({ ...prev, day: hourlyData }));
            }

            // Process daily consumption data
            if (data.consumption.daily) {
                if (data.consumption.daily.energy_output) {
                    const dailyData = processDailyConsumptionData(data.consumption.daily);
                    setConsumptionData(prev => ({ ...prev, week: dailyData }));
                }

                // Calculate total consumption
                const total = calculateTotalConsumption(data.consumption.daily);
                setTotalConsumption(total);
            }
        }

        // Process production data
        if (data.production) {
            // Process hourly production data
            if (data.production.hourly && data.production.hourly.energy_output) {
                const hourlyData = processHourlyProductionData(data.production.hourly);
                setProductionData(prev => ({ ...prev, day: hourlyData }));
            }

            // Process daily production data
            if (data.production.daily && data.production.daily.energy_output) {
                const dailyData = processDailyProductionData(data.production.daily);
                setProductionData(prev => ({ ...prev, week: dailyData }));

                // Calculate total production
                const total = calculateTotalProduction(data.production.daily);
                setTotalProduction(total);
            }

            // Process yearly production data
            if (data.production.yearly && data.production.yearly.energy_output) {
                const yearlyData = processYearlyProductionData(data.production.yearly);
                setProductionData(prev => ({ ...prev, year: yearlyData }));
            }
        }
    }, []);

    // Calculate energy data from API
    const calculateEnergyData = useCallback(async () => {
        try {
            setIsCalculating(true);

            const devices = deviceRepository.getAllDevices();

            if (devices.length === 0) {
                setIsCalculating(false);
                return;
            }

            const userLocation = locationRepository.getUserLocation() ||
                locationRepository.getDefaultLocation();

            const energyData = await fetchAllEnergyData(devices, userLocation);

            // Save the energy data
            energyRepository.saveEnergyData(energyData);

            // Set the energy data
            setEnergyData(energyData);

            // Process the energy data
            processEnergyData(energyData);

            setIsCalculating(false);
        } catch (err) {
            console.error('Error calculating energy data:', err);
            setError('Failed to calculate energy data');
            setIsCalculating(false);
        }
    }, [processEnergyData]);

    // Fetch all energy data from the API
    const fetchAllEnergyData = async (devices: Device[], userLocation: any): Promise<EnergyData> => {
        const locationObj = {
            latitude: userLocation.latitude || 45.815399,
            longitude: userLocation.longitude || 15.966568,
            name: userLocation.name || 'Default Location',
            altitude: userLocation.altitude || 122,
            timezone: userLocation.timezone || 'Europe/Zagreb',
            country: userLocation.country || 'Croatia',
        };

        const today = new Date();
        const startDate = today.toISOString().split('T')[0];

        const solarPanels = devices.filter(
            (device) => device.category === 'Solar Panel' || device.deviceCategory === 'Solar Panel'
        );

        const otherDevices = devices.filter(
            (device) => device.category !== 'Solar Panel' && device.deviceCategory !== 'Solar Panel'
        );

        const devicesForConsumption = otherDevices.map((device) => ({
            deviceId: device.deviceId || device.id,
            deviceName: device.deviceName || device.name,
            powerRating: device.powerRating || { value: 10, unit: 'W' },
            usagePattern: device.usagePattern || {
                usage_times: [
                    {
                        start: today.toISOString(),
                        end: new Date(today.getTime() + 5 * 60 * 60 * 1000).toISOString(),
                    },
                ],
            },
            energyType: device.energyType || 'AC',
            standbyPower: device.standbyPower || { value: 0.5, unit: 'W' },
            deviceCategory: device.deviceCategory || device.category,
            numberOfDevices: device.quantity || 1,
            room:
                typeof device.room === 'object'
                    ? device.room
                    : {
                        roomId: 'default',
                        roomName: typeof device.room === 'string' ? device.room : 'Default Room',
                        roomType: 'Living Room',
                    },
        }));

        const solarPanelData = solarPanels.length > 0
            ? {
                inverter_name:
                    (solarPanels[0] as any).inverter ||
                    'ABB__MICRO_0_3HV_I_OUTD_US_208__208V_',
                module_name:
                    (solarPanels[0] as any).module || 'Advent_Solar_AS160___2006_',
                tilt: (solarPanels[0] as any).tilt || 30.0,
                orientation: (solarPanels[0] as any).orientation || 180.0,
                capacity: 300,
                efficiency: 21.5,
                installation_year: 2022,
                number_of_strings: (solarPanels[0] as any).numberOfStrings || 1,
                modules_per_string: (solarPanels[0] as any).modulesPerString || 1,
            }
            : null;

        const productionRequestBody = solarPanelData
            ? { location: locationObj, solar_panel_data: solarPanelData }
            : null;

        let energyData: EnergyData = {
            consumption: { hourly: {}, daily: {} },
            production: { hourly: {}, daily: {}, yearly: {} },
        };

        let recommendations = {};

        // Fetch data based on what devices are available
        if (otherDevices.length > 0 && solarPanels.length > 0) {
            // Both consumption and production
            const [
                hourlyConsumption,
                dailyConsumption,
                hourlyProduction,
                dailyProduction,
                yearlyProduction,
                recommendationsData,
            ] = await Promise.all([
                fetchHourlyConsumption(locationObj, startDate, devicesForConsumption),
                fetchDailyConsumption(locationObj, startDate, devicesForConsumption),
                fetchHourlyProduction(productionRequestBody),
                fetchDailyProduction(productionRequestBody),
                fetchYearlyProduction(productionRequestBody),
                fetchRecommendations(locationObj, solarPanelData, devicesForConsumption),
            ]);

            energyData = {
                consumption: { hourly: hourlyConsumption, daily: dailyConsumption },
                production: {
                    hourly: hourlyProduction,
                    daily: dailyProduction,
                    yearly: yearlyProduction,
                },
            };
            recommendations = recommendationsData;
        } else if (otherDevices.length > 0) {
            // Consumption only
            const [hourlyConsumption, dailyConsumption, recommendationsData] =
                await Promise.all([
                    fetchHourlyConsumption(locationObj, startDate, devicesForConsumption),
                    fetchDailyConsumption(locationObj, startDate, devicesForConsumption),
                    fetchRecommendations(locationObj, null, devicesForConsumption),
                ]);

            energyData.consumption = { hourly: hourlyConsumption, daily: dailyConsumption };
            recommendations = recommendationsData;
        } else if (solarPanels.length > 0) {
            // Production only
            const [
                hourlyProduction,
                dailyProduction,
                yearlyProduction,
                recommendationsData,
            ] = await Promise.all([
                fetchHourlyProduction(productionRequestBody),
                fetchDailyProduction(productionRequestBody),
                fetchYearlyProduction(productionRequestBody),
                fetchRecommendations(locationObj, solarPanelData, null),
            ]);

            energyData.production = {
                hourly: hourlyProduction,
                daily: dailyProduction,
                yearly: yearlyProduction,
            };
            recommendations = recommendationsData;
        }

        // Save recommendations
        energyRepository.saveRecommendationsData(recommendations as any);

        return energyData;
    };

    // Helper functions for API calls
    const fetchHourlyConsumption = async (location: any, startDate: string, devices: any[]): Promise<any> => {
        const response = await fetch(`${BASE_URL}/consumption/hourly`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location,
                start_date: startDate,
                devices,
            }),
        });
        return response.json();
    };

    const fetchDailyConsumption = async (location: any, startDate: string, devices: any[]): Promise<any> => {
        const response = await fetch(`${BASE_URL}/consumption/daily`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location,
                start_date: startDate,
                devices,
            }),
        });
        return response.json();
    };

    const fetchHourlyProduction = async (requestBody: any): Promise<any> => {
        const response = await fetch(`${BASE_URL}/production/hourly`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        return response.json();
    };

    const fetchDailyProduction = async (requestBody: any): Promise<any> => {
        const response = await fetch(`${BASE_URL}/production/daily`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        return response.json();
    };

    const fetchYearlyProduction = async (requestBody: any): Promise<any> => {
        const response = await fetch(`${BASE_URL}/production/yearly`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        return response.json();
    };

    const fetchRecommendations = async (location: any, solarPanelData: any, devices: any[]): Promise<any> => {
        const requestBody: any = { location };

        if (solarPanelData) {
            requestBody.solar_panel_data = solarPanelData;
        }

        if (devices && devices.length > 0) {
            requestBody.devices = devices;
        }

        const response = await fetch(`${BASE_URL}/recommendations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        return response.json();
    };

    // Process data into chart format
    const processHourlyConsumptionData = (hourlyData: any): ChartDataPoint[] => {
        if (!hourlyData || !hourlyData.energy_output) return [];
        return Object.entries(hourlyData.energy_output).map(([timestamp, energy]) => ({
            name: new Date(timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                hour12: true,
            }),
            value: parseFloat(Number(energy).toFixed(2)),
        }));
    };

    const processDailyConsumptionData = (dailyData: any): ChartDataPoint[] => {
        if (!dailyData || !dailyData.energy_output) return [];
        return Object.entries(dailyData.energy_output).map(([timestamp, energy]) => ({
            name: new Date(timestamp).toLocaleDateString([], { weekday: 'short' }),
            value: parseFloat(Number(energy).toFixed(2)),
        }));
    };

    const processHourlyProductionData = (hourlyData: any): ChartDataPoint[] => {
        if (!hourlyData || !hourlyData.energy_output) return [];
        return Object.entries(hourlyData.energy_output).map(([timestamp, energy]) => ({
            name: new Date(timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                hour12: true,
            }),
            value: parseFloat(Number(energy).toFixed(2)),
        }));
    };

    const processDailyProductionData = (dailyData: any): ChartDataPoint[] => {
        if (!dailyData || !dailyData.energy_output) return [];
        return Object.entries(dailyData.energy_output).map(([timestamp, energy]) => ({
            name: new Date(timestamp).toLocaleDateString([], { weekday: 'short' }),
            value: parseFloat(Number(energy).toFixed(2)),
        }));
    };

    const processYearlyProductionData = (yearlyData: any): ChartDataPoint[] => {
        if (!yearlyData || !yearlyData.energy_output) return [];
        return Object.entries(yearlyData.energy_output).map(([month, energy]) => ({
            name: new Date(month + '-01').toLocaleDateString([], { month: 'short' }),
            value: parseFloat(Number(energy).toFixed(2)),
        }));
    };

    // Calculate total consumption from daily data
    const calculateTotalConsumption = (dailyData: any): number => {
        if (!dailyData) return 0;

        if (dailyData.daily_consumption) {
            const total = dailyData.daily_consumption.reduce(
                (sum: number, item: any) => sum + item.consumption,
                0
            );
            return parseFloat(total.toFixed(2));
        }

        if (dailyData.energy_output) {
            const energyOutput = dailyData.energy_output as Record<string, number>;
            const total = Object.values(energyOutput).reduce((sum, value) => sum + value, 0);

            // Convert to monthly value
            const weeksInMonth = getWeeksInCurrentMonth();
            return parseFloat((total * weeksInMonth).toFixed(2));
        }

        return 0;
    };

    // Calculate total production from daily data
    const calculateTotalProduction = (dailyData: any): number => {
        if (!dailyData || !dailyData.energy_output) return 0;

        const energyOutput = dailyData.energy_output as Record<string, number>;
        const total = Object.values(energyOutput).reduce((sum, value) => sum + value, 0);

        // Convert to monthly value
        const weeksInMonth = getWeeksInCurrentMonth();
        return parseFloat((total * weeksInMonth).toFixed(2));
    };

    // Get current chart data based on mode and timeframe
    const getCurrentChartData = useCallback(() => {
        if (mode === 'consumption') {
            return consumptionData[timeframe] || [];
        } else {
            return productionData[timeframe] || [];
        }
    }, [mode, timeframe, consumptionData, productionData]);

    // Handle mode change
    const handleModeChange = useCallback((newMode: 'consumption' | 'production') => {
        setMode(newMode);

        // Reset timeframe to 'week' if 'year' is selected and switching to consumption
        if (newMode === 'consumption' && timeframe === 'year') {
            setTimeframe('week');
        }
    }, [timeframe]);

    // Handle timeframe change
    const handleTimeframeChange = useCallback((newTimeframe: 'day' | 'week' | 'year') => {
        setTimeframe(newTimeframe);
    }, []);

    return {
        energyData,
        loading,
        error,
        isCalculating,
        mode,
        timeframe,
        totalConsumption,
        totalProduction,
        categoryConsumption,
        loadEnergyData,
        calculateEnergyData,
        handleModeChange,
        handleTimeframeChange,
        getCurrentChartData,
    };
}