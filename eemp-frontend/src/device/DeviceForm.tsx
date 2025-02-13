import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  useTheme,
  Autocomplete,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import categoriesData from "../assets/categories.json";
import locationsData from "../assets/locations.json";

// Extend the form data interface to include id and lastUpdated
interface FormData {
  id?: number | string; // Allow string if using randomUUID
  category: string;
  name: string;
  manufacturerModel: string;
  powerConsumption: string;
  unit: string;
  frequency: string;
  duration: string;
  peakHoursStart: Dayjs | null;
  peakHoursEnd: Dayjs | null;
  location: string;
  environment: string;
  estimatedCost: string;
  lastUpdated?: string;
}

// Define the expected structure of location.state
interface LocationState {
  device?: FormData;
  index?: number;
}

const DeviceForm: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation() as { state?: LocationState };

  const [formData, setFormData] = useState<FormData>({
    category: "",
    name: "",
    manufacturerModel: "",
    powerConsumption: "",
    unit: "",
    frequency: "",
    duration: "",
    peakHoursStart: dayjs(),
    peakHoursEnd: dayjs(),
    location: "",
    environment: "",
    estimatedCost: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Pre-fill form data if editing
  useEffect(() => {
    if (location.state?.device) {
      const device = location.state.device;
      setFormData({
        ...device,
        peakHoursStart: device.peakHoursStart ? dayjs(device.peakHoursStart) : null,
        peakHoursEnd: device.peakHoursEnd ? dayjs(device.peakHoursEnd) : null,
      });
      setIsEditing(true);
      setEditingIndex(location.state.index ?? null);
    }
  }, [location.state]);

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = () => {
    const existingDevices = JSON.parse(localStorage.getItem("devices") || "[]");

    // Set the lastUpdated timestamp
    const updatedFormData = {
      ...formData,
      lastUpdated: new Date().toISOString(),
    };

    if (isEditing && editingIndex !== null) {
      // Update the existing device at the specified index
      existingDevices[editingIndex] = updatedFormData;
    } else {
      // Add a new device with a guaranteed unique numeric ID
      updatedFormData.id = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
      // Or for a string ID: updatedFormData.id = crypto.randomUUID();
      existingDevices.push(updatedFormData);
    }

    // Save the updated devices array back to localStorage
    localStorage.setItem("devices", JSON.stringify(existingDevices));

    alert(isEditing ? "Device updated successfully!" : "Device saved successfully!");

    // Navigate back to the Device Management page
    navigate("/management");
  };

  return (
    <Box
      component="form"
      noValidate
      autoComplete="off"
      sx={{
        width: 400,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Typography variant="h5" sx={{ textAlign: "center" }}>
        {isEditing ? "Edit Device" : "Add New Device"}
      </Typography>

      {/* Category Dropdown */}
      <FormControl fullWidth>
        <InputLabel id="category-label">Category</InputLabel>
        <Select
          labelId="category-label"
          value={formData.category}
          onChange={(e) => handleChange("category", e.target.value)}
        >
          {categoriesData.categories.map((category) => (
            <MenuItem key={category.name} value={category.name}>
              {category.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Name */}
      <TextField
        label="Name"
        value={formData.name}
        onChange={(e) => handleChange("name", e.target.value)}
        fullWidth
      />

      {/* Manufacturer and Model */}
      <TextField
        label="Manufacturer and Model"
        value={formData.manufacturerModel}
        onChange={(e) => handleChange("manufacturerModel", e.target.value)}
        fullWidth
      />

      {/* Power Consumption */}
      <Box sx={{ display: "flex", gap: 2 }}>
        <TextField
          label="Power Consumption"
          type="number"
          value={formData.powerConsumption}
          onChange={(e) => handleChange("powerConsumption", e.target.value)}
          fullWidth
        />
        <FormControl sx={{ minWidth: "fit-content" }}>
          <Select
            value={formData.unit}
            onChange={(e) => handleChange("unit", e.target.value)}
          >
            <MenuItem value="">None</MenuItem>
            <MenuItem value="W">W</MenuItem>
            <MenuItem value="kW">kW</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Frequency of Usage */}
      <FormControl fullWidth>
        <InputLabel id="frequency-label">Frequency of Usage</InputLabel>
        <Select
          labelId="frequency-label"
          value={formData.frequency}
          onChange={(e) => handleChange("frequency", e.target.value)}
        >
          <MenuItem value="">None</MenuItem>
          <MenuItem value="Daily">Daily</MenuItem>
          <MenuItem value="Weekly">Weekly</MenuItem>
        </Select>
      </FormControl>

      {/* Duration */}
      <TextField
        label="Duration (hours)"
        type="number"
        value={formData.duration}
        onChange={(e) => handleChange("duration", e.target.value)}
        fullWidth
      />

      {/* Peak Hours */}
      <Box sx={{ display: "flex", gap: 2 }}>
        <TextField
          label="Peak Hours Start"
          type="time"
          value={formData.peakHoursStart ? formData.peakHoursStart.format("HH:mm") : ""}
          onChange={(e) => handleChange("peakHoursStart", dayjs(e.target.value, "HH:mm"))}
          fullWidth
        />
        <TextField
          label="Peak Hours End"
          type="time"
          value={formData.peakHoursEnd ? formData.peakHoursEnd.format("HH:mm") : ""}
          onChange={(e) => handleChange("peakHoursEnd", dayjs(e.target.value, "HH:mm"))}
          fullWidth
        />
      </Box>

      {/* Location (Autocomplete) */}
      <Autocomplete
        options={locationsData.locations}
        getOptionLabel={(option) => option || ""}
        value={formData.location}
        onChange={(event, newValue) => handleChange("location", newValue || "")}
        renderInput={(params) => <TextField {...params} label="Location" fullWidth />}
        clearOnEscape
        freeSolo
        disablePortal
      />

      {/* Environment */}
      <FormControl fullWidth>
        <InputLabel id="environment-label">Environment</InputLabel>
        <Select
          labelId="environment-label"
          value={formData.environment}
          onChange={(e) => handleChange("environment", e.target.value)}
        >
          <MenuItem value="">None</MenuItem>
          <MenuItem value="Indoor">Indoor</MenuItem>
          <MenuItem value="Outdoor">Outdoor</MenuItem>
        </Select>
      </FormControl>

      {/* Submit Button */}
      <Button
        variant="contained"
        color="primary"
        sx={{ backgroundColor: theme.palette.primary.darker }}
        onClick={handleSubmit}
      >
        {isEditing ? "Update" : "Save"}
      </Button>
    </Box>
  );
};

export default DeviceForm;
