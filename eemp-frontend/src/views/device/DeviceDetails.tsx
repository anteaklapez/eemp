import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { useDeviceViewModel } from '../../viewModels/deviceViewModel';
import { useLocationViewModel } from '../../viewModels/locationViewModel';
import { weatherRepository } from '../../models/repositories/weatherRepository';
import FactorBox from '../components/FactorBox';
import ConsumptionChart from '../components/ConsumptionChart';
import ToggleViewButtons from '../components/ToggleViewButtons';
import ConfirmationDialog from '../components/ConfirmationDialog';
import LoadingState from '../components/LoadingState';
import { IDevice } from '../../models/interfaces/deviceInterfaces';
import { calculateEnergyForTimeSlot } from '../../utils/calculationUtils';
import { calculateDurationInHours, getCurrentSeason } from '../../utils/dateUtils';

// Icons
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import NatureIcon from '@mui/icons-material/Nature';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

/**
 * DeviceDetails Component
 * Shows detailed information about a specific device
 */
const DeviceDetails: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get device from route state
    const { device } = (location.state as { device?: IDevice }) || {};

    // States
    const [weatherData, setWeatherData] = useState(null);
    const [view, setView] = useState<'week' | 'month'>('week');
    const [openRemoveDialog, setOpenRemoveDialog] = useState(false);
    const [loading, setLoading] = useState(false);

    // View models
    const { deleteDevice } = useDeviceViewModel();
    const currentSeason = getCurrentSeason();
    // Load weather data on mount
    useEffect(() => {
        const fetchWeatherData = async () => {
            try {
                const userLocation = JSON.parse(localStorage.getItem('userLocation'));
                if (userLocation) {
                    const data = await weatherRepository.fetchDailyWeather(userLocation);
                    setWeatherData(data.daily[0]);
                }
            } catch (error) {
                console.error('Error fetching weather data:', error);
            }
        };

        fetchWeatherData();
    }, []);

    // Validate device exists
    if (!device) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>No device information available.</Typography>
                <Button
                    variant="contained"
                    onClick={() => navigate('/management')}
                    sx={{ mt: 2 }}
                >
                    Go to Device Management
                </Button>
            </Box>
        );
    }

    // Loading state
    if (loading) {
        return <LoadingState message="Processing device data..." />;
    }

    // Get power values in kW
    const powerRatingKW = device?.powerRating
        ? Number(device.powerRating.value) /
        (device.powerRating.unit === 'W' ? 1000 : 1)
        : 0;
    const standbyPowerKW = device?.standbyPower
        ? Number(device.standbyPower.value) /
        (device.standbyPower.unit === 'W' ? 1000 : 1)
        : 0;

    // Compute daily usage hours for each day
    let dailyUsageHours: number[] = Array(7).fill(0);
    if (
        device?.usagePattern?.usage_times &&
        Array.isArray(device.usagePattern.usage_times)
    ) {
        dailyUsageHours = device.usagePattern.usage_times.map((ut: any) => {
            return calculateDurationInHours(ut.start, ut.end);
        });
    } else {
        dailyUsageHours = Array(7).fill(1);
    }

    // Calculate energy breakdown per day
    const computedDailyBreakdown = dailyUsageHours.map((hours) => {
        return calculateEnergyForTimeSlot(powerRatingKW, hours, standbyPowerKW);
    });

    // Calculate daily consumption totals
    const computedDailyConsumptions = computedDailyBreakdown.map(
        (b) => b.peak + b.offPeak + b.standby
    );

    // Prepare weekly chart data
    const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const computedWeeklyData = {
        labels: weekLabels,
        datasets: [
            {
                label: 'Energy Consumption (kWh)',
                data: computedDailyConsumptions,
                borderColor: '#5A8DEE',
                backgroundColor: 'rgba(90,141,238,0.2)',
                tension: 0.4,
                pointRadius: 6,
            },
        ],
    };

    // Calculate weekly totals & averages for monthly data
    const sumPeak = computedDailyBreakdown.reduce((acc, b) => acc + b.peak, 0);
    const sumOffPeak = computedDailyBreakdown.reduce(
        (acc, b) => acc + b.offPeak,
        0
    );
    const sumStandby = computedDailyBreakdown.reduce(
        (acc, b) => acc + b.standby,
        0
    );
    const sumTotal = computedDailyConsumptions.reduce((acc, val) => acc + val, 0);

    const averagePeak = sumPeak / 7;
    const averageOffPeak = sumOffPeak / 7;
    const averageStandby = sumStandby / 7;
    const averageTotal = sumTotal / 7;

    // For monthly chart, assume 30 days each month
    const monthlyLabels = Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`);
    const monthlyValues = Array(12).fill(+(averageTotal * 30).toFixed(2));
    const computedMonthlyData = {
        labels: monthlyLabels,
        datasets: [
            {
                label: 'Energy Consumption (kWh)',
                data: monthlyValues,
                borderColor: '#5A8DEE',
                backgroundColor: 'rgba(90,141,238,0.2)',
                tension: 0.4,
                pointRadius: 6,
            },
        ],
    };

    // Calculate peak usage hours average
    let avgPeakHoursStart = '';
    let avgPeakHoursEnd = '';

    if (device?.usagePattern?.usage_times) {
        let sumStart = 0;
        let sumEnd = 0;
        let count = 0;

        device.usagePattern.usage_times.forEach((ut: any) => {
            const start = dayjs(ut.start);
            const end = dayjs(ut.end);
            if (!start.isValid() || !end.isValid()) return;

            let startHour =
                start.hour() + start.minute() / 60 + start.second() / 3600;
            let endHour = end.hour() + end.minute() / 60 + end.second() / 3600;

            if (end.isBefore(start)) {
                endHour += 24;
            }

            sumStart += startHour;
            sumEnd += endHour;
            count++;
        });

        if (count > 0) {
            let avgStart = sumStart / count;
            let avgEnd = sumEnd / count;
            if (avgEnd < avgStart) {
                avgEnd += 24;
            }

            const referenceDate = dayjs('1970-01-01');
            const avgStartTime = referenceDate.add(avgStart, 'hour');
            const avgEndTime = referenceDate.add(avgEnd, 'hour');

            avgPeakHoursStart = avgStartTime.format('h:mm A');
            avgPeakHoursEnd = avgEndTime.format('h:mm A');

            if (avgEnd >= 24) {
                const nextDayEnd = referenceDate.add(avgEnd - 24, 'hour');
                avgPeakHoursEnd = `${nextDayEnd.format('h:mm A')} (next day)`;
            }
        }
    }

    // Get last updated date
    const lastUpdatedDate = device?.lastUpdated
        ? new Date(device.lastUpdated)
        : new Date();
    const lastUpdatedString = lastUpdatedDate.toLocaleString();

    // Handle device removal
    const handleOpenRemoveDialog = () => setOpenRemoveDialog(true);
    const handleCloseRemoveDialog = () => setOpenRemoveDialog(false);
    const handleConfirmRemove = async () => {
        setLoading(true);
        const success = await deleteDevice(device);
        if (success) {
            navigate('/management');
        } else {
            setLoading(false);
            setOpenRemoveDialog(false);
        }
    };

    // Get view options for toggle buttons
    const viewOptions = [
        { value: 'week', label: 'W' },
        { value: 'month', label: 'M' },
    ];

    return (
        <Box sx={{ p: 3, maxWidth: 600, margin: '0 auto' }}>
            {/* Device Name & Last Updated */}
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                {device?.deviceName ?? device?.name ?? 'Device'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Last updated {lastUpdatedString}
            </Typography>

            {/* Energy Consumption */}
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Energy Consumption
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
                <ToggleViewButtons
                    view={view}
                    options={viewOptions}
                    onChange={(newView) => setView(newView)}
                />
            </Box>
            <ConsumptionChart
                data={view === 'week' ? computedWeeklyData : computedMonthlyData}
                height={250}
                maxValue={
                    view === 'week'
                        ? Math.max(...computedDailyConsumptions, 1) * 1.2
                        : (averageTotal * 30 || 1) * 1.2
                }
            />

            {/* Estimated Cost / Breakdown */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Estimated Cost
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {(averageTotal * 30).toFixed(2)} kWh/month
                </Typography>
                <Typography variant="body2">
                    <span style={{ color: 'red' }}>●</span> Peak:{' '}
                    {(averagePeak * 30).toFixed(2)} kWh
                </Typography>
                <Typography variant="body2">
                    <span style={{ color: 'green' }}>●</span> Off-Peak:{' '}
                    {(averageOffPeak * 30).toFixed(2)} kWh
                </Typography>
                <Typography variant="body2">
                    <span style={{ color: 'gold' }}>●</span> Standby:{' '}
                    {(averageStandby * 30).toFixed(2)} kWh
                </Typography>
            </Box>

            {/* External Factors */}
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                External Factors
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <FactorBox
                    icon={<WbSunnyIcon sx={{ color: 'black', fontSize: '20px' }} />}
                    title="Weather"
                    value={`${weatherData?.weather[0]?.main || 'N/A'}, ${
                        Math.round(weatherData?.temp?.day) || 'N/A'
                    }°C`}
                    description={
                        weatherData?.weather[0]?.main?.toLowerCase() === 'clear'
                            ? 'Reduced usage likely due to sunlight.'
                            : 'Increased usage likely due to lack of sunlight.'
                    }
                />

                <FactorBox
                    icon={<NatureIcon sx={{ color: 'black', fontSize: '20px' }} />}
                    title="Season"
                    value={currentSeason.name}
                    description={currentSeason.message}
                />

                <FactorBox
                    icon={<AccessTimeIcon sx={{ color: 'black', fontSize: '20px' }} />}
                    title="Peak Hours"
                    value={
                        avgPeakHoursStart && avgPeakHoursEnd
                            ? `${avgPeakHoursStart} - ${avgPeakHoursEnd}`
                            : 'N/A'
                    }
                    description="Average usage interval across all days."
                />
            </Box>

            {/* Action Buttons */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 2,
                    flexWrap: 'wrap',
                }}
            >
                <Button
                    variant="contained"
                    onClick={() => navigate(-1)}
                    sx={{
                        flex: 1,
                        backgroundColor: '#000',
                        color: '#fff',
                        textTransform: 'none',
                        p: { xs: '10px 20px', sm: '14px 28px' },
                        borderRadius: '8px',
                        ':hover': { backgroundColor: '#333' },
                    }}
                >
                    Go Back
                </Button>
                <Button
                    variant="contained"
                    onClick={handleOpenRemoveDialog}
                    sx={{
                        flex: 1,
                        backgroundColor: '#000',
                        color: '#fff',
                        textTransform: 'none',
                        p: { xs: '10px 20px', sm: '14px 28px' },
                        borderRadius: '8px',
                        ':hover': { backgroundColor: '#333' },
                    }}
                >
                    Remove Device
                </Button>
            </Box>

            {/* Remove Confirmation Dialog */}
            <ConfirmationDialog
                open={openRemoveDialog}
                title={`Remove ${device?.deviceName || device?.name || 'Device'}?`}
                message="Are you sure you want to remove this device? This action cannot be undone."
                onCancel={handleCloseRemoveDialog}
                onConfirm={handleConfirmRemove}
                confirmLabel="Remove"
                cancelLabel="Cancel"
                confirmColor="error"
            />
        </Box>
    );
};

export default DeviceDetails;