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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import categoriesData from "../assets/categories.json"; // Import the JSON file

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<{ name: string; category: string }[]>([]);
  const navigate = useNavigate();

  // Load devices from localStorage on component mount
  useEffect(() => {
    const savedDevices = JSON.parse(localStorage.getItem("devices") || "[]");
    setDevices(savedDevices);
  }, []);

  const handleDelete = (index: number) => {
    const updatedDevices = devices.filter((_, i) => i !== index);
    setDevices(updatedDevices);
    localStorage.setItem("devices", JSON.stringify(updatedDevices));
  };

  const handleEdit = (index: number) => {
    const deviceToEdit = devices[index];
    navigate("/form", { state: { device: deviceToEdit, index } });
  };

  const getCategoryIcon = (category: string): string => {
    const categoryInfo = categoriesData.categories.find((item) => item.name === category);
    return categoryInfo ? categoryInfo.icon : categoriesData.defaultIcon;
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        height: "100vh",
        backgroundColor: "#fff",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          marginBottom: "24px",
          textAlign: "left",
        }}
      >
        <Typography variant="h6" fontWeight="bold" sx={{ marginBottom: "8px" }}>
          Device Management
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          List of Devices
        </Typography>
      </Box>

      {/* Device List */}
      {devices.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center", marginTop: "20px" }}>
          No devices added yet. Click "Add New Device" to get started.
        </Typography>
      ) : (
        <List sx={{ marginBottom: "16px" }}>
          {devices.map((device, index) => (
            <ListItem
              key={index}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
              }}
            >
              <ListItemAvatar>
                <Avatar
                  src={getCategoryIcon(device.category)}
                  alt={`${device.category} Icon`}
                  sx={{
                    backgroundColor: "transparent",
                  }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={device.name}
                secondary={device.category}
                sx={{ textAlign: "left" }}
              />
              <Box>
                <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(index)}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(index)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            </ListItem>
          ))}
        </List>
      )}

      {/* Add Device Button */}
      <Box sx={{ textAlign: "center", marginTop: "20px" }}>
        <Button
          variant="contained"
          onClick={() => navigate("/form")}
          sx={{
            backgroundColor: "#2C2C2C",
            color: "white",
            textTransform: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            ":hover": {
              backgroundColor: "#1F1F1F",
            },
          }}
        >
          Add Device
        </Button>
      </Box>
    </Box>
  );
};

export default DeviceManagement;
