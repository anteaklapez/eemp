import React, { useState, useEffect } from "react";
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import categoriesData from "../assets/categories.json";

// Define Room type
interface Room {
  id: string;
  name: string;
}

interface Device {
  id: number;
  name: string;
  category: string;
  room?: string; // room id if assigned
}

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("All");
  const [openRoomDialog, setOpenRoomDialog] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>("");
  const navigate = useNavigate();

  // Load devices and rooms from localStorage on mount
  useEffect(() => {
    const savedDevices: Device[] = JSON.parse(localStorage.getItem("devices") || "[]");
    setDevices(savedDevices);
    const savedRooms: Room[] = JSON.parse(localStorage.getItem("rooms") || "[]");
    setRooms(savedRooms);
  }, []);

  // Save rooms to localStorage whenever rooms state changes
  useEffect(() => {
    localStorage.setItem("rooms", JSON.stringify(rooms));
  }, [rooms]);

  // Combined filtering: by category and by room
  const filteredDevices = devices.filter((device) => {
    const categoryMatch = filterCategory === "All" || device.category === filterCategory;
    let roomMatch = true;
    if (selectedRoom === "Unassigned") {
      roomMatch = !device.room;
    } else if (selectedRoom !== "All") {
      roomMatch = device.room === selectedRoom;
    }
    return categoryMatch && roomMatch;
  });

  const handleDelete = (index: number) => {
    const updatedDevices = devices.filter((_, i) => i !== index);
    setDevices(updatedDevices);
    localStorage.setItem("devices", JSON.stringify(updatedDevices));
  };

  const handleEdit = (index: number) => {
    const deviceToEdit = devices[index];
    navigate("/form", { state: { device: deviceToEdit, index } });
  };

  // Navigate to details: if Solar Panel, use dedicated route
  const handleViewDetails = (index: number) => {
    const selectedDevice = devices[index];
    if (selectedDevice.category === "Solar Panel") {
      navigate(`/solar-panel-management/${selectedDevice.id}`);
    } else {
      navigate("/device-details", { state: { device: selectedDevice } });
    }
  };

  const getCategoryIcon = (category: string): string => {
    const categoryInfo = categoriesData.categories.find((item) => item.name === category);
    return categoryInfo ? categoryInfo.icon : categoriesData.defaultIcon;
  };

  // Room (Folder) management dialog handlers
  const handleOpenRoomDialog = () => setOpenRoomDialog(true);
  const handleCloseRoomDialog = () => {
    setNewRoomName("");
    setOpenRoomDialog(false);
  };
  const handleSaveRoom = () => {
    if (newRoomName.trim() !== "") {
      // Create a new room with a unique id (using Date.now())
      const newRoom: Room = { id: Date.now().toString(), name: newRoomName.trim() };
      const updatedRooms = [...rooms, newRoom];
      setRooms(updatedRooms);
      localStorage.setItem("rooms", JSON.stringify(updatedRooms));
    }
    handleCloseRoomDialog();
  };

  const handleDeleteRoom = (roomId: string) => {
    const updatedRooms = rooms.filter((room) => room.id !== roomId);
    setRooms(updatedRooms);

    // Also remove the room reference from any devices assigned to this room
    const updatedDevices = devices.map((device) =>
      device.room === roomId ? { ...device, room: undefined } : device
    );
    setDevices(updatedDevices);
    localStorage.setItem("devices", JSON.stringify(updatedDevices));
  };

  return (
    // Outer container with same styling as your Solar Panel page
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
            <MenuItem value="Unassigned">Unassigned</MenuItem>
            {rooms.map((room) => (
              <MenuItem key={room.id} value={room.id}>
                {room.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Rooms List */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        {rooms.map((room) => (
          <Box
            key={room.id}
            sx={{
              border: "1px solid #ccc",
              borderRadius: "8px",
              px: 1,
              py: 0.5,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Typography variant="body2">{room.name}</Typography>
            <IconButton
              size="small"
              onClick={() => handleDeleteRoom(room.id)}
              sx={{ ml: 0.5 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
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
                primary={device.name}
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

      {/* Bottom Buttons: Add Device and Add Room */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
          mt: 6, // increased margin top to push buttons further down
        }}
      >
        <Button
          variant="contained"
          onClick={() => navigate("/form")}
          sx={{
            flex: 1,
            backgroundColor: "#000",
            color: "#fff",
            textTransform: "none",
            fontSize: { xs: "12px", sm: "14px" },
            p: { xs: "6px 12px", sm: "8px 16px" }, // smaller padding for smaller buttons
            borderRadius: "8px",
            ":hover": { backgroundColor: "#333" },
          }}
        >
          Add Device
        </Button>
        <Button
          variant="contained"
          onClick={handleOpenRoomDialog}
          sx={{
            flex: 1,
            backgroundColor: "#000",
            color: "#fff",
            textTransform: "none",
            fontSize: { xs: "12px", sm: "14px" },
            p: { xs: "6px 12px", sm: "8px 16px" },
            borderRadius: "8px",
            ":hover": { backgroundColor: "#333" },
          }}
        >
          Add Room
        </Button>
      </Box>

      {/* Add Room Popup Dialog */}
      <Dialog
        open={openRoomDialog}
        onClose={handleCloseRoomDialog}
        PaperProps={{
          sx: { borderRadius: 4, textAlign: "center", p: 3 },
        }}
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>Add New Room</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            placeholder="Enter room name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleCloseRoomDialog}
            sx={{
              backgroundColor: "#ccc",
              color: "#000",
              textTransform: "none",
              borderRadius: "8px",
              ":hover": { backgroundColor: "#aaa" },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveRoom}
            sx={{
              backgroundColor: "green",
              color: "#fff",
              textTransform: "none",
              borderRadius: "8px",
              ":hover": { backgroundColor: "darkgreen" },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeviceManagement;
