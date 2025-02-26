import React, { useState, useEffect, useMemo } from "react";
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import categoriesData from "../assets/categories.json";

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

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [selectedRoom, setSelectedRoom] = useState<string>("All");
  const navigate = useNavigate();

  // Load devices from localStorage and map them into a unified structure.
  useEffect(() => {
    const rawDevices: RawDevice[] = JSON.parse(localStorage.getItem("devices") || "[]");
    const unifiedDevices: Device[] = rawDevices.map((device) => ({
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

  // Derive unique rooms based on both room name and type.
  const derivedRooms: DerivedRoom[] = useMemo(() => {
    const roomMap = new Map<string, DerivedRoom>();
    devices.forEach((device) => {
      if (device.room && device.room.name) {
        const key = `${device.room.name}||${device.room.type}`;
        if (!roomMap.has(key)) {
          roomMap.set(key, { key, name: device.room.name, type: device.room.type });
        }
      }
    });
    return Array.from(roomMap.values());
  }, [devices]);

  // Filter devices by category and by room (using the composite key).
  const filteredDevices = devices.filter((device) => {
    const categoryMatch = filterCategory === "All" || device.category === filterCategory;
    let roomMatch = true;
    if (selectedRoom !== "All") {
      const deviceRoomKey = device.room ? `${device.room.name}||${device.room.type}` : "";
      roomMatch = deviceRoomKey === selectedRoom;
    }
    return categoryMatch && roomMatch;
  });

  // Edit handler: retrieve raw device data and navigate to the form.
  const handleEdit = (index: number) => {
    const rawDevices: RawDevice[] = JSON.parse(localStorage.getItem("devices") || "[]");
    const unifiedDevice = devices[index];
    const deviceToEdit = rawDevices.find(
      (device) =>
        (device.id && device.id === unifiedDevice.id) ||
        (device.deviceId && device.deviceId === unifiedDevice.id)
    );
    if (deviceToEdit) {
      navigate("/form", { state: { device: deviceToEdit, index } });
    }
  };

  const handleDelete = (index: number) => {
    const updatedDevices = [...devices];
    updatedDevices.splice(index, 1);
    setDevices(updatedDevices);
    const rawDevices: RawDevice[] = JSON.parse(localStorage.getItem("devices") || "[]");
    const updatedRawDevices = rawDevices.filter((_, i) => i !== index);
    localStorage.setItem("devices", JSON.stringify(updatedRawDevices));
  };

  // Navigate to device details.
  const handleViewDetails = (index: number) => {
    const selectedUnifiedDevice = devices[index];
    const rawDevices: RawDevice[] = JSON.parse(localStorage.getItem("devices") || "[]");
    const rawDevice = rawDevices.find(
      (d) =>
        (d.id && d.id === selectedUnifiedDevice.id) ||
        (d.deviceId && d.deviceId === selectedUnifiedDevice.id)
    );
    if (!rawDevice) {
      console.warn("No matching raw device found for:", selectedUnifiedDevice);
      return;
    }
    if (rawDevice.category === "Solar Panel" || rawDevice.deviceCategory === "Solar Panel") {
      navigate(`/solar-panel-management/${rawDevice.id || rawDevice.deviceId}`);
    } else {
      navigate("/device-details", { state: { device: rawDevice } });
    }
  };

  const getCategoryIcon = (category: string): string => {
    const categoryInfo = categoriesData.categories.find((item) => item.name === category);
    return categoryInfo ? categoryInfo.icon : categoriesData.defaultIcon;
  };

  return (
    <Box
      sx={{
        p: 3,
        maxWidth: 600,
        margin: "0 auto",
        boxSizing: "border-box",
        backgroundColor: "#fff",
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: "left" }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
          Device Management
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          List of Devices
        </Typography>
      </Box>

      {/* Filter Dropdowns */}
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
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
                {room.name} {room.type ? `(${room.type})` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Device List */}
      {filteredDevices.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center", mt: 2 }}>
          No devices found.
        </Typography>
      ) : (
        <List sx={{ mb: 2 }}>
          {filteredDevices.map((device, index) => (
            <ListItem
              key={device.id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                py: 1,
                cursor: "pointer",
                transition: "background 0.2s",
                "&:hover": { backgroundColor: "#f5f5f5" },
              }}
              onClick={() => handleViewDetails(index)}
            >
              <ListItemAvatar>
                <Avatar
                  src={getCategoryIcon(device.category)}
                  alt={`${device.category} Icon`}
                  sx={{ backgroundColor: "transparent" }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={
                  device.quantity && device.quantity > 1
                    ? `${device.name} (${device.quantity})`
                    : device.name
                }
                secondary={device.category}
                sx={{ textAlign: "left" }}
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

      {/* Bottom Button: Add Device */}
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <Button
          variant="contained"
          onClick={() => navigate("/form")}
          sx={{
            backgroundColor: "#000",
            color: "#fff",
            textTransform: "none",
            fontSize: { xs: "12px", sm: "14px" },
            p: { xs: "6px 12px", sm: "8px 16px" },
            borderRadius: "8px",
            ":hover": { backgroundColor: "#333" },
          }}
        >
          Add Device
        </Button>
      </Box>
    </Box>
  );
};

export default DeviceManagement;
