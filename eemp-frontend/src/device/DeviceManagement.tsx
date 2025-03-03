import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Avatar,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import categoriesData from '../assets/categories.json';
import { useLocation, useNavigate } from 'react-router-dom';


// Define the raw device type saved in localStorage.
interface RawDevice {
  id?: number;
  deviceId?: string;
  name?: string;
  deviceName?: string;
  category?: string;
  deviceCategory?: string;
  room?: string | { roomId: string; roomName: string; roomType?: string };
  quantity?: number;
  powerRating?: { value: number; unit: string };
  usagePattern?: { usage_times: Array<{ start: string; end: string }> };
  energyType?: string;
  standbyPower?: { value: number; unit: string };
  lastUpdated?: string;
}

// Define a unified device type for display.
interface Device {
  id: string | number;
  name: string;
  category: string;
  // Capture both room name and type.
  room?: { name: string; type: string };
  quantity?: number;
}

interface DerivedRoom {
  key: string; // composite key: room.name + "||" + room.type
  name: string;
  type: string;
}

// Interface for energy data
interface EnergyData {
  consumption: {
    hourly: any;
    daily: any;
  };
  production: {
    hourly: any;
    daily: any;
    yearly: any;
  };
}

const DeviceManagement: React.FC = () => {
  const location = useLocation();
  const [devices, setDevices] = useState<Device[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [selectedRoom, setSelectedRoom] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success',
  });
  const navigate = useNavigate();

  // Base URL for API calls
  const BASE_URL = 'https://eemp-backend-production.up.railway.app';

  // Load devices from localStorage and map them into a unified structure.
  useEffect(() => {
    // Check if we should refresh data based on navigation state
    if (location.state?.refreshData) {
      const rawDevices = JSON.parse(localStorage.getItem('devices') || '[]');
      if (rawDevices.length > 0) {
        setLoading(true);
        fetchAllEnergyData(rawDevices)
          .then(() => {
            setNotification({
              show: true,
              message: 'Device updated and energy data refreshed',
              type: 'success',
            });
          })
          .catch((error) => {
            console.error('Error updating energy data:', error);
            setNotification({
              show: true,
              message: 'Device updated but failed to refresh energy data',
              type: 'error',
            });
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [location.state]);

  // Add this useEffect to load devices when component mounts
useEffect(() => {
  const rawDevices: RawDevice[] = JSON.parse(localStorage.getItem("devices") || "[]");
  const unifiedDevices: any[] = rawDevices.map((device) => ({
    id: device.id || device.deviceId || Date.now(),
    name: device.name || device.deviceName || "Unnamed Device",
    category: device.category || device.deviceCategory || "Unknown",
    room: device.room && typeof device.room === "object"
      ? { name: device.room.roomName, type: device.room.roomType || "" }
      : device.room
      ? { name: device.room, type: "" }
      : undefined,
    quantity: device.quantity || 1,
  }));
  setDevices(unifiedDevices);
}, []);


const fetchAllEnergyData = async (rawDevices: RawDevice[]) => {
  const userLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');

  // Default location if not set
  const location = {
    latitude: userLocation.latitude || 45.815399,
    longitude: userLocation.longitude || 15.966568,
    name: userLocation.name || 'Default Location',
    altitude: userLocation.altitude || 122,
    timezone: userLocation.timezone || 'Europe/Zagreb',
    country: userLocation.country || 'Croatia',
  };

  // Get current date
  const today = new Date();
  const startDate = today.toISOString().split('T')[0];

  // Separate devices into solar panels and other devices
  const solarPanels = rawDevices.filter(device => device.category === "Solar Panel" || device.deviceCategory === "Solar Panel");
  const otherDevices = rawDevices.filter(device => device.category !== "Solar Panel" && device.deviceCategory !== "Solar Panel");

  // Prepare devices for consumption API request
  const devicesForConsumption = otherDevices.map((device) => ({
    deviceId: device.deviceId || device.id,
    deviceName: device.deviceName || device.name,
    powerRating: device.powerRating || { value: 10, unit: 'W' },
    usagePattern: device.usagePattern || {
      usage_times: [
        {
          start: today.toISOString(),
          end: new Date(today.getTime() + 5 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
    energyType: device.energyType || 'AC',
    standbyPower: device.standbyPower || { value: 0.5, unit: 'W' },
    deviceCategory: device.deviceCategory || device.category,
    numberOfDevices: device.quantity || 1,
    room:
      typeof device.room === 'object'
        ? device.room
        : {
            roomId: 'default',
            roomName:
              typeof device.room === 'string' ? device.room : 'Default Room',
            roomType: 'Living Room',
          },
  }));

  // Consumption request body
  const consumptionRequestBody = {
    location,
    start_date: startDate,
    devices: devicesForConsumption,
  };

  // Solar panel data for production (assuming first solar panel for simplicity)
  const solarPanelData = solarPanels.length > 0 ? {
    inverter_name: (solarPanels[0] as any).inverter || 'ABB__MICRO_0_3HV_I_OUTD_US_208__208V_',
    module_name: (solarPanels[0] as any).module || 'Advent_Solar_AS160___2006_',
    tilt: (solarPanels[0] as any).tilt || 30.0,
    orientation: (solarPanels[0] as any).orientation || 180.0,
    capacity: 300, // Assuming default capacity
    efficiency: 21.5, // Assuming default efficiency
    installation_year: 2022, // Assuming default installation year
    number_of_strings: (solarPanels[0] as any).numberOfStrings || 1,
    modules_per_string: (solarPanels[0] as any).modulesPerString || 1
  } : null;

  // Production request body
  const productionRequestBody = solarPanelData ? {
    location,
    solar_panel_data: solarPanelData,
  } : null;

  let energyData: EnergyData = {
    consumption: { hourly: {}, daily: {} },
    production: { hourly: {}, daily: {}, yearly: {} }
  };
  let recommendations = {};

  // Make API calls based on device types
  if (otherDevices.length > 0 && solarPanels.length > 0) {
    // Both consumption and production calls
    const [
      hourlyConsumption,
      dailyConsumption,
      hourlyProduction,
      dailyProduction,
      yearlyProduction,
      recommendationsData,
    ] = await Promise.all([
      fetch(`${BASE_URL}/consumption/hourly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consumptionRequestBody),
      }).then((res) => res.json()),
      fetch(`${BASE_URL}/consumption/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consumptionRequestBody),
      }).then((res) => res.json()),
      fetch(`${BASE_URL}/production/hourly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productionRequestBody),
      }).then((res) => res.json()),
      fetch(`${BASE_URL}/production/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productionRequestBody),
      }).then((res) => res.json()),
      fetch(`${BASE_URL}/production/yearly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productionRequestBody),
      }).then((res) => res.json()),
      fetch(`${BASE_URL}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          solar_panel_data: solarPanelData,
          devices: devicesForConsumption
        }),
      }).then((res) => res.json()),
    ]);

    energyData = {
      consumption: { hourly: hourlyConsumption, daily: dailyConsumption },
      production: { hourly: hourlyProduction, daily: dailyProduction, yearly: yearlyProduction }
    };
    recommendations = recommendationsData;
  } else if (otherDevices.length > 0) {
    // Only consumption call
    const [
      hourlyConsumption,
      dailyConsumption,
      recommendationsData,
    ] = await Promise.all([
      fetch(`${BASE_URL}/consumption/hourly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consumptionRequestBody),
      }).then((res) => res.json()),
      fetch(`${BASE_URL}/consumption/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consumptionRequestBody),
      }).then((res) => res.json()),
      fetch(`${BASE_URL}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          devices: devicesForConsumption
        }),
      }).then((res) => res.json()),
    ]);

    energyData.consumption = { hourly: hourlyConsumption, daily: dailyConsumption };
    recommendations = recommendationsData;
  } else if (solarPanels.length > 0) {
    // Only production call
    const [
      hourlyProduction,
      dailyProduction,
      yearlyProduction,
      recommendationsData,
    ] = await Promise.all([
      fetch(`${BASE_URL}/production/hourly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productionRequestBody),
      }).then((res) => res.json()),
      fetch(`${BASE_URL}/production/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productionRequestBody),
      }).then((res) => res.json()),
      fetch(`${BASE_URL}/production/yearly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productionRequestBody),
      }).then((res) => res.json()),
      fetch(`${BASE_URL}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          solar_panel_data: solarPanelData,
        }),
      }).then((res) => res.json()),
    ]);

    energyData.production = { hourly: hourlyProduction, daily: dailyProduction, yearly: yearlyProduction };
    recommendations = recommendationsData;
  }

  // Store energy data and recommendations in localStorage
  localStorage.setItem('energyData', JSON.stringify(energyData));
  localStorage.setItem('recommendations', JSON.stringify(recommendations));
  localStorage.setItem('energyDataLastUpdated', new Date().toISOString());

  return { energyData, recommendations };
};


  // Derive unique rooms based on both room name and type.
  const derivedRooms: DerivedRoom[] = useMemo(() => {
    const roomMap = new Map<string, DerivedRoom>();
    devices.forEach((device) => {
      if (device.room && device.room.name) {
        const key = `${device.room.name}||${device.room.type}`;
        if (!roomMap.has(key)) {
          roomMap.set(key, {
            key,
            name: device.room.name,
            type: device.room.type,
          });
        }
      }
    });
    return Array.from(roomMap.values());
  }, [devices]);

  // Filter devices by category and by room (using the composite key).
  const filteredDevices = devices.filter((device) => {
    const categoryMatch =
      filterCategory === 'All' || device.category === filterCategory;
    let roomMatch = true;
    if (selectedRoom !== 'All') {
      const deviceRoomKey = device.room
        ? `${device.room.name}||${device.room.type}`
        : '';
      roomMatch = deviceRoomKey === selectedRoom;
    }
    return categoryMatch && roomMatch;
  });

  const handleEdit = (index: number) => {
    // Store a flag in localStorage indicating we should refresh data after editing
    localStorage.setItem('shouldRefreshEnergyData', 'true');
    
    const rawDevices: RawDevice[] = JSON.parse(localStorage.getItem('devices') || '[]');
    const unifiedDevice = devices[index];
    const deviceToEdit = rawDevices.find(
      (device) =>
        (device.id && device.id === unifiedDevice.id) ||
        (device.deviceId && device.deviceId === unifiedDevice.id)
    );
    if (deviceToEdit) {
      navigate('/form', { state: { device: deviceToEdit, index } });
    }
  };  

  const handleDelete = async (index: number) => {
    const updatedDevices = [...devices];
    updatedDevices.splice(index, 1);
    setDevices(updatedDevices);
    
    const rawDevices: RawDevice[] = JSON.parse(localStorage.getItem('devices') || '[]');
    const updatedRawDevices = rawDevices.filter((_, i) => i !== index);
    localStorage.setItem('devices', JSON.stringify(updatedRawDevices));
  
    // If all devices are deleted, clear energy data
    if (updatedRawDevices.length === 0) {
      localStorage.removeItem('energyData');
      localStorage.removeItem('energyDataLastUpdated');
      setNotification({
        show: true,
        message: 'Device removed and energy data cleared',
        type: 'success',
      });
    } else {
      // Otherwise refresh energy data
      setLoading(true);
      try {
        await fetchAllEnergyData(updatedRawDevices);
        setNotification({
          show: true,
          message: 'Device removed and energy data refreshed',
          type: 'success',
        });
      } catch (error) {
        console.error('Error refreshing energy data:', error);
        setNotification({
          show: true,
          message: 'Device removed but failed to refresh energy data',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    }
  };  

  // Navigate to device details.
  const handleViewDetails = (index: number) => {
    const selectedUnifiedDevice = devices[index];
    const rawDevices: RawDevice[] = JSON.parse(
      localStorage.getItem('devices') || '[]'
    );
    const rawDevice = rawDevices.find(
      (d) =>
        (d.id && d.id === selectedUnifiedDevice.id) ||
        (d.deviceId && d.deviceId === selectedUnifiedDevice.id)
    );
    if (!rawDevice) {
      console.warn('No matching raw device found for:', selectedUnifiedDevice);
      return;
    }
    if (
      rawDevice.category === 'Solar Panel' ||
      rawDevice.deviceCategory === 'Solar Panel'
    ) {
      navigate(`/solar-panel-management/${rawDevice.id || rawDevice.deviceId}`);
    } else {
      navigate('/device-details', { state: { device: rawDevice } });
    }
  };

  const getCategoryIcon = (category: string): string => {
    const categoryInfo = categoriesData.categories.find(
      (item) => item.name === category
    );
    return categoryInfo ? categoryInfo.icon : categoriesData.defaultIcon;
  };

  // Handle adding a new device
  const handleAddDevice = () => {
    // Store a flag in localStorage indicating we should refresh data after adding
    localStorage.setItem('shouldRefreshEnergyData', 'true');
    navigate('/form');
  };

  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, show: false });
  };

  // Refresh energy data manually
  const handleRefreshData = async () => {
    const rawDevices: RawDevice[] = JSON.parse(
      localStorage.getItem('devices') || '[]'
    );
    if (rawDevices.length === 0) {
      setNotification({
        show: true,
        message: 'No devices to fetch data for',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      await fetchAllEnergyData(rawDevices);
      setNotification({
        show: true,
        message: 'Energy data refreshed successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Error refreshing energy data:', error);
      setNotification({
        show: true,
        message: 'Failed to refresh energy data',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        maxWidth: 600,
        margin: '0 auto',
        boxSizing: 'border-box',
        backgroundColor: '#fff',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'left' }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
          Device Management
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          List of Devices
        </Typography>
      </Box>

      {/* Filter Dropdowns */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="filter-category-label">Filter by Category</InputLabel>
          <Select
            labelId="filter-category-label"
            value={filterCategory}
            label="Filter by Category"
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <MenuItem value="All">All</MenuItem>
            {categoriesData.categories.map((cat) => (
              <MenuItem key={cat.name} value={cat.name}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel id="filter-room-label">Filter by Room</InputLabel>
          <Select
            labelId="filter-room-label"
            value={selectedRoom}
            label="Filter by Room"
            onChange={(e) => setSelectedRoom(e.target.value)}
          >
            <MenuItem value="All">All</MenuItem>
            {derivedRooms.map((room) => (
              <MenuItem key={room.key} value={room.key}>
                {room.name} {room.type ? `(${room.type})` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Device List */}
      {filteredDevices.length === 0 ? (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ textAlign: 'center', mt: 2 }}
        >
          No devices found.
        </Typography>
      ) : (
        <List sx={{ mb: 2 }}>
          {filteredDevices.map((device, index) => (
            <ListItem
              key={device.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 1,
                cursor: 'pointer',
                transition: 'background 0.2s',
                '&:hover': { backgroundColor: '#f5f5f5' },
              }}
              onClick={() => handleViewDetails(index)}
            >
              <ListItemAvatar>
                <Avatar
                  src={getCategoryIcon(device.category)}
                  alt={`${device.category} Icon`}
                  sx={{ backgroundColor: 'transparent' }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={
                  device.quantity && device.quantity > 1
                    ? `${device.name} (${device.quantity})`
                    : device.name
                }
                secondary={device.category}
                sx={{ textAlign: 'left' }}
              />
              <Box>
                <IconButton
                  edge="end"
                  aria-label="edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(index);
                  }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(index);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </ListItem>
          ))}
        </List>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <Button
          variant="contained"
          onClick={handleAddDevice}
          disabled={loading}
          sx={{
            textTransform: 'none',
            fontSize: { xs: '12px', sm: '14px' },
            p: { xs: 1, sm: 1.5 },
            borderRadius: 2,
            backgroundColor: '#6B97A4',
            '&:hover': { backgroundColor: '#5a8292' },
          }}
        >
          Add Device
        </Button>
      </Box>

      {/* Loading indicator */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={30} />
        </Box>
      )}

      {/* Notification */}
      <Snackbar
        open={notification.show}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.type}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DeviceManagement;
