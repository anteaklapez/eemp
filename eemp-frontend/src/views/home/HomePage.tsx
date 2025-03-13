import React from 'react';
import {
    Box,
    Typography,
    ToggleButton,
    ToggleButtonGroup,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { useEnergyViewModel } from '../../viewModels/energyViewModel';
import { useLocationViewModel } from '../../viewModels/locationViewModel';
import { useDeviceViewModel } from '../../viewModels/deviceViewModel';
import LoadingState from '../components/LoadingState';

/**
 * HomePage Component
 * The main dashboard for the application showing energy stats
 */
const HomePage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Use view models
    const {
        loading: energyLoading,
        error: energyError,
        mode,
        timeframe,
        totalConsumption,
        totalProduction,
        categoryConsumption,
        handleModeChange,
        handleTimeframeChange,
        getCurrentChartData,
    } = useEnergyViewModel();

    const { location } = useLocationViewModel();
    const { devices } = useDeviceViewModel();

    // Get current chart data
    const currentData = getCurrentChartData();

    // Get the total kWh based on the selected mode
    const totalKwh = mode === 'consumption' ? totalConsumption : totalProduction;

    // Calculate chart width based on data points
    const chartWidth = currentData?.length
        ? timeframe === 'day'
            ? currentData.length * 40
            : currentData.length * 80
        : 600;

    // Toggle button styles
    const toggleBtnSx = {
        textTransform: 'none' as const,
        width: 36,
        height: 36,
        borderRadius: '50%',
        fontSize: '14px',
        fontWeight: 'bold',
        border: 'none',
        transition: 'background-color 0.2s ease-in-out',
        fontFamily: 'Roboto, sans-serif',
    };

    // Mode toggle styles
    const modeToggleStyles = {
        backgroundColor: '#F8F8F8',
        border: '1px solid #ddd',
        p: 0.5,
        borderRadius: '9999px',
        '& .MuiToggleButton-root': {
            ...toggleBtnSx,
            borderRadius: '17px',
            textTransform: 'none',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            color: '#666',
            minWidth: 110,
            padding: '5px',
            margin: '0 5px',
            '&:hover': { backgroundColor: '#ECECEC' },
            '&.Mui-selected': {
                backgroundColor: '#6B97A4',
                color: '#fff',
                '&:hover': { backgroundColor: '#6B97A4' },
            },
        },
    };

    // Timeframe toggle styles
    const timeframeToggleStyles = {
        backgroundColor: '#F8F8F8',
        border: '1px solid #ddd',
        p: 0.5,
        borderRadius: '9999px',
        '& .MuiToggleButton-root': {
            ...toggleBtnSx,
            borderRadius: '17px',
            textTransform: 'none',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            color: '#666',
            minWidth: 50,
            padding: '5px',
            margin: '0 5px',
            '&:hover': { backgroundColor: '#ECECEC' },
            '&.Mui-selected': {
                backgroundColor: '#6B97A4',
                color: '#fff',
                '&:hover': { backgroundColor: '#6B97A4' },
            },
        },
    };

    // Loading state
    if (energyLoading) {
        return <LoadingState message="Loading energy data..." />;
    }

    // Error state
    if (energyError) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="error">{energyError}</Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                maxWidth: 600,
                mx: 'auto',
                p: isMobile ? 2 : 3,
                pb: 10,
                backgroundColor: '#fff',
                fontFamily: 'Roboto, sans-serif',
            }}
        >
            {/* Top (centered) */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 1, fontFamily: 'inherit' }}>
                    Welcome!
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '1rem', fontFamily: 'inherit' }}>
                    Check out your energy consumption or production below.
                </Typography>
            </Box>

            {/* Location info */}
            {location && (
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem', fontFamily: 'inherit' }}>
                        Location:{' '}
                        {location.name ||
                            `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}
                    </Typography>
                </Box>
            )}

            {/* Overview */}
            <Box sx={{ textAlign: 'left', mb: 4 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, fontFamily: 'inherit' }}>
                    Overview
                </Typography>
                <ToggleButtonGroup
                    value={mode}
                    exclusive
                    onChange={(e, newValue) => newValue && handleModeChange(newValue)}
                    sx={{ ...modeToggleStyles, mb: 2 }}
                >
                    <ToggleButton value="consumption">Consumption</ToggleButton>
                    <ToggleButton value="production">Production</ToggleButton>
                </ToggleButtonGroup>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, fontFamily: 'inherit' }}>
                    {mode === 'consumption'
                        ? `Total Consumption: ${totalKwh} kWh`
                        : `Total Production: ${totalKwh} kWh`}
                </Typography>
                <ToggleButtonGroup
                    value={timeframe}
                    exclusive
                    onChange={(e, newValue) => newValue && handleTimeframeChange(newValue)}
                    sx={timeframeToggleStyles}
                >
                    <ToggleButton value="day">D</ToggleButton>
                    <ToggleButton value="week">W</ToggleButton>
                    {mode === 'production' && <ToggleButton value="year">Y</ToggleButton>}
                </ToggleButtonGroup>
            </Box>

            {/* Bar Chart Section */}
            <Box sx={{ width: '100%', mb: 4, overflowX: 'auto', overflowY: 'hidden', scrollBehavior: 'smooth' }}>
                {currentData && currentData.length > 0 ? (
                    <Box sx={{ width: chartWidth, height: 200, display: 'flex', mx: chartWidth < 600 ? 'auto' : 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={currentData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                                <YAxis hide />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    interval={timeframe === 'day' ? 0 : 'preserveEnd'}
                                    angle={0}
                                    textAnchor="middle"
                                    tick={{
                                        fontSize: 12,
                                        fill: '#666',
                                        fontFamily: 'Roboto, sans-serif',
                                    }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: '1px solid #ccc',
                                        fontFamily: 'Roboto, sans-serif',
                                    }}
                                    formatter={(value) => [
                                        `${value} kWh`,
                                        mode === 'consumption' ? 'Consumption' : 'Production',
                                    ]}
                                />
                                <Bar dataKey="value" fill="#6B97A4" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                            No data available for the selected timeframe.
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Category breakdown (only for consumption) */}
            {mode === 'consumption' && Object.keys(categoryConsumption).length > 0 && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, fontFamily: 'inherit' }}>
                        Consumption by Category
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {Object.entries(categoryConsumption).map(([category, value]) => (
                            <Box
                                key={category}
                                sx={{
                                    p: 2,
                                    backgroundColor: '#f8f8f8',
                                    borderRadius: 2,
                                    border: '1px solid #e0e0e0',
                                    textAlign: 'center',
                                    fontFamily: 'inherit',
                                }}
                            >
                                <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>
                                    {category}
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                    {value.toFixed(2)} kWh
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}

            {/* Devices summary */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, fontFamily: 'inherit' }}>
                    Device Summary
                </Typography>
                {devices.length > 0 ? (
                    <Box sx={{ pl: 2 }}>
                        {devices.map((device) => {
                            const isSolar =
                                device.category === 'Solar Panel' ||
                                device.deviceCategory === 'Solar Panel';
                            const displayName = isSolar
                                ? device.name || 'Unnamed Solar Panel'
                                : device.deviceName || 'Unnamed Device';
                            let displayPower: string;
                            if (isSolar) {
                                const powerValue =
                                    (device.powerRating && device.powerRating.value) ||
                                    Number(device.powerRatingValue) || 0;
                                if (powerValue > 0) {
                                    displayPower =
                                        device.powerRating?.value +
                                        ' ' +
                                        (device.powerRating?.unit || device.powerRatingUnit || '');
                                } else {
                                    displayPower = `${totalProduction} kWh`;
                                }
                            } else {
                                const powerValue =
                                    device.powerRating?.value ||
                                    (device.powerRatingValue ? Number(device.powerRatingValue) : 0);
                                if (powerValue > 0) {
                                    displayPower = device.powerRating
                                        ? `${device.powerRating.value} ${device.powerRating.unit}`
                                        : `${device.powerRatingValue} W`;
                                } else {
                                    displayPower = 'N/A';
                                }
                            }
                            return (
                                <Box
                                    key={device.deviceId || device.id || device.name}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        mb: 1,
                                        p: 1,
                                        borderRadius: 1,
                                        '&:hover': { backgroundColor: '#f5f5f5' },
                                    }}
                                >
                                    <Typography sx={{ fontFamily: 'inherit' }}>
                                        {displayName} ({device.quantity || 1}x)
                                    </Typography>
                                    <Typography sx={{ fontFamily: 'inherit', color: '#666' }}>{displayPower}</Typography>
                                </Box>
                            );
                        })}
                    </Box>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 2, backgroundColor: '#f8f8f8', borderRadius: 2 }}>
                        <Typography color="text.secondary">No devices added yet.</Typography>
                    </Box>
                )}
            </Box>

            {/* Energy saving tips */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, fontFamily: 'inherit' }}>
                    Energy Saving Tips
                </Typography>
                <Box
                    sx={{
                        p: 2,
                        backgroundColor: '#f0f7fa',
                        borderRadius: 2,
                        border: '1px solid #d0e6f0',
                    }}
                >
                    {(() => {
                        try {
                            const tipsData = localStorage.getItem('recommendations');
                            const parsedTips = tipsData ? JSON.parse(tipsData) : {};
                            const tips = parsedTips.recommendations || [];
                            if (tips.length > 0) {
                                return tips.map((tip: any, index: number) => (
                                    <Typography key={index} sx={{ mb: 1, fontFamily: 'inherit' }}>
                                        • {tip.title}: {tip.suggestion}
                                    </Typography>
                                ));
                            } else {
                                return (
                                    <Typography sx={{ fontFamily: 'inherit' }}>
                                        No energy saving tips available.
                                    </Typography>
                                );
                            }
                        } catch (err) {
                            console.error('Error fetching energy saving tips from localStorage', err);
                            return (
                                <Typography sx={{ fontFamily: 'inherit' }}>
                                    No energy saving tips available.
                                </Typography>
                            );
                        }
                    })()}
                </Box>
            </Box>
        </Box>
    );
};

export default HomePage;