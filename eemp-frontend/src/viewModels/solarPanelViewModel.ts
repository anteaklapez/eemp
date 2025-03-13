import { useState, useEffect, useCallback } from 'react';
import { deviceRepository } from '../models/repositories/deviceRepository';
import { weatherRepository } from '../models/repositories/weatherRepository';
import { energyRepository } from '../models/repositories/energyRepository';
import { ISolarPanelDevice } from '../models/interfaces/deviceInterfaces';
import { ChartDataPoint } from '../models/interfaces/energyInterfaces';
import { getCurrentSeason } from '../utils/dateUtils';

export function useSolarPanelViewModel(panelId?: string | number) {
    const [solarPanel, setSolarPanel] = useState<ISolarPanelDevice | null>(null);
    const [weatherData, setWeatherData] = useState<any>(null);
    const [view, setView] = useState<'week' | 'month'>('week');
    const [weeklyData, setWeeklyData] = useState<ChartDataPoint[]>([]);
    const [monthlyData, setMonthlyData] = useState<ChartDataPoint[]>([]);
    const [monthlyProduction, setMonthlyProduction] = useState<number>(0);
    const [monthlyConsumption, setMonthlyConsumption] = useState<number>(0);
    const [savingsPercentage, setSavingsPercentage] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [openRemoveDialog, setOpenRemoveDialog] = useState<boolean>(false);

    // Current season
    const currentSeason = getCurrentSeason();

    // Load panel data on mount
    useEffect(() => {
        if (panelId) {
            loadSolarPanel(panelId);
        }
    }, [panelId]);

    // Load solar panel by ID
    const loadSolarPanel = useCallback(async (id: string | number) => {
        try {
            setLoading(true);

            // Get panel from repository
            const panel = deviceRepository.getDeviceById(id) as ISolarPanelDevice;

            if (!panel) {
                throw new Error(`Solar panel with ID ${id} not found`);
            }

            setSolarPanel(panel);

            // Load weather data
            await loadWeatherData();

            // Load energy data
            loadEnergyData();

            setLoading(false);
        } catch (err) {
            console.error('Error loading solar panel:', err);
            setError('Failed to load solar panel data');
            setLoading(false);
        }
    }, []);

    // Load weather data
    const loadWeatherData = useCallback(async () => {
        try {
            const userLocation = localStorage.getItem('userLocation');

            if (userLocation) {
                const locationData = JSON.parse(userLocation);
                const weatherData = await weatherRepository.fetchDailyWeather(locationData);
                setWeatherData(weatherRepository.getTodayWeather(weatherData));
            }
        } catch (err) {
            console.error('Error loading weather data:', err);
            // Not setting error state here as it's not critical
        }
    }, []);

    // Load energy data
    const loadEnergyData = useCallback(() => {
        try {
            const energyData = energyRepository.getEnergyData();

            if (!energyData) {
                return;
            }

            // Process weekly production data
            if (energyData.production?.daily) {
                const dailyData = processDailyProductionData(energyData.production.daily);
                setWeeklyData(dailyData);
            }

            // Process monthly production data
            if (energyData.production?.yearly) {
                const yearlyData = processYearlyProductionData(energyData.production.yearly);
                setMonthlyData(yearlyData);

                // Get current month production
                const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
                const prodValue = energyData.production.yearly.energy_output?.[currentMonthName] ?? 0;
                setMonthlyProduction(prodValue);
            }

            // Calculate monthly consumption
            calculateMonthlyConsumption(energyData);
        } catch (err) {
            console.error('Error loading energy data:', err);
        }
    }, []);

    // Process daily production data
    const processDailyProductionData = (dailyData: any): ChartDataPoint[] => {
        if (!dailyData || !dailyData.energy_output) return [];
        return Object.entries(dailyData.energy_output).map(([timestamp, energy]) => ({
            name: new Date(timestamp).toLocaleDateString([], { weekday: 'short' }),
            value: parseFloat(Number(energy).toFixed(2)),
        }));
    };

    // Process yearly production data
    const processYearlyProductionData = (yearlyData: any): ChartDataPoint[] => {
        if (!yearlyData || !yearlyData.energy_output) return [];
        return Object.entries(yearlyData.energy_output).map(([month, energy]) => ({
            name: month,
            value: parseFloat(Number(energy).toFixed(2)),
        }));
    };

    // Calculate monthly consumption
    const calculateMonthlyConsumption = useCallback((energyData: any) => {
        if (!energyData) {
            return;
        }

        let monthlyCons = 0;

        // Method 1: Use daily_consumption array if available
        if (
            energyData.consumption?.daily?.daily_consumption &&
            Array.isArray(energyData.consumption.daily.daily_consumption)
        ) {
            const dailyConsumptionArray = energyData.consumption.daily.daily_consumption;

            // Sum weekly consumption
            const weeklyConsumption = dailyConsumptionArray.reduce(
                (sum: number, item: any) => sum + item.consumption,
                0
            );

            const daysInMonth = new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                0
            ).getDate();
            const weeksInMonth = daysInMonth / 7;

            monthlyCons = weeklyConsumption * weeksInMonth;
        }
        // Method 2: Use energy_output if available
        else if (
            energyData.consumption?.daily?.energy_output &&
            typeof energyData.consumption.daily.energy_output === 'object'
        ) {
            const dailyEnergyOutput = energyData.consumption.daily.energy_output;

            // Sum all values
            const dailyValues = Object.values(dailyEnergyOutput) as number[];
            const weeklyConsumption = dailyValues.reduce((sum, val) => sum + val, 0);

            const daysInMonth = new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                0
            ).getDate();
            const weeksInMonth = daysInMonth / 7;

            monthlyCons = weeklyConsumption * weeksInMonth;
        }

        setMonthlyConsumption(monthlyCons);

        // Calculate savings percentage
        if (monthlyCons > 0 && monthlyProduction > 0) {
            const savingsPct = (monthlyProduction / monthlyCons) * 100;
            setSavingsPercentage(savingsPct);
        }
    }, [monthlyProduction]);

    // Get chart data for current view
    const getCurrentChartData = useCallback(() => {
        return {
            labels: view === 'week' ? weeklyData.map(d => d.name) : monthlyData.map(d => d.name),
            datasets: [
                {
                    label: 'Energy Production',
                    data: view === 'week' ? weeklyData.map(d => d.value) : monthlyData.map(d => d.value),
                    borderColor: '#5A8DEE',
                    backgroundColor: 'rgba(90,141,238,0.2)',
                    tension: 0.4,
                    pointRadius: 6,
                },
            ],
        };
    }, [view, weeklyData, monthlyData]);

    // Get max value for chart scaling
    const getChartMaxValue = useCallback(() => {
        const values = view === 'week'
            ? weeklyData.map(d => d.value)
            : monthlyData.map(d => d.value);

        return Math.max(...values, 0) + 2;
    }, [view, weeklyData, monthlyData]);

    // Handle view toggle
    const handleViewToggle = useCallback((newView: 'week' | 'month') => {
        setView(newView);
    }, []);

    // Delete the solar panel
    const deleteSolarPanel = useCallback(async () => {
        try {
            setLoading(true);

            if (!solarPanel) {
                throw new Error('No solar panel to delete');
            }

            const id = solarPanel.id || solarPanel.deviceId;

            if (!id) {
                throw new Error('Solar panel ID is missing');
            }

            // Delete from repository
            const success = deviceRepository.deleteDevice(id);

            if (!success) {
                throw new Error('Failed to delete solar panel');
            }

            setLoading(false);
            return true;
        } catch (err) {
            console.error('Error deleting solar panel:', err);
            setError('Failed to delete solar panel');
            setLoading(false);
            return false;
        }
    }, [solarPanel]);

    // Open the remove dialog
    const handleOpenRemoveDialog = useCallback(() => {
        setOpenRemoveDialog(true);
    }, []);

    // Close the remove dialog
    const handleCloseRemoveDialog = useCallback(() => {
        setOpenRemoveDialog(false);
    }, []);

    return {
        solarPanel,
        weatherData,
        view,
        weeklyData,
        monthlyData,
        monthlyProduction,
        monthlyConsumption,
        savingsPercentage,
        loading,
        error,
        openRemoveDialog,
        currentSeason,
        loadSolarPanel,
        getCurrentChartData,
        getChartMaxValue,
        handleViewToggle,
        deleteSolarPanel,
        handleOpenRemoveDialog,
        handleCloseRemoveDialog,
    };
}