import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
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
import NatureIcon from '@mui/icons-material/Nature';

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
  deviceName?: string;
  name?: string;
  lastUpdated?: string;
  powerRating?: { value: number; unit: string };
  standbyPower?: { value: number; unit: string };
  usagePattern?: { usage_times: Array<{ start: string; end: string }> };
  // ... any other fields
}

interface ChartDataPoint {
  name: string;
  value: number;
}

interface FactorBoxProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}

const FactorBox: React.FC<FactorBoxProps> = ({ icon, title, value, description }) => (
  <Box
    sx={{
      backgroundColor: '#F5F5F5',
      p: 2,
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      width: '100%',
      boxSizing: 'border-box',
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography variant="body2" fontWeight="bold" sx={{ color: '#6B97A4', fontSize: '16px' }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '16px', color: '#000' }}>
        {value}
      </Typography>
    </Box>
    <Typography variant="caption" color="text.secondary">
      {description}
    </Typography>
  </Box>
);

// Helper to determine current season
const getCurrentSeason = () => {
  const now = new Date();
  const month = now.getMonth();
  if (month >= 3 && month <= 4) {
    return {
      name: 'Spring',
      message: 'Daylight hours increasing; decreased lighting and heating usage expected.',
    };
  }
  if (month >= 5 && month <= 7) {
    return {
      name: 'Summer',
      message: 'Long daylight hours; minimal lighting and maximum cooling usage expected.',
    };
  }
  if (month >= 8 && month <= 10) {
    return {
      name: 'Fall',
      message: 'Daylight hours decreasing; increased lighting and heating usage expected.',
    };
  }
  return {
    name: 'Winter',
    message: 'Short daylight hours; maximum lighting and heating usage expected.',
  };
};

const SolarPanelManagement: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Device info loaded from localStorage
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);

  // Production chart data (weekly vs monthly)
  const [view, setView] = useState<'week' | 'month'>('week');
  const [weeklyData, setWeeklyData] = useState<ChartDataPoint[]>([]);
  const [monthlyData, setMonthlyData] = useState<ChartDataPoint[]>([]);

  // Summaries for monthly production & consumption
  const [monthlyProduction, setMonthlyProduction] = useState<number>(0);
  const [monthlyConsumption, setMonthlyConsumption] = useState<number>(0);

  // Final savings percentage
  const [savingsPercentage, setSavingsPercentage] = useState<number>(0);

  // Weather data
  const [weatherData, setWeatherData] = useState<any>(null);

  // Process daily production data into weekly chart data
  const processDailyProductionData = (dailyData: any): ChartDataPoint[] => {
    if (!dailyData || !dailyData.energy_output) return [];
    return Object.entries(dailyData.energy_output).map(([timestamp, energy]) => ({
      name: new Date(timestamp).toLocaleDateString([], { weekday: 'short' }),
      value: parseFloat(Number(energy).toFixed(2)),
    }));
  };

  // Process yearly production data into monthly chart data
  const processMonthlyProductionData = (yearlyData: any): ChartDataPoint[] => {
    if (!yearlyData || !yearlyData.energy_output) return [];
    return Object.entries(yearlyData.energy_output).map(([month, energy]) => ({
      name: month,
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
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(userLocation),
            }
          );
          const data = await response.json();
          console.log('[SolarPanelManagement] Weather data fetched:', data);
          setWeatherData(data.daily[0]);
        } catch (error) {
          console.error('Error fetching weather data:', error);
        }
      } else {
        console.log('[SolarPanelManagement] No userLocation found in localStorage.');
      }
    };
    fetchWeatherData();
  }, []);

  // Load device info from localStorage
  useEffect(() => {
    const storedDevices = JSON.parse(localStorage.getItem('devices') || '[]');
    console.log('[SolarPanelManagement] storedDevices:', storedDevices);
    const foundDevice = storedDevices.find((d: DeviceData) => String(d.id) === String(id));
    console.log('[SolarPanelManagement] foundDevice by ID:', foundDevice);
    if (foundDevice) {
      setDevice(foundDevice);
    }
  }, [id]);

  // Load production data and extract monthly production from yearly data
  useEffect(() => {
    const energyData = JSON.parse(localStorage.getItem('energyData') || '{}');
    console.log('[SolarPanelManagement] energyData loaded from localStorage (production):', energyData);

    if (!energyData) return;

    // Weekly production from daily data
    if (energyData.production?.daily) {
      const weekData = processDailyProductionData(energyData.production.daily);
      console.log('[SolarPanelManagement] Weekly production data:', weekData);
      setWeeklyData(weekData);
    }

    // Monthly production from yearly data
    if (energyData.production?.yearly) {
      const monthData = processMonthlyProductionData(energyData.production.yearly);
      console.log('[SolarPanelManagement] Monthly production data:', monthData);
      setMonthlyData(monthData);

      const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
      console.log('[SolarPanelManagement] currentMonthName:', currentMonthName);

      // Check if there's a matching property in energy_output
      const prodValue = energyData.production.yearly.energy_output[currentMonthName] ?? 0;
      console.log('[SolarPanelManagement] monthlyProduction (prodValue) for current month:', prodValue);

      setMonthlyProduction(prodValue);
    }
  }, []);

  // Compute monthly consumption based on:
  // 1) daily_consumption array, if it exists
  // 2) otherwise daily.energy_output
  // 3) otherwise fallback to device usage pattern
  useEffect(() => {
    const energyData = JSON.parse(localStorage.getItem('energyData') || '{}');
    console.log('[SolarPanelManagement] energyData loaded from localStorage (consumption):', energyData);

    // 1) If daily_consumption array is present
    if (
      energyData &&
      energyData.consumption &&
      energyData.consumption.daily &&
      energyData.consumption.daily.daily_consumption &&
      Array.isArray(energyData.consumption.daily.daily_consumption)
    ) {
      const dailyConsumptionArray = energyData.consumption.daily.daily_consumption;
      console.log('[SolarPanelManagement] daily_consumption array:', dailyConsumptionArray);

      // Sum weekly consumption
      const weeklyConsumption = dailyConsumptionArray.reduce(
        (sum: number, item: any) => sum + item.consumption,
        0
      );
      console.log('[SolarPanelManagement] weeklyConsumption (from daily_consumption):', weeklyConsumption);

      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const weeksInMonth = daysInMonth / 7;
      console.log('[SolarPanelManagement] daysInMonth:', daysInMonth, ' => weeksInMonth:', weeksInMonth);

      const monthlyCons = weeklyConsumption * weeksInMonth;
      console.log('[SolarPanelManagement] monthlyConsumption (from daily_consumption):', monthlyCons);

      setMonthlyConsumption(monthlyCons);

    // 2) Otherwise, if daily.energy_output exists, sum those for the "weekly" total
    } else if (
      energyData &&
      energyData.consumption &&
      energyData.consumption.daily &&
      energyData.consumption.daily.energy_output &&
      typeof energyData.consumption.daily.energy_output === 'object'
    ) {
      const dailyEnergyOutputObj = energyData.consumption.daily.energy_output;
      console.log('[SolarPanelManagement] daily.energy_output object:', dailyEnergyOutputObj);

      // Sum up all values
      const dailyValues = Object.values(dailyEnergyOutputObj) as number[];
      const weeklyConsumption = dailyValues.reduce((sum, val) => sum + val, 0);
      console.log('[SolarPanelManagement] weeklyConsumption (from daily.energy_output):', weeklyConsumption);

      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const weeksInMonth = daysInMonth / 7;
      console.log('[SolarPanelManagement] daysInMonth:', daysInMonth, ' => weeksInMonth:', weeksInMonth);

      const monthlyCons = weeklyConsumption * weeksInMonth;
      console.log('[SolarPanelManagement] monthlyConsumption (from daily.energy_output):', monthlyCons);

      setMonthlyConsumption(monthlyCons);

    // 3) Fallback to device usage pattern
    } else if (device) {
      console.log('[SolarPanelManagement] Fallback to device usage pattern calculation...');

      const powerRatingKW = device.powerRating
        ? device.powerRating.value / (device.powerRating.unit === 'W' ? 1000 : 1)
        : 0;
      const standbyPowerKW = device.standbyPower
        ? device.standbyPower.value / (device.standbyPower.unit === 'W' ? 1000 : 1)
        : 0;

      console.log('[SolarPanelManagement] device:', device);
      console.log('[SolarPanelManagement] powerRatingKW:', powerRatingKW, ' standbyPowerKW:', standbyPowerKW);

      let dailyUsageHours: number[] = [];
      if (device.usagePattern?.usage_times && Array.isArray(device.usagePattern.usage_times)) {
        dailyUsageHours = device.usagePattern.usage_times.map((ut: any) => {
          const start = dayjs(ut.start);
          const end = dayjs(ut.end);
          if (!start.isValid() || !end.isValid()) return 0;
          let hours = end.diff(start, 'hour', true);
          if (hours < 0) hours += 24;
          return Math.min(Math.max(hours, 0), 24);
        });
      } else {
        dailyUsageHours = Array(7).fill(1);
      }

      console.log('[SolarPanelManagement] dailyUsageHours:', dailyUsageHours);

      const computedDailyBreakdown = dailyUsageHours.map((hours) => {
        const activeEnergy = powerRatingKW * hours;
        // These are just example splits; adapt if you have different logic:
        const peakEnergy = activeEnergy * 0.4;
        const offPeakEnergy = activeEnergy * 0.6;
        const standbyEnergy = standbyPowerKW * (24 - hours);
        return { peak: peakEnergy, offPeak: offPeakEnergy, standby: standbyEnergy };
      });

      console.log('[SolarPanelManagement] computedDailyBreakdown:', computedDailyBreakdown);

      const dailyConsumptions = computedDailyBreakdown.map(
        (b) => b.peak + b.offPeak + b.standby
      );
      console.log('[SolarPanelManagement] dailyConsumptions:', dailyConsumptions);

      const sumTotal = dailyConsumptions.reduce((acc, val) => acc + val, 0);
      console.log('[SolarPanelManagement] sumTotal:', sumTotal);

      const avgDailyConsumption = sumTotal / dailyUsageHours.length;
      console.log('[SolarPanelManagement] avgDailyConsumption:', avgDailyConsumption);

      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const weeksInMonth = daysInMonth / 7;
      console.log('[SolarPanelManagement] daysInMonth:', daysInMonth, ' => weeksInMonth:', weeksInMonth);

      const monthlyCons = avgDailyConsumption * weeksInMonth;
      console.log('[SolarPanelManagement] monthlyConsumption (fallback):', monthlyCons);

      setMonthlyConsumption(monthlyCons);
    }
  }, [device]);

  // Compute savings percentage using:
  //   savingsPercentage = (monthlyProduction / monthlyConsumption) * 100
  useEffect(() => {
    console.log('[SolarPanelManagement] monthlyProduction:', monthlyProduction);
    console.log('[SolarPanelManagement] monthlyConsumption:', monthlyConsumption);

    if (monthlyConsumption > 0) {
      const newSavingsPercentage = (monthlyProduction / monthlyConsumption) * 100;
      console.log('[SolarPanelManagement] newSavingsPercentage:', newSavingsPercentage);
      setSavingsPercentage(newSavingsPercentage);
    } else {
      console.log('[SolarPanelManagement] monthlyConsumption is 0, setting savingsPercentage to 0.');
      setSavingsPercentage(0);
    }
  }, [monthlyConsumption, monthlyProduction]);

  // Handler for toggling the production chart view
  const handleViewToggle = (value: 'week' | 'month') => {
    setView(value);
  };

  // Remove device logic
  const handleRemoveDevice = () => setOpenRemoveDialog(true);
  const handleCloseRemoveDialog = () => setOpenRemoveDialog(false);
  const handleConfirmRemove = () => {
    const storedDevices = JSON.parse(localStorage.getItem('devices') || '[]');
    const updatedDevices = storedDevices.filter(
      (d: DeviceData) => String(d.id) !== String(device?.id)
    );
    localStorage.setItem('devices', JSON.stringify(updatedDevices));
    setOpenRemoveDialog(false);
    navigate('/management');
  };

  if (!device) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading solar panel details...</Typography>
      </Box>
    );
  }

  const displayNameFinal =
    device.deviceName && device.deviceName.trim() !== ''
      ? device.deviceName
      : device.name || 'Solar Panel';
  const lastUpdatedDate = device.lastUpdated ? new Date(device.lastUpdated) : new Date();
  const lastUpdatedString = lastUpdatedDate.toLocaleDateString();

  // Build production chart data
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
    ...(view === 'week'
      ? weeklyData.map((d) => d.value)
      : monthlyData.map((d) => d.value)),
    0
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, suggestedMax: maxVal + 2, grid: { display: false } },
    },
  };

  const currentSeason = getCurrentSeason();

  return (
    <Box sx={{ p: 3, maxWidth: 600, margin: '0 auto' }}>
      {/* Heading */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
        {displayNameFinal}
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
          onClick={() => handleViewToggle('week')}
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
          onClick={() => handleViewToggle('month')}
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
          onClick={() => setOpenRemoveDialog(true)}
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
        onClose={() => setOpenRemoveDialog(false)}
        PaperProps={{ sx: { borderRadius: 4, textAlign: 'center', p: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Remove {device.deviceName || device.name || 'Solar Panel'}?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this device? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            onClick={() => setOpenRemoveDialog(false)}
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
