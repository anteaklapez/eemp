import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Device interfaces
interface PowerRating {
  value: number;
  unit: string;
}

interface UsageTime {
  start: string;
  end: string;
}

interface UsagePattern {
  usage_times: UsageTime[];
}

interface Room {
  roomId: string;
  roomName: string;
  roomType: string;
}

interface Device {
  deviceId?: string;
  deviceName?: string;
  name?: string;
  panelName?: string;
  powerRating?: PowerRating;
  powerRatingValue?: string;
  powerRatingUnit?: string;
  usagePattern?: UsagePattern;
  deviceCategory?: string;
  category?: string;
  energyType: string;
  standbyPower?: PowerRating;
  quantity?: number;
  room?: Room;
  customSolarPanelData?: any;
  usageTimes?: UsageTime[];
  lastUpdated?: string;
}

// Location interface
interface UserLocation {
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  timezone: string;
}

// Chart data interface
interface ChartDataPoint {
  name: string;
  value: number;
}

// Data interfaces
interface ConsumptionData {
  day: ChartDataPoint[];
  week: ChartDataPoint[];
}

interface ProductionData extends ConsumptionData {
  year: ChartDataPoint[];
}

interface CategoryConsumption {
  [category: string]: number;
}

const DashboardPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State variables
  const [mode, setMode] = useState('consumption');
  const [timeframe, setTimeframe] = useState('day');
  const [devices, setDevices] = useState<Device[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [consumptionData, setConsumptionData] = useState<ConsumptionData>({
    day: [],
    week: [],
  });
  const [productionData, setProductionData] = useState<ProductionData>({
    day: [],
    week: [],
    year: [],
  });
  const [categoryConsumption, setCategoryConsumption] =
    useState<CategoryConsumption>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalConsumption, setTotalConsumption] = useState<number>(0);
  const [totalProduction, setTotalProduction] = useState<number>(0);

  // Helper: calculate consumption from devices (non-solar)
  const calculateDevicesTotalConsumption = (devicesList: Device[]): number => {
    return devicesList.reduce((sum, device) => {
      const isSolar =
        device.deviceCategory === 'Solar Panel' ||
        (device.category && device.category === 'Solar Panel');
      if (isSolar) return sum; // exclude solar panels
      const usageTimes = device.usagePattern?.usage_times || [];
      const dailyUsageHours = usageTimes.reduce((total: number, time: UsageTime) => {
        const start = new Date(time.start);
        const end = new Date(time.end);
        return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);
      // Get power value from either powerRating or powerRatingValue
      const power =
        device.powerRating?.value ||
        (device.powerRatingValue ? Number(device.powerRatingValue) : 0);
      // Determine unit and calculate consumption accordingly.
      const unit = device.powerRating?.unit?.toLowerCase() || 'w';
      let consumption = 0;
      if (unit === 'w') {
        consumption = (power * (device.quantity || 1) * dailyUsageHours) / 1000;
      } else if (unit === 'kwh') {
        consumption = power * (device.quantity || 1) * dailyUsageHours;
      } else {
        // Fallback: assume watts
        consumption = (power * (device.quantity || 1) * dailyUsageHours) / 1000;
      }
      return sum + consumption;
    }, 0);
  };

  useEffect(() => {
    // Load data from localStorage
    const loadFromLocalStorage = (key: string, defaultValue: any) => {
      try {
        const storedData = localStorage.getItem(key);
        if (storedData) {
          return JSON.parse(storedData);
        }
        return defaultValue;
      } catch (err) {
        console.error(`Error loading ${key} from localStorage:`, err);
        return defaultValue;
      }
    };

    const loadInitialData = () => {
      setLoading(true);
      try {
        const devicesData = loadFromLocalStorage('devices', []);
        const locationData = loadFromLocalStorage('userLocation', null);
        const energyData = loadFromLocalStorage('energyData', null);

        setDevices(devicesData);
        setUserLocation(locationData);

        // Process energy data if available
        if (energyData) {
          // Consumption data
          if (energyData.consumption) {
            if (energyData.consumption.hourly) {
              const hourlyData = processHourlyConsumptionData(
                energyData.consumption.hourly
              );
              setConsumptionData((prev) => ({ ...prev, day: hourlyData }));
            }
            if (energyData.consumption.daily) {
              const dailyData = processDailyConsumptionData(
                energyData.consumption.daily
              );
              setConsumptionData((prev) => ({ ...prev, week: dailyData }));

              // Calculate total consumption from energyData
              const totalConsumptionVal = calculateTotalConsumption(
                energyData.consumption.daily
              );
              // If totalConsumptionVal is 0, fallback to device consumption calculation.
              if (totalConsumptionVal === 0) {
                const devicesConsumption = calculateDevicesTotalConsumption(devicesData);
                setTotalConsumption(parseFloat(devicesConsumption.toFixed(2)));
              } else {
                setTotalConsumption(totalConsumptionVal);
              }
            }
          }

          // Production data
          if (energyData.production) {
            if (energyData.production.hourly) {
              const hourlyData = processHourlyProductionData(
                energyData.production.hourly
              );
              setProductionData((prev) => ({ ...prev, day: hourlyData }));
            }
            if (energyData.production.daily) {
              const dailyData = processDailyProductionData(
                energyData.production.daily
              );
              setProductionData((prev) => ({ ...prev, week: dailyData }));
            }
            if (energyData.production.yearly) {
              const yearlyData = processYearlyProductionData(
                energyData.production.yearly
              );
              setProductionData((prev) => ({ ...prev, year: yearlyData }));
            }
            if (energyData.production.daily) {
              const totalProductionVal = calculateTotalProduction(
                energyData.production.daily
              );
              setTotalProduction(totalProductionVal);
            }
          }

          // Consumption by category (using devices)
          if (devicesData.length > 0) {
            const categories = calculateCategoryConsumption(devicesData);
            setCategoryConsumption(categories);
          }
        } else {
          // Fallback: if no energyData, calculate consumption from devices
          const devicesConsumption = calculateDevicesTotalConsumption(devicesData);
          setTotalConsumption(parseFloat(devicesConsumption.toFixed(2)));
        }
      } catch (err) {
        console.error('Error loading data from localStorage:', err);
        setError('Failed to load energy data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Process hourly consumption data
  const processHourlyConsumptionData = (hourlyData: any): ChartDataPoint[] => {
    if (!hourlyData || !hourlyData.energy_output) return [];
    return Object.entries(hourlyData.energy_output).map(([timestamp, energy]) => ({
      name: new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        hour12: true,
      }),
      value: parseFloat(Number(energy).toFixed(2)),
    }));
  };

  // Process daily consumption data
  const processDailyConsumptionData = (dailyData: any): ChartDataPoint[] => {
    if (!dailyData || !dailyData.energy_output) return [];
    return Object.entries(dailyData.energy_output).map(([timestamp, energy]) => ({
      name: new Date(timestamp).toLocaleDateString([], { weekday: 'short' }),
      value: parseFloat(Number(energy).toFixed(2)),
    }));
  };

  // Process hourly production data
  const processHourlyProductionData = (hourlyData: any): ChartDataPoint[] => {
    if (!hourlyData || !hourlyData.energy_output) return [];
    return Object.entries(hourlyData.energy_output).map(([timestamp, energy]) => ({
      name: new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        hour12: true,
      }),
      value: parseFloat(Number(energy).toFixed(2)),
    }));
  };

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
      name: new Date(month + '-01').toLocaleDateString([], { month: 'short' }),
      value: parseFloat(Number(energy).toFixed(2)),
    }));
  };

  // Calculate total consumption from energyData.daily
  const calculateTotalConsumption = (dailyData: any): number => {
    if (!dailyData || !dailyData.daily_consumption) return 0;
    const total = dailyData.daily_consumption.reduce(
      (sum: number, item: any) => sum + item.consumption,
      0
    );
    return parseFloat(total.toFixed(2));
  };

  // Calculate total production from energyData.daily
  const calculateTotalProduction = (dailyData: any): number => {
    if (!dailyData || !dailyData.energy_output) return 0;
    const energyOutput = dailyData.energy_output as Record<string, number>;
    const total = Object.values(energyOutput).reduce((sum, value) => sum + value, 0);
    return parseFloat(total.toFixed(2));
  };

  // Calculate consumption by category from devices
  const calculateCategoryConsumption = (devicesList: Device[]) => {
    const catConsumption: CategoryConsumption = {};
    devicesList.forEach((device) => {
      const isSolar =
        device.deviceCategory === 'Solar Panel' ||
        (device.category && device.category === 'Solar Panel');
      let category: string;
      let powerW: number;
      let quantity: number;
      let usageTimes: UsageTime[];

      if (isSolar) {
        category = 'Solar Panel';
        powerW = parseFloat(device.powerRatingValue || '') || 0;
        quantity = device.quantity || 1;
        usageTimes = device.usageTimes || device.usagePattern?.usage_times || [];
      } else {
        category = device.deviceCategory || 'Other';
        powerW = device.powerRating?.value || 0;
        quantity = device.quantity || 1;
        usageTimes = device.usagePattern?.usage_times || [];
      }

      if (!catConsumption[category]) {
        catConsumption[category] = 0;
      }

      const dailyUsageHours = usageTimes.reduce((total: number, time: UsageTime) => {
        const start = new Date(time.start);
        const end = new Date(time.end);
        return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      // For non-solar devices, check unit for conversion
      let dailyConsumption = 0;
      if (!isSolar) {
        const unit = device.powerRating?.unit?.toLowerCase() || 'w';
        if (unit === 'w') {
          dailyConsumption = (powerW * quantity * dailyUsageHours) / 1000;
        } else if (unit === 'kwh') {
          dailyConsumption = powerW * quantity * dailyUsageHours;
        } else {
          dailyConsumption = (powerW * quantity * dailyUsageHours) / 1000;
        }
      } else {
        dailyConsumption = (powerW * quantity * dailyUsageHours) / 1000;
      }
      catConsumption[category] += dailyConsumption;
    });
    return catConsumption;
  };

  // Get current chart data based on mode and timeframe
  const currentData =
    mode === 'consumption'
      ? consumptionData[timeframe as keyof ConsumptionData]
      : productionData[timeframe as keyof ProductionData];

  const totalKwh = mode === 'consumption' ? totalConsumption : totalProduction;

  const handleModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: string | null
  ) => {
    if (newValue) {
      setMode(newValue);
      if (newValue === 'consumption' && timeframe === 'year') {
        setTimeframe('week');
      }
    }
  };

  const handleTimeframeChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: string | null
  ) => {
    if (newValue) setTimeframe(newValue);
  };

  const chartWidth = currentData?.length
    ? timeframe === 'day'
      ? currentData.length * 40
      : currentData.length * 80
    : 600;

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

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
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
      {userLocation && (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem', fontFamily: 'inherit' }}>
            Location:{' '}
            {userLocation.name ||
              `${userLocation.latitude.toFixed(2)}, ${userLocation.longitude.toFixed(2)}`}
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
          onChange={handleModeChange}
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
          onChange={handleTimeframeChange}
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

      {/* Device Summary - now excluding Solar Panels */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, fontFamily: 'inherit' }}>
          Device Summary
        </Typography>
        {devices.filter(device => {
          const isSolar =
            device.deviceCategory === 'Solar Panel' ||
            (device.category && device.category === 'Solar Panel');
          return !isSolar;
        }).length > 0 ? (
          <Box sx={{ pl: 2 }}>
            {devices
              .filter(device => {
                const isSolar =
                  device.deviceCategory === 'Solar Panel' ||
                  (device.category && device.category === 'Solar Panel');
                return !isSolar;
              })
              .map((device) => {
                const displayName = device.deviceName || 'Unnamed Device';
                let displayPower: string;
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
                return (
                  <Box
                    key={device.deviceId || device.name}
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
    </Box>
  );
};

export default DashboardPage;
