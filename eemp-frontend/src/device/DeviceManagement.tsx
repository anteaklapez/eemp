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
  TextField,
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import { useNavigate } from "react-router-dom";
import categoriesData from "../assets/categories.json"; // Import the JSON file

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<{ name: string; category: string }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedName, setEditedName] = useState<string>("");
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
    setEditingIndex(index);
    setEditedName(devices[index].name);
  };

  const handleSaveEdit = (index: number) => {
    const updatedDevices = [...devices];
    updatedDevices[index].name = editedName;
    setDevices(updatedDevices);
    localStorage.setItem("devices", JSON.stringify(updatedDevices));
    setEditingIndex(null);
  };

 const getCategoryIcon = (category: string): string => {
  const categoryInfo = categoriesData.categories.find((item) => item.name === category);
  return categoryInfo ? categoryInfo.icon : categoriesData.defaultIcon;
};


  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        padding: "16px",
        backgroundColor: "#fff",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <Typography variant="h6" fontWeight="bold">
          Device Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate("/form")}
          sx={{
            backgroundColor: "#2C2C2C",
            color: "white",
            textTransform: "none",
            ":hover": {
              backgroundColor: "#1F1F1F",
            },
          }}
        >
          Add New Device
        </Button>
      </Box>
      <Typography variant="subtitle1" color="text.secondary" sx={{ marginBottom: "16px" }}>
        List of Devices
      </Typography>

      {/* Device List */}
      {devices.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center", marginTop: "20px" }}>
          No devices added yet. Click "Add New Device" to get started.
        </Typography>
      ) : (
        <List>
          {devices.map((device, index) => (
            <ListItem
              key={index}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                paddingLeft: 0,
                paddingRight: 0,
              }}
            >
              <ListItemAvatar>
                <Avatar
                  src={getCategoryIcon(device.category)} // Dynamically set the icon based on category
                  alt={`${device.category} Icon`}
                  sx={{
                    backgroundColor: "transparent",
                  }}
                />
              </ListItemAvatar>
              {editingIndex === index ? (
                <TextField
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  fullWidth
                  sx={{ marginRight: "16px" }}
                />
              ) : (
                <ListItemText primary={device.name} secondary={device.category} />
              )}
              <Box>
                {editingIndex === index ? (
                  <IconButton edge="end" aria-label="save" onClick={() => handleSaveEdit(index)}>
                    <CheckIcon />
                  </IconButton>
                ) : (
                  <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(index)}>
                    <EditIcon />
                  </IconButton>
                )}
                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(index)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default DeviceManagement;
