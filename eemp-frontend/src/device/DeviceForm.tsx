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
  useTheme
} from "@mui/material";
import { Autocomplete } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import locationsData from "../assets/locations.json";
import "./DeviceForm.scss"; // Import your SCSS file


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
  const theme = useTheme(); // Access the theme here

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

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = () => {
    // Save form data to localStorage
    localStorage.setItem("deviceFormData", JSON.stringify(formData));
    console.log("Form Submitted:", formData);
    alert("Form data saved to localStorage!");
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
        <FormControl sx={{
            minWidth: "fit-content",
          }}>
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
          value={formData.peakHoursStart?.format("HH:mm") || ""}
          onChange={(e) =>
            handleChange("peakHoursStart", dayjs(e.target.value, "HH:mm"))
          }
          fullWidth
        />
        <TextField
          label="Peak Hours End"
          type="time"
          value={formData.peakHoursEnd?.format("HH:mm") || ""}
          onChange={(e) =>
            handleChange("peakHoursEnd", dayjs(e.target.value, "HH:mm"))
          }
          fullWidth
        />
      </Box>

      {/* Location */}
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
      <Button variant="contained" color="primary" sx={{ backgroundColor: theme.palette.primary.darker }} onClick={handleSubmit}>
        Save
      </Button>
    </Box>
  );
};

export default DeviceForm;
