import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Collapse,
  useMediaQuery,
  useTheme,
  CircularProgress,
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
import dayjs from 'dayjs';

// Recommendation tile component
type TileProps = {
  title: string;
  suggestion: string;
  savings_predictions: string[];
  efficiency: {
    daily: number;
    monthly: number;
  };
};

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

const RecommendationsScreen: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>(
    'weekly'
  );
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Line chart data
  const consumptionDataWeek = [
    { name: 'Mon', current: 15, recommended: 12 },
    { name: 'Tue', current: 18, recommended: 14 },
    { name: 'Wed', current: 25, recommended: 20 },
    { name: 'Thu', current: 22, recommended: 20 },
    { name: 'Fri', current: 30, recommended: 28 },
  ];
  const consumptionDataMonth = [
    { name: 'Apr', current: 20, recommended: 18 },
    { name: 'May', current: 15, recommended: 14 },
    { name: 'Jun', current: 25, recommended: 22 },
    { name: 'Jul', current: 35, recommended: 32 },
    { name: 'Aug', current: 40, recommended: 38 },
    { name: 'Sep', current: 30, recommended: 28 },
    { name: 'Oct', current: 45, recommended: 42 },
  ];
  const consumptionDataYear = [
    { name: 'Jan', current: 10, recommended: 9 },
    { name: 'Feb', current: 12, recommended: 11 },
    { name: 'Mar', current: 20, recommended: 18 },
    { name: 'Apr', current: 15, recommended: 14 },
    { name: 'May', current: 25, recommended: 23 },
    { name: 'Jun', current: 30, recommended: 28 },
    { name: 'Jul', current: 36, recommended: 34 },
    { name: 'Aug', current: 40, recommended: 38 },
    { name: 'Sep', current: 25, recommended: 23 },
    { name: 'Oct', current: 42, recommended: 40 },
    { name: 'Nov', current: 28, recommended: 26 },
    { name: 'Dec', current: 35, recommended: 33 },
  ];
  const consumptionDataSets = {
    week: consumptionDataWeek,
    month: consumptionDataMonth,
    year: consumptionDataYear,
  };
  const currentLineData = consumptionDataSets[timeframe];

  // Fetch recommendations from the backend
  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        // First check if recommendations exist in localStorage
        const storedRecommendations = localStorage.getItem('recommendations');

        if (storedRecommendations) {
          const parsedRecommendations = JSON.parse(storedRecommendations);
          setRecommendations(parsedRecommendations.recommendations || []);
          setEfficiencyData(parsedRecommendations.predicted_efficiency || {});
          setCurrentEfficiencyData(
            parsedRecommendations.current_efficiency || {}
          );
          setLoading(false);
          return;
        }

        // If no stored recommendations, fetch from API
        // Get devices from localStorage
        const storedDevicesStr = localStorage.getItem('devices') || '[]';
        const storedDevices = JSON.parse(storedDevicesStr);

        // Get location from localStorage
        const userLocationStr = localStorage.getItem('userLocation') || '{}';
        const userLocation = JSON.parse(userLocationStr);

        // Prepare location data
        const location = {
          latitude: userLocation.latitude || 45.815399,
          longitude: userLocation.longitude || 15.966568,
          country: userLocation.country || 'Croatia',
          altitude: userLocation.altitude || 122,
          name: userLocation.name || 'Zagreb, Croatia',
          timezone: userLocation.timezone || 'Europe/Zagreb',
        };

        // Find solar panel device
        const solarDevice = storedDevices.find(
          (device) =>
            device.category === 'Solar Panel' ||
            device.deviceCategory === 'Solar Panel'
        );

        // Prepare solar panel data
        let solarPanelData = {
          inverter_name: 'ABB__MICRO_0_3HV_I_OUTD_US_208__208V_',
          module_name: 'Advent_Solar_AS160___2006_',
          tilt: 30.0,
          orientation: 180.0,
          capacity: 300,
          efficiency: 21.5,
          installation_year: 2022,
        };

        // If we have a solar device, use its data
        if (solarDevice) {
          solarPanelData = {
            inverter_name:
              solarDevice.inverter || 'ABB__MICRO_0_3HV_I_OUTD_US_208__208V_',
            module_name: solarDevice.module || 'Advent_Solar_AS160___2006_',
            tilt: parseFloat(solarDevice.tilt) || 30.0,
            orientation: parseFloat(solarDevice.orientation) || 180.0,
            capacity: 300, // Default if not specified
            efficiency: 21.5, // Default if not specified
            installation_year: 2022, // Default if not specified
          };
        }

        // Prepare non-solar devices for the request
        const devices = storedDevices
          .filter(
            (device) =>
              device.category !== 'Solar Panel' &&
              device.deviceCategory !== 'Solar Panel'
          )
          .map((device) => ({
            deviceId: device.deviceId || device.id || '',
            deviceName: device.deviceName || device.name || '',
            powerRating: device.powerRating || {
              value: parseFloat(device.powerRatingValue) || 0,
              unit: device.powerRatingUnit || 'W',
            },
            usagePattern: {
              usage_times:
                device.usagePattern?.usage_times || device.usageTimes || [],
              frequency_unit: 'days',
              frequency_value: 1,
            },
            energyType: device.energyType || 'AC',
            standbyPower: device.standbyPower || {
              value: parseFloat(device.standbyPowerValue) || 0,
              unit: device.standbyPowerUnit || 'W',
            },
            deviceCategory: device.deviceCategory || device.category || '',
            numberOfDevices: parseInt(device.quantity) || 1,
            room: device.room || {
              roomId: device.roomId || '',
              roomName: device.roomName || '',
              roomType: device.roomType || '',
            },
          }));

        // Prepare the request payload
        const payload = {
          location,
          solar_panel_data: solarPanelData,
          devices,
        };

        // Make the API request
        const response = await fetch(
          'https://eemp-backend-production.up.railway.app/recommendations',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();

        // Store recommendations in localStorage for future use
        localStorage.setItem('recommendations', JSON.stringify(data));

        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  // Room consumption data
  const [roomsConsumption, setRoomsConsumption] = useState<
    { name: string; consumption: number }[]
  >([]);

  useEffect(() => {
    const storedDevicesStr = localStorage.getItem('devices') || '[]';
    let storedDevices: any[] = [];
    try {
      storedDevices = JSON.parse(storedDevicesStr);
    } catch (error) {
      console.error('Error parsing devices:', error);
    }

    // Exclude solar devices
    const filteredDevices = storedDevices.filter((dev) => {
      const cat = dev.category || dev.deviceCategory;
      return cat !== 'Solar Panel';
    });

    // Compute consumption for each device (multiplying by quantity)
    const consumptionPerDevice = filteredDevices.map((dev) => {
      if (!dev.room && !dev.roomName && typeof dev.room !== 'string') {
        return null;
      }
      const powerKW =
        dev.powerRating && dev.powerRating.value
          ? Number(dev.powerRating.value) /
            (dev.powerRating.unit === 'W' ? 1000 : 1)
          : 0;
      const standbyKW =
        dev.standbyPower && dev.standbyPower.value
          ? Number(dev.standbyPower.value) /
            (dev.standbyPower.unit === 'W' ? 1000 : 1)
          : 0;

      let avgActiveHours = 1;
      if (
        dev.usagePattern &&
        Array.isArray(dev.usagePattern.usage_times) &&
        dev.usagePattern.usage_times.length > 0
      ) {
        const hoursArr = dev.usagePattern.usage_times.map((ut: any) => {
          const start = dayjs(ut.start);
          const end = dayjs(ut.end);
          if (!start.isValid() || !end.isValid()) return 0;
          let h = end.diff(start, 'hour', true);
          if (h < 0) h += 24;
          return Math.max(0, Math.min(24, h));
        });
        avgActiveHours =
          hoursArr.reduce((a: number, b: number) => a + b, 0) / hoursArr.length;
      }
      const activeConsumption = powerKW * avgActiveHours;
      const standbyConsumption = standbyKW * (24 - avgActiveHours);
      const totalDaily = activeConsumption + standbyConsumption;
      const quantity = Number(dev.quantity) || 1;
      return { room: dev.room, consumption: totalDaily * quantity };
    });

    const roomMap = new Map<string, number>();
    consumptionPerDevice.forEach((item) => {
      if (item && item.room) {
        let roomName = '';
        let roomType = '';
        if (typeof item.room === 'object') {
          roomName = item.room.roomName || '';
          roomType = item.room.roomType || '';
        } else {
          roomName = item.room;
        }
        const key = `${roomName}||${roomType}`;
        const prev = roomMap.get(key) || 0;
        roomMap.set(key, prev + item.consumption);
      }
    });
    const consumptionArray = Array.from(roomMap.entries()).map(
      ([key, consumption]) => {
        const [roomName, roomType] = key.split('||');
        const displayName = roomType ? `${roomName} (${roomType})` : roomName;
        return { name: displayName, consumption };
      }
    );
    setRoomsConsumption(consumptionArray);
  }, []);

  // Colors for the pie chart
  const pieColors = [
    '#5A9FA3',
    '#FF8A65',
    '#4DB6AC',
    '#BA68C8',
    '#FFD54F',
    '#90A4AE',
  ];

  // Timeframe toggle handler
  const handleTimeframeChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: 'weekly' | 'monthly' | 'yearly' | null
  ) => {
    if (newValue) {
      setTimeframe(newValue);
    }
  };

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

  const [efficiencyData, setEfficiencyData] = useState({});
  const [currentEfficiencyData, setCurrentEfficiencyData] = useState({});

  const getChartData = () => {
    const data = efficiencyData[timeframe] || {};
    const currentData = currentEfficiencyData[timeframe] || {};

    return Object.keys(data).map((key) => ({
      name: timeframe === 'yearly' ? key : dayjs(key).format('DD MMM'),
      predicted: data[key],
      current: currentData[key] || 0,
    }));
  };

  const chartData = getChartData();

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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ textAlign: 'center', p: 2 }}>
            {error}
          </Typography>
        ) : recommendations.length > 0 ? (
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
            onChange={handleTimeframeChange}
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

export default RecommendationsScreen;
