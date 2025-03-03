import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { ChartData } from 'chart.js';
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
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
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

// Icons
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import NatureIcon from '@mui/icons-material/Nature';
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

interface FactorBoxProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}

const FactorBox: React.FC<FactorBoxProps> = ({
  icon,
  title,
  value,
  description,
}) => (
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
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography
          variant="body2"
          fontWeight="bold"
          sx={{
            color: '#6B97A4',
            fontSize: '16px',
          }}
        >
          {title}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        fontWeight="bold"
        sx={{
          fontSize: '16px',
          color: '#000',
        }}
      >
        {value}
      </Typography>
    </Box>
    <Typography variant="caption" color="text.secondary">
      {description}
    </Typography>
  </Box>
);

const DeviceDetails: React.FC = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [view, setView] = useState<'week' | 'month'>('week');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchWeatherData = async () => {
      const userLocation = JSON.parse(localStorage.getItem('userLocation'));
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

  // Get device from route state
  const { device } = (location.state as { device?: any }) || {};

  // For removing device
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);

  // 7-day labels
  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // 1) Convert power ratings to kW
  const powerRatingKW = device?.powerRating
    ? Number(device.powerRating.value) /
      (device.powerRating.unit === 'W' ? 1000 : 1)
    : 0;
  const standbyPowerKW = device?.standbyPower
    ? Number(device.standbyPower.value) /
      (device.standbyPower.unit === 'W' ? 1000 : 1)
    : 0;

  // 2) Compute daily usage hours for each day
  let dailyUsageHours: number[] = Array(7).fill(0);
  if (
    device?.usagePattern?.usage_times &&
    Array.isArray(device.usagePattern.usage_times)
  ) {
    dailyUsageHours = device.usagePattern.usage_times.map((ut: any) => {
      const start = dayjs(ut.start);
      const end = dayjs(ut.end);
      if (!start.isValid() || !end.isValid()) return 0;

      let hours = end.diff(start, 'hour', true);
      // If negative, assume overnight usage
      if (hours < 0) {
        hours += 24;
      }
      // Clamp to [0..24]
      if (hours < 0) hours = 0;
      if (hours > 24) hours = 24;

      return hours;
    });
  } else {
    dailyUsageHours = Array(7).fill(1);
  }

  // 3) Compute energy breakdown per day
  const computedDailyBreakdown = dailyUsageHours.map((hours) => {
    const activeEnergy = powerRatingKW * hours; // kWh
    const peakEnergy = activeEnergy * 0.4; // 40% peak
    const offPeakEnergy = activeEnergy * 0.6; // 60% off-peak
    const standbyEnergy = standbyPowerKW * (24 - hours);
    return { peak: peakEnergy, offPeak: offPeakEnergy, standby: standbyEnergy };
  });

  // 4) Prepare weekly chart data
  const computedDailyConsumptions = computedDailyBreakdown.map(
    (b) => b.peak + b.offPeak + b.standby
  );
  const computedWeeklyData: ChartData<'line'> = {
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

  // 5) Compute weekly sums & averages for monthly data
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
  const computedMonthlyData: ChartData<'line'> = {
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

  // 6) Compute the "peak hours on average" across the entire week
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

  // Last updated info
  const lastUpdatedDate = device?.lastUpdated
    ? new Date(device.lastUpdated)
    : new Date();
  const lastUpdatedString = lastUpdatedDate.toLocaleString();

  const getCurrentSeason = () => {
    const now = new Date();
    const month = now.getMonth();

    if (month >= 3 && month <= 4)
      return {
        name: 'Spring',
        message:
          'Daylight hours increasing; decreased lighting and heating usage expected.',
      };
    if (month >= 5 && month <= 7)
      return {
        name: 'Summer',
        message:
          'Long daylight hours; minimal lighting and maximum cooling usage expected.',
      };
    if (month >= 8 && month <= 10)
      return {
        name: 'Fall',
        message:
          'Daylight hours decreasing; increased lighting and heating usage expected.',
      };
    return {
      name: 'Winter',
      message: 'Short daylight hours; maximum lighting and heating usage expected.',
    };
  };

  // Remove device logic
  const handleOpenRemoveDialog = () => setOpenRemoveDialog(true);
  const handleCloseRemoveDialog = () => setOpenRemoveDialog(false);
  const handleConfirmRemove = () => {
    const storedDevices = JSON.parse(localStorage.getItem('devices') || '[]');
    const updatedDevices = storedDevices.filter(
      (d: any) => d.deviceId !== device.deviceId
    );
    localStorage.setItem('devices', JSON.stringify(updatedDevices));
    setOpenRemoveDialog(false);
    navigate('/management');
  };

  const currentSeason = getCurrentSeason();

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
        <Line
          data={view === 'week' ? computedWeeklyData : computedMonthlyData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                min: 0,
                max:
                  view === 'week'
                    ? Math.max(...computedDailyConsumptions, 1) * 1.2
                    : (averageTotal * 30 || 1) * 1.2,
              },
            },
          }}
        />
      </Box>

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
          value={`${weatherData?.weather[0]?.main}, ${Math.round(
            weatherData?.temp?.day
          )}°C`}
          description={
            weatherData?.weather[0]?.main.toLowerCase() === 'clear'
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
        onClose={handleCloseRemoveDialog}
        PaperProps={{
          sx: { borderRadius: 4, textAlign: 'center', p: 3 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Remove {device?.deviceName || device?.name || 'Device'}?
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

export default DeviceDetails;
