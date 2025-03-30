import { useState, useEffect, useCallback } from 'react';
import { deviceRepository } from '../models/repositories/deviceRepository';
import { energyRepository } from '../models/repositories/energyRepository';
import { locationRepository } from '../models/repositories/locationRepository';
import {
    Recommendation,
    RecommendationsData
} from '../models/interfaces/energyInterfaces';
import { calculateConsumptionByCategory } from '../utils/calculationUtils';

export function useTipsViewModel() {
    const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
    // Updated: recommendations is now a string to match the API output.
    const [recommendations, setRecommendations] = useState<string>("");
    const [roomsConsumption, setRoomsConsumption] = useState<{ name: string; consumption: number }[]>([]);
    const [efficiencyData, setEfficiencyData] = useState<any>({});
    const [currentEfficiencyData, setCurrentEfficiencyData] = useState<any>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Base URL for API calls
    const BASE_URL = 'https://eemp-backend-production.up.railway.app';

    // Load data on mount
    useEffect(() => {
        loadRecommendations();
        calculateRoomConsumption();
    }, []);

    // Load recommendations data
    const loadRecommendations = useCallback(async () => {
        try {
            setLoading(true);

            // First check if recommendations exist in localStorage
            const recommendationsData = energyRepository.getRecommendationsData();

            if (recommendationsData) {
                processRecommendationsData(recommendationsData);
            } else {
                // If no stored recommendations, fetch from API
                await fetchRecommendationsFromAPI();
            }

            setLoading(false);
        } catch (err) {
            console.error('Error loading recommendations:', err);
            setError('Failed to load recommendations');
            setLoading(false);
        }
    }, []);

    // Process recommendations data
    const processRecommendationsData = useCallback((data: RecommendationsData) => {
        // Expecting data.recommendations to be a string from the API response
        setRecommendations(typeof data.recommendations === 'string' ? data.recommendations : "");
        setEfficiencyData(data.predicted_efficiency || {});
        setCurrentEfficiencyData(data.current_efficiency || {});
    }, []);

    // Fetch recommendations from API
    const fetchRecommendationsFromAPI = useCallback(async () => {
        try {
            // Get location from repository
            const userLocation = locationRepository.getUserLocation() ||
                locationRepository.getDefaultLocation();

            // Prepare location data
            const location = {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                country: userLocation.country || 'Croatia',
                altitude: userLocation.altitude,
                name: userLocation.name,
                timezone: userLocation.timezone,
            };

            // Find solar panel device
            const solarDevice = deviceRepository.getSolarPanelDevices()[0];

            // Prepare solar panel data
            let solarPanelData = null;

            // If we have a solar device, use its data
            if (solarDevice) {
                solarPanelData = {
                    inverter_name:
                        solarDevice.inverter || 'ABB__MICRO_0_3HV_I_OUTD_US_208__208V_',
                    module_name: solarDevice.module || 'Advent_Solar_AS160___2006_',
                    tilt: parseFloat(solarDevice.tilt as string) || 30.0,
                    orientation: parseFloat(solarDevice.orientation as string) || 180.0,
                    capacity: 300, // Default if not specified
                    efficiency: 21.5, // Default if not specified
                    installation_year: 2022, // Default if not specified
                };
            }

            // Prepare non-solar devices for the request
            const regularDevices = deviceRepository.getRegularDevices();

            const formattedDevices = regularDevices.map((device) => ({
                deviceId: device.deviceId || device.id || '',
                deviceName: device.deviceName || device.name || '',
                powerRating: device.powerRating || {
                    value: parseFloat(device.powerRatingValue) || 0,
                    unit: device.powerRatingUnit || 'W',
                },
                usagePattern: {
                    usage_times:
                        device.usagePattern?.usage_times || device.usageTimes || [],
                    frequency_unit: 'days',
                    frequency_value: 1,
                },
                energyType: device.energyType || 'AC',
                standbyPower: device.standbyPower || {
                    value: parseFloat(device.standbyPowerValue) || 0,
                    unit: device.standbyPowerUnit || 'W',
                },
                deviceCategory: device.deviceCategory || device.category || '',
                numberOfDevices: parseInt(device.quantity as any) || 1,
                room: device.room || {
                    roomId: device.roomId || '',
                    roomName: device.roomName || '',
                    roomType: device.roomType || '',
                },
            }));

            // Prepare the request payload
            const payload: any = { location };

            if (solarPanelData) {
                payload.solar_panel_data = solarPanelData;
            }

            if (formattedDevices.length > 0) {
                payload.devices = formattedDevices;
            }

            // Make the API request
            const response = await fetch(
                `${BASE_URL}/recommendations`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data: RecommendationsData = await response.json();

            // Store recommendations for future use
            energyRepository.saveRecommendationsData(data);

            // Process the data
            processRecommendationsData(data);
        } catch (err) {
            console.error('Error fetching recommendations from API:', err);
            throw err;
        }
    }, [processRecommendationsData]);

    // Calculate room consumption
    const calculateRoomConsumption = useCallback(() => {
        try {
            const devices = deviceRepository.getRegularDevices();

            // Create a map to aggregate consumption by room
            const roomMap = new Map<string, number>();

            // Calculate consumption for each device
            devices.forEach(device => {
                if (!device.room && !device.roomName) {
                    return;
                }

                // Get room info
                let roomName = '';
                let roomType = '';

                if (typeof device.room === 'object') {
                    roomName = device.room?.roomName || '';
                    roomType = device.room?.roomType || '';
                } else if (typeof device.room === 'string') {
                    roomName = device.room;
                } else if (device.roomName) {
                    roomName = device.roomName;
                    roomType = device.roomType || '';
                }

                if (!roomName) {
                    return;
                }

                // Generate a key for the room
                const key = `${roomName}||${roomType}`;

                // Calculate daily consumption in kWh
                const dailyConsumption = calculateDeviceConsumption(device);

                // Add to the map
                const prevConsumption = roomMap.get(key) || 0;
                roomMap.set(key, prevConsumption + dailyConsumption);
            });

            // Convert to array for chart
            const consumptionArray = Array.from(roomMap.entries()).map(
                ([key, consumption]) => {
                    const [roomName, roomType] = key.split('||');
                    const displayName = roomType ? `${roomName} (${roomType})` : roomName;
                    return { name: displayName, consumption };
                }
            );

            setRoomsConsumption(consumptionArray);
        } catch (err) {
            console.error('Error calculating room consumption:', err);
        }
    }, []);

    // Calculate device consumption
    const calculateDeviceConsumption = (device: any): number => {
        try {
            const powerW = device.powerRating?.value ||
                (device.powerRatingValue ? Number(device.powerRatingValue) : 0);
            const powerUnit = device.powerRating?.unit?.toLowerCase() || 'w';
            const powerKW = powerUnit === 'w' ? powerW / 1000 : powerW;

            const standbyW = device.standbyPower?.value ||
                (device.standbyPowerValue ? Number(device.standbyPowerValue) : 0);
            const standbyUnit = device.standbyPower?.unit?.toLowerCase() || 'w';
            const standbyKW = standbyUnit === 'w' ? standbyW / 1000 : standbyW;

            const usageTimes = device.usagePattern?.usage_times || [];

            // Calculate average daily usage hours
            let avgActiveHours = 1; // Default to 1 hour if no usage times

            if (usageTimes.length > 0) {
                const hoursArray = usageTimes.map((ut: any) => {
                    const start = new Date(ut.start);
                    const end = new Date(ut.end);

                    if (!start || !end) {
                        return 0;
                    }

                    let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

                    if (hours < 0) {
                        hours += 24; // Assume overnight usage
                    }

                    return Math.max(0, Math.min(hours, 24));
                });

                avgActiveHours = hoursArray.reduce((sum, h) => sum + h, 0) / hoursArray.length;
            }

            // Calculate consumption
            const activeConsumption = powerKW * avgActiveHours;
            const standbyConsumption = standbyKW * (24 - avgActiveHours);
            const totalDailyConsumption = activeConsumption + standbyConsumption;

            // Multiply by quantity
            const quantity = Number(device.quantity) || 1;

            return totalDailyConsumption * quantity;
        } catch (err) {
            console.error('Error calculating device consumption:', err);
            return 0;
        }
    };

    // Get chart data for efficiency gains
    const getEfficiencyChartData = useCallback(() => {
        const data = efficiencyData[timeframe] || {};
        const currentData = currentEfficiencyData[timeframe] || {};

        return Object.keys(data).map((key) => ({
            name: timeframe === 'yearly'
                ? key
                : new Date(key).toLocaleDateString([], { day: '2-digit', month: 'short' }),
            predicted: data[key],
            current: currentData[key] || 0,
        }));
    }, [timeframe, efficiencyData, currentEfficiencyData]);

    // Handle timeframe change
    const handleTimeframeChange = useCallback((newTimeframe: 'weekly' | 'monthly' | 'yearly') => {
        setTimeframe(newTimeframe);
    }, []);

    return {
        timeframe,
        recommendations,
        roomsConsumption,
        loading,
        error,
        loadRecommendations,
        getEfficiencyChartData,
        handleTimeframeChange,
    };
}
