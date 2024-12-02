import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
} from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { Autocomplete } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import locationsData from "../assets/locations.json";

// Define a TypeScript interface for the form data
interface FormData {
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
}

const DeviceForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    category: "",
    name: "",
    manufacturerModel: "",
    powerConsumption: "",
    unit: "W",
    frequency: "",
    duration: "",
    peakHoursStart: dayjs(),
    peakHoursEnd: dayjs(),
    location: "",
    environment: "",
    estimatedCost: "",
  });

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = () => {
    console.log("Form Submitted:", formData);
    // Add logic for submitting the data
  };

  return (
    <Box
      component="form"
      noValidate
      autoComplete="off"
      sx={{ width: 400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 2 }}
    >
      <Typography variant="h5" sx={{ textAlign: "center" }}>
        Add New Device
      </Typography>

      {/* Category */}
      <FormControl fullWidth>
        <InputLabel id="category-label">Category</InputLabel>
        <Select
          labelId="category-label"
          value={formData.category}
          onChange={(e) => handleChange("category", e.target.value)}
        >
          <MenuItem value="">None</MenuItem>
          <MenuItem value="Lighting">Lighting</MenuItem>
          <MenuItem value="Appliances">Appliances</MenuItem>
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
        <FormControl>
          <Select
            value={formData.unit}
            onChange={(e) => handleChange("unit", e.target.value)}
          >
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
        <TimePicker
          label="Peak Hours Start"
          value={formData.peakHoursStart}
          onChange={(newValue) => handleChange("peakHoursStart", newValue)}
          slotProps={{
            textField: {
              fullWidth: true,
            },
          }}
        />
        <TimePicker
          label="Peak Hours End"
          value={formData.peakHoursEnd}
          onChange={(newValue) => handleChange("peakHoursEnd", newValue)}
          slotProps={{
            textField: {
              fullWidth: true,
            },
          }}
        />
      </Box>

      {/* Location with Searchable Dropdown */}
      <Autocomplete
        options={locationsData.locations}
        getOptionLabel={(option) => option || ""}
        value={formData.location || ""}
        onChange={(event, newValue) => handleChange("location", newValue)}
        renderInput={(params) => (
          <TextField {...params} label="Location" fullWidth />
        )}
        clearOnEscape
        freeSolo
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
      <Button variant="contained" color="primary" onClick={handleSubmit}>
        Save
      </Button>
    </Box>
  );
};

export default DeviceForm;
