import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';

import WbSunnyIcon from '@mui/icons-material/WbSunny';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DeviceData {
  id?: number | string;
  category?: string;
  name?: string;
  lastUpdated?: string;
  // ... any other fields
}

interface ChartDataPoint {
  name: string;
  value: number;
}

const SolarPanelManagement: React.FC = () => {
  const [weatherData, setWeatherData] = useState<any>(null);
  const { id } = useParams(); // expects route: /solar-panel-management/:id
  const navigate = useNavigate();
  const [view, setView] = useState<'week' | 'month'>('week');
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);

  // New state variables for dynamic production data
  const [weeklyData, setWeeklyData] = useState<ChartDataPoint[]>([]);
  const [monthlyData, setMonthlyData] = useState<ChartDataPoint[]>([]);

  // Process daily production data into a weekly view (using weekday names)
  const processDailyProductionData = (dailyData: any): ChartDataPoint[] => {
    if (!dailyData || !dailyData.energy_output) return [];
    return Object.entries(dailyData.energy_output).map(([timestamp, energy]) => ({
      name: new Date(timestamp).toLocaleDateString([], { weekday: 'short' }),
      value: parseFloat(Number(energy).toFixed(2)),
    }));
  };

  // Process yearly production data into a monthly view (using month abbreviations)
  const processMonthlyProductionData = (yearlyData: any): ChartDataPoint[] => {
    if (!yearlyData || !yearlyData.energy_output) return [];
    return Object.entries(yearlyData.energy_output).map(([month, energy]) => ({
      name: new Date(month + '-01').toLocaleDateString([], { month: 'short' }),
      value: parseFloat(Number(energy).toFixed(2)),
    }));
  };

  // Fetch weather data
  useEffect(() => {
    const fetchWeatherData = async () => {
      const userLocation = JSON.parse(localStorage.getItem('userLocation') || 'null');
      if (userLocation) {
        try {
          const response = await fetch(
            'https://eemp-backend-production.up.railway.app/weather/daily',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(userLocation),
            }
          );
          const data = await response.json();
          setWeatherData(data.daily[0]);
        } catch (error) {
          console.error('Error fetching weather data:', error);
        }
      }
    };

    fetchWeatherData();
  }, []);

  // Load the device from localStorage using id
  useEffect(() => {
    const storedDevices = JSON.parse(localStorage.getItem("devices") || "[]");
    const foundDevice = storedDevices.find(
      (d: DeviceData) => String(d.id) === String(id)
    );
    if (foundDevice) {
      setDevice(foundDevice);
    }
  }, [id]);

  // Load production data from localStorage and process it
  useEffect(() => {
    const energyData = JSON.parse(localStorage.getItem('energyData') || '{}');
    if (energyData && energyData.production) {
      // Process weekly production data from daily production
      if (energyData.production.daily) {
        const weekData = processDailyProductionData(energyData.production.daily);
        setWeeklyData(weekData);
      }
      // Process monthly production data from yearly production data
      if (energyData.production.yearly) {
        const monthData = processMonthlyProductionData(energyData.production.yearly);
        setMonthlyData(monthData);
      }
    }
  }, []);

  if (!device) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading solar panel details...</Typography>
      </Box>
    );
  }

  // Display the device's name in bold; fallback to "Solar Panel"
  const displayName =
    device.name && device.name.trim() !== '' ? device.name : 'Solar Panel';

  // Format last updated date
  const lastUpdatedDate = device.lastUpdated
    ? new Date(device.lastUpdated)
    : new Date();
  const lastUpdatedString = lastUpdatedDate.toLocaleDateString();

  // Build chart data dynamically based on the selected view
  const chartData = {
    labels: view === 'week' ? weeklyData.map((d) => d.name) : monthlyData.map((d) => d.name),
    datasets: [
      {
        label: 'Energy Production',
        data: view === 'week' ? weeklyData.map((d) => d.value) : monthlyData.map((d) => d.value),
        borderColor: '#5A8DEE',
        backgroundColor: 'rgba(90,141,238,0.2)',
        tension: 0.4,
        pointRadius: 6,
      },
    ],
  };

  const maxVal = Math.max(
    ...(view === 'week' ? weeklyData.map((d) => d.value) : monthlyData.map((d) => d.value)),
    0
  );
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } }, // legend hidden
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        suggestedMax: maxVal + 2,
        grid: { display: false },
      },
    },
  };

  // Handlers for remove dialog
  const handleRemoveDevice = () => setOpenRemoveDialog(true);
  const handleCloseRemoveDialog = () => setOpenRemoveDialog(false);
  const handleConfirmRemove = () => {
    const storedDevices = JSON.parse(localStorage.getItem('devices') || '[]');
    const updatedDevices = storedDevices.filter(
      (d: DeviceData) => String(d.id) !== String(device.id)
    );
    localStorage.setItem('devices', JSON.stringify(updatedDevices));
    setOpenRemoveDialog(false);
    navigate('/management');
  };

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
        <ToggleButton
          value="week"
          selected={view === 'week'}
          onClick={() => setView('week')}
          sx={{
            textTransform: 'none',
            width: 42,
            height: 42,
            borderRadius: '50%',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: view === 'week' ? '#6B97A4' : '#F5F5F5',
            color: view === 'week' ? '#fff' : '#000',
            border: 'none',
            transition: 'background-color 0.2s ease-in-out',
            '&.Mui-selected': {
              backgroundColor: '#6B97A4 !important',
              color: '#fff',
            },
            '&:hover': { backgroundColor: '#6B97A4', color: '#fff' },
          }}
        >
          W
        </ToggleButton>
        <ToggleButton
          value="month"
          selected={view === 'month'}
          onClick={() => setView('month')}
          sx={{
            textTransform: 'none',
            width: 42,
            height: 42,
            borderRadius: '50%',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: view === 'month' ? '#6B97A4' : '#F5F5F5',
            color: view === 'month' ? '#fff' : '#000',
            border: 'none',
            transition: 'background-color 0.2s ease-in-out',
            '&.Mui-selected': {
              backgroundColor: '#6B97A4 !important',
              color: '#fff',
            },
            '&:hover': { backgroundColor: '#6B97A4', color: '#fff' },
          }}
        >
          M
        </ToggleButton>
      </Box>
      <Box sx={{ height: 250, mb: 3 }}>
        <Line data={chartData} options={chartOptions} />
      </Box>

      {/* Savings Section */}
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
        Savings
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        This solar panel has contributed to <strong>45%</strong> of your energy
        independence this month.
      </Typography>

      {/* External Factors */}
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
        External Factors
      </Typography>

      {/* Weather Box */}
      <Box
        sx={{
          border: '1px solid #eee',
          borderRadius: 2,
          p: 2,
          mb: 3,
          backgroundColor: '#fafafa',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WbSunnyIcon sx={{ color: '#000', fontSize: '20px' }} />
            <Typography
              variant="body2"
              fontWeight="bold"
              sx={{ color: '#6B97A4', fontSize: '16px' }}
            >
              Weather
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{ color: '#000', fontWeight: 'bold', fontSize: '16px' }}
          >
            {weatherData
              ? `${Math.round(weatherData.temp.day)}°C, ${weatherData.clouds}% cloud cover`
              : 'Loading...'}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {weatherData && weatherData.clouds < 50
            ? 'Sunny weather boosts solar panel efficiency. Expect good energy production today.'
            : 'Cloud cover might reduce output. Energy production may be lower than usual.'}
        </Typography>
      </Box>

      {/* Peak Hours Box */}
      <Box
        sx={{
          border: '1px solid #eee',
          borderRadius: 2,
          p: 2,
          mb: 3,
          backgroundColor: '#fafafa',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon sx={{ color: '#000', fontSize: '20px' }} />
            <Typography
              variant="body2"
              fontWeight="bold"
              sx={{ color: '#6B97A4', fontSize: '16px' }}
            >
              Peak Hours
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{ color: '#000', fontWeight: 'bold', fontSize: '16px' }}
          >
            9 AM - 3 PM
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Peak hours are when your panel generates the most energy. Use high-energy devices during this time to maximize efficiency.
        </Typography>
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
          onClick={handleRemoveDevice}
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
      <Dialog
        open={openRemoveDialog}
        onClose={handleCloseRemoveDialog}
        PaperProps={{
          sx: { borderRadius: 4, textAlign: 'center', p: 3 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Remove {device.name || 'Solar Panel'}?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this device? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleCloseRemoveDialog}
            sx={{
              backgroundColor: '#ccc',
              color: '#000',
              textTransform: 'none',
              borderRadius: '8px',
              ':hover': { backgroundColor: '#aaa' },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmRemove}
            sx={{
              backgroundColor: 'red',
              color: '#fff',
              textTransform: 'none',
              borderRadius: '8px',
              ':hover': { backgroundColor: '#b71c1c' },
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SolarPanelManagement;
