// src/views/components/ConsumptionChart.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, ChartData, LineElement, PointElement, LineController, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';

// ✅ Register Chart.js components
ChartJS.register(
    LineElement,
    PointElement,
    LineController,
    CategoryScale,
    LinearScale,
    Title,
    Tooltip,
    Legend
);

interface ConsumptionChartProps {
    data: ChartData<'line'>;
    height?: number;
    maxValue?: number;
    loading?: boolean;
}

const ConsumptionChart: React.FC<ConsumptionChartProps> = ({
    data,
    height = 250,
    maxValue,
    loading = false,
}) => {
    return (
        <Box sx={{ height: height, mb: 3 }}>
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography>Loading chart data...</Typography>
                </Box>
            ) : data.datasets[0].data.length > 0 ? (
                <Line
                    data={data}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: {
                                beginAtZero: true,
                                min: 0,
                                max: maxValue,
                            },
                        },
                    }}
                />
            ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography>No data available for the selected timeframe.</Typography>
                </Box>
            )}
        </Box>
    );
};

export default ConsumptionChart;
