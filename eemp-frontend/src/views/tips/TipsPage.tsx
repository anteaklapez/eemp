import React, { useState } from 'react';
import {
    Box,
    Typography,
    ToggleButtonGroup,
    ToggleButton,
    Collapse,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    Legend as RechartsLegend,
    Tooltip as RechartsTooltip,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useTipsViewModel } from '../../viewModels/tipsViewModel';
import LoadingState from '../components/LoadingState';

/**
 * Tile component for displaying recommendations
 */
interface TileProps {
    title: string;
    suggestion: string;
    savings_predictions: string[];
    efficiency: {
        daily: number;
        monthly: number;
    };
}

const Tile: React.FC<TileProps> = ({
                                       title,
                                       suggestion,
                                       savings_predictions,
                                       efficiency,
                                   }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const handleToggle = () => setIsExpanded(!isExpanded);

    return (
        <Box
            onClick={handleToggle}
            sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: '#f8f8f8',
                cursor: 'pointer',
                border: '1px solid #e0e0e0',
                transition: '0.2s',
                '&:hover': { backgroundColor: '#f2f2f2' },
            }}
        >
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                {title}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                {suggestion}
            </Typography>
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 1 }}>
                    <Typography
                        variant="body2"
                        sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#666' }}
                    >
                        Potential Savings:
                    </Typography>
                    {savings_predictions.map((saving, index) => (
                        <Typography
                            key={index}
                            variant="body2"
                            sx={{ fontSize: '0.8rem', color: '#666' }}
                        >
                            • {saving}
                        </Typography>
                    ))}
                    <Typography
                        variant="body2"
                        sx={{ fontSize: '0.8rem', color: '#666', mt: 1 }}
                    >
                        Daily efficiency gain: {efficiency.daily}%
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ fontSize: '0.8rem', color: '#666' }}
                    >
                        Monthly efficiency gain: {efficiency.monthly}%
                    </Typography>
                </Box>
            </Collapse>
        </Box>
    );
};

/**
 * TipsPage Component
 * Shows recommendations and energy usage analytics
 */
const TipsPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Use tips view model
    const {
        timeframe,
        recommendations,
        roomsConsumption,
        loading,
        error,
        getEfficiencyChartData,
        handleTimeframeChange,
    } = useTipsViewModel();

    // Get chart data for efficiency gains
    const chartData = getEfficiencyChartData();

    // Colors for the pie chart
    const pieColors = [
        '#5A9FA3',
        '#FF8A65',
        '#4DB6AC',
        '#BA68C8',
        '#FFD54F',
        '#90A4AE',
    ];

    // Toggle button style
    const toggleBtnSx = {
        textTransform: 'none',
        width: 36,
        height: 36,
        borderRadius: '50%',
        fontSize: '14px',
        fontWeight: 'bold',
        border: 'none',
        transition: 'background-color 0.2s ease-in-out',
    };

    // Loading state
    if (loading) {
        return <LoadingState message="Loading recommendations..." />;
    }

    // Error state
    if (error) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="error">{error}</Typography>
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
            }}
        >
            {/* Header */}
            <Box sx={{ width: '100%', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                    Recommendations
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
                    Your Personalized Energy-Saving Tips
                </Typography>
            </Box>

            {/* Pie Chart for Energy Consumption by Room */}
            <Box
                sx={{
                    mb: 3,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography variant="subtitle1" sx={{ fontWeight: 400, mb: 1 }}>
                    Energy Consumption by Room
                </Typography>
                {roomsConsumption.length > 0 ? (
                    <PieChart width={320} height={320}>
                        <Pie
                            data={roomsConsumption}
                            dataKey="consumption"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            animationDuration={1000}
                            animationEasing="ease-out"
                        >
                            {roomsConsumption.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={pieColors[index % pieColors.length]}
                                />
                            ))}
                        </Pie>
                        <RechartsTooltip
                            formatter={(value: number) => `${value.toFixed(2)} kWh`}
                        />
                        <RechartsLegend
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            wrapperStyle={{ fontSize: '0.8rem', marginTop: '10px' }}
                        />
                    </PieChart>
                ) : (
                    <Typography variant="body2">
                        No room consumption data available.
                    </Typography>
                )}
            </Box>

            {/* Recommendations from API */}
            <Box sx={{ width: '100%', mb: 4 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                    Today's Suggestions
                </Typography>

                {recommendations.length > 0 ? (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1rem',
                        }}
                    >
                        {recommendations.map((rec, index) => (
                            <Tile
                                key={index}
                                title={rec.title}
                                suggestion={rec.suggestion}
                                savings_predictions={rec.savings_predictions}
                                efficiency={rec.efficiency}
                            />
                        ))}
                    </Box>
                ) : (
                    <Typography sx={{ textAlign: 'center', p: 2 }}>
                        No recommendations available.
                    </Typography>
                )}
            </Box>

            {/* Efficiency Gains - Line Chart Section */}
            <Box sx={{ width: '100%' }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 2,
                    }}
                >
                    <Typography variant="h6" fontWeight="bold">
                        Efficiency Gains
                    </Typography>
                    <ToggleButtonGroup
                        value={timeframe}
                        exclusive
                        onChange={(e, newValue) => newValue && handleTimeframeChange(newValue)}
                        sx={{
                            backgroundColor: '#F8F8F8',
                            border: '1px solid #ddd',
                            p: 0.5,
                            borderRadius: '9999px',
                        }}
                    >
                        <ToggleButton
                            value="weekly"
                            disableRipple
                            sx={{
                                ...toggleBtnSx,
                                backgroundColor:
                                    timeframe === 'weekly'
                                        ? '#6B97A4 !important'
                                        : '#F5F5F5 !important',
                                color: timeframe === 'weekly' ? '#fff' : '#666',
                                '&:hover': {
                                    backgroundColor:
                                        timeframe === 'weekly'
                                            ? '#6B97A4 !important'
                                            : '#F5F5F5 !important',
                                },
                            }}
                        >
                            W
                        </ToggleButton>
                        <ToggleButton
                            value="monthly"
                            disableRipple
                            sx={{
                                ...toggleBtnSx,
                                backgroundColor:
                                    timeframe === 'monthly'
                                        ? '#6B97A4 !important'
                                        : '#F5F5F5 !important',
                                color: timeframe === 'monthly' ? '#fff' : '#666',
                                '&:hover': {
                                    backgroundColor:
                                        timeframe === 'monthly'
                                            ? '#6B97A4 !important'
                                            : '#F5F5F5 !important',
                                },
                            }}
                        >
                            M
                        </ToggleButton>
                        <ToggleButton
                            value="yearly"
                            disableRipple
                            sx={{
                                ...toggleBtnSx,
                                backgroundColor:
                                    timeframe === 'yearly'
                                        ? '#6B97A4 !important'
                                        : '#F5F5F5 !important',
                                color: timeframe === 'yearly' ? '#fff' : '#666',
                                '&:hover': {
                                    backgroundColor:
                                        timeframe === 'yearly'
                                            ? '#6B97A4 !important'
                                            : '#F5F5F5 !important',
                                },
                            }}
                        >
                            Y
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* Line Chart */}
                <Box sx={{ width: '100%', height: 220, mb: 2 }}>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12 }}
                                    interval={'preserveStartEnd'}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="predicted"
                                    stroke="#8884d8"
                                    name="Predicted Efficiency"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="current"
                                    stroke="#82ca9d"
                                    name="Current Efficiency"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <Typography variant="body2" sx={{ textAlign: 'center', py: 4 }}>
                            No data available.
                        </Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default TipsPage;