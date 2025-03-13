import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSolarPanelViewModel } from '../../viewModels/solarPanelViewModel';
import FactorBox from '../components/FactorBox';
import ToggleViewButtons from '../components/ToggleViewButtons';
import ConsumptionChart from '../components/ConsumptionChart';
import ConfirmationDialog from '../components/ConfirmationDialog';
import LoadingState from '../components/LoadingState';

// Icons
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import NatureIcon from '@mui/icons-material/Nature';

/**
 * SolarPanelManagement Component
 * Shows detailed information about a solar panel
 */
const SolarPanelManagement: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Use the solar panel view model
    const {
        solarPanel,
        weatherData,
        view,
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
    } = useSolarPanelViewModel(id);

    // Load solar panel on mount (handled in the view model)

    // Handle confirmation of panel removal
    const handleConfirmRemove = async () => {
        const success = await deleteSolarPanel();
        if (success) {
            navigate('/management');
        }
    };

    // Get view options for toggle buttons
    const viewOptions = [
        { value: 'week', label: 'W' },
        { value: 'month', label: 'M' },
    ];

    // Loading state
    if (loading) {
        return <LoadingState message="Loading solar panel data..." />;
    }

    // Error state
    if (error) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="error">{error}</Typography>
                <Button
                    variant="contained"
                    onClick={() => loadSolarPanel(id)}
                    sx={{ mt: 2 }}
                >
                    Retry
                </Button>
            </Box>
        );
    }

    // No panel found
    if (!solarPanel) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Solar panel not found.</Typography>
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

    // Get display name
    const displayName =
        solarPanel.deviceName && solarPanel.deviceName.trim() !== ''
            ? solarPanel.deviceName
            : solarPanel.name || 'Solar Panel';

    // Format last updated date
    const lastUpdatedDate = solarPanel.lastUpdated ? new Date(solarPanel.lastUpdated) : new Date();
    const lastUpdatedString = lastUpdatedDate.toLocaleDateString();

    // Get chart data
    const chartData = getCurrentChartData();
    const maxValue = getChartMaxValue();

    // Chart options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, suggestedMax: maxValue, grid: { display: false } },
        },
    };

    // @ts-ignore
    return (
        <Box sx={{ p: 3, maxWidth: 600, margin: '0 auto' }}>
            {/* Heading */}
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                {displayName}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Last updated {lastUpdatedString}
            </Typography>

            {/* Energy Production Section */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Energy Production
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
                <ToggleViewButtons
                    view={view}
                    options={viewOptions}
                    onChange={handleViewToggle}
                />
            </Box>
            <ConsumptionChart
                data={chartData}
                height={250}
                maxValue={maxValue}
            />

            {/* Savings Section */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Savings
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
                Monthly Production: {monthlyProduction.toFixed(2)} kWh
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
                Monthly Consumption: {monthlyConsumption.toFixed(2)} kWh
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
                This solar panel has contributed to{' '}
                <strong>{Math.round(savingsPercentage)}%</strong> of your energy independence this month.
            </Typography>

            {/* External Factors */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                External Factors
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <FactorBox
                    icon={<WbSunnyIcon sx={{ color: 'black', fontSize: '20px' }} />}
                    title="Weather"
                    value={
                        weatherData
                            ? `${Math.round(weatherData.temp.day)}°C, ${weatherData.clouds}% cloud cover`
                            : 'Loading...'
                    }
                    description={
                        weatherData && weatherData.clouds < 50
                            ? 'Sunny weather boosts solar panel efficiency. Expect good energy production today.'
                            : 'Cloud cover might reduce output. Energy production may be lower than usual.'
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
                    value="9 AM - 3 PM"
                    description="Peak hours are when your panel generates the most energy. Use high-energy devices during this time to maximize efficiency."
                />
            </Box>

            {/* Bottom Buttons */}
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
                title={`Remove ${solarPanel.name || 'Solar Panel'}?`}
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

export default SolarPanelManagement;