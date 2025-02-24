import React, { useState, useEffect, useMemo } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import categoriesData from "../assets/categories.json";
import locationsData from "../assets/locations.json";
import cecModules from "../assets/cec_modules.json";
import sandiaModules from "../assets/sandia_modules.json";
import cecInverters from "../assets/cec_inverters.json";
import SolarPanelForm from "./SolarPanelForm";

// ---------------- Types ----------------
export interface CustomSolarPanelData {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    altitude: number;
    timezone: string;
  };
  tilt: number;
  orientation: number;
  custom_solar_module: {
    name: string;
    pdc0: number;
    gamma_pdc: number;
    bvoco: number;
    bvmpo: number;
    impo: number;
    vmpo: number;
    pmpo: number;
    a_c: number;
    n_s: number;
    t_noct: number;
  };
  custom_inverter: {
    name: string;
    pdc0: number;
    paco: number;
    pdco: number;
    vdco: number;
    pso: number;
    c0: number;
    c1: number;
    c2: number;
    c3: number;
  };
  custom_temp_model_params: {
    u_c: number;
    u_v: number;
    eta_m: number;
    alpha_absorption: number;
  };
}

export interface FormData {
  id?: number | string;
  category: string;
  name?: string;
  manufacturerModel?: string;
  powerConsumption?: string;
  unit?: string;
  frequency?: string;
  duration?: string;
  peakHoursStart?: Dayjs | null;
  peakHoursEnd?: Dayjs | null;
  location?: string; // for non-solar devices
  environment?: string;
  estimatedCost?: string;
  lastUpdated?: string;
  module?: string;
  inverter?: string;
  orientation?: string;
  tilt?: string;
  customSolarPanelData?: CustomSolarPanelData;
}

interface LocationState {
  device?: FormData;
  index?: number;
}

const DeviceForm: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation() as { state?: LocationState };

  // ---------------- State ----------------
  const [formData, setFormData] = useState<FormData>({
    category: "",
    name: "",
    location: "",
    environment: "",
    peakHoursStart: dayjs(),
    peakHoursEnd: dayjs(),
    // Default structure for solar panel data
    customSolarPanelData: {
      location: {
        name: "",
        latitude: 0,
        longitude: 0,
        altitude: 0,
        timezone: "",
      },
      tilt: 30,
      orientation: 180,
      custom_solar_module: {
        name: "",
        pdc0: 0,
        gamma_pdc: 0,
        bvoco: 0,
        bvmpo: 0,
        impo: 0,
        vmpo: 0,
        pmpo: 0,
        a_c: 0,
        n_s: 0,
        t_noct: 0,
      },
      custom_inverter: {
        name: "",
        pdc0: 0,
        paco: 0,
        pdco: 0,
        vdco: 0,
        pso: 0,
        c0: 0,
        c1: 0,
        c2: 0,
        c3: 0,
      },
      custom_temp_model_params: {
        u_c: 0,
        u_v: 0,
        eta_m: 0,
        alpha_absorption: 0,
      },
    },
  });

  const [manualEntry, setManualEntry] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [openPopup, setOpenPopup] = useState(false);
  const [openError, setOpenError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Combine module lists from both sources
  const modulesList = useMemo(() => [...cecModules, ...sandiaModules], []);

  // ---------------- Effects ----------------
  useEffect(() => {
    // If editing, load device data from location.state
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

  useEffect(() => {
    // If the user’s location is in localStorage, auto-fill the solar panel location.
    if (formData.category === "Solar Panel") {
      const savedLocation = localStorage.getItem("userLocation");
      if (savedLocation) {
        try {
          const parsedLocation = JSON.parse(savedLocation);
          setFormData((prev) => {
            // Build a default CustomSolarPanelData object:
            const defaultSolarPanelData: CustomSolarPanelData = {
              location: { name: "", latitude: 0, longitude: 0, altitude: 0, timezone: "" },
              tilt: 30,
              orientation: 180,
              custom_solar_module: {
                name: "",
                pdc0: 0,
                gamma_pdc: 0,
                bvoco: 0,
                bvmpo: 0,
                impo: 0,
                vmpo: 0,
                pmpo: 0,
                a_c: 0,
                n_s: 0,
                t_noct: 0,
              },
              custom_inverter: {
                name: "",
                pdc0: 0,
                paco: 0,
                pdco: 0,
                vdco: 0,
                pso: 0,
                c0: 0,
                c1: 0,
                c2: 0,
                c3: 0,
              },
              custom_temp_model_params: {
                u_c: 0,
                u_v: 0,
                eta_m: 0,
                alpha_absorption: 0,
              },
            };

            const currentSolarData = prev.customSolarPanelData
              ? { ...defaultSolarPanelData, ...prev.customSolarPanelData }
              : defaultSolarPanelData;

            return {
              ...prev,
              customSolarPanelData: {
                ...currentSolarData,
                location: {
                  ...currentSolarData.location,
                  ...parsedLocation,
                },
                tilt: currentSolarData.tilt ?? 30,
                orientation: currentSolarData.orientation ?? 180,
                custom_solar_module: {
                  ...{
                    name: "",
                    pdc0: 0,
                    gamma_pdc: 0,
                    bvoco: 0,
                    bvmpo: 0,
                    impo: 0,
                    vmpo: 0,
                    pmpo: 0,
                    a_c: 0,
                    n_s: 0,
                    t_noct: 0,
                  },
                  ...currentSolarData.custom_solar_module,
                },
                custom_inverter: {
                  ...{
                    name: "",
                    pdc0: 0,
                    paco: 0,
                    pdco: 0,
                    vdco: 0,
                    pso: 0,
                    c0: 0,
                    c1: 0,
                    c2: 0,
                    c3: 0,
                  },
                  ...currentSolarData.custom_inverter,
                },
                custom_temp_model_params: {
                  ...{
                    u_c: 0,
                    u_v: 0,
                    eta_m: 0,
                    alpha_absorption: 0,
                  },
                  ...currentSolarData.custom_temp_model_params,
                },
              },
            };
          });
        } catch (err) {
          console.error("Error parsing userLocation from localStorage:", err);
        }
      }
    }
  }, [formData.category]);

  // ---------------- Handlers ----------------
  const handleChange = (field: keyof FormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  // Updated validation for Solar Panels with detailed console logging
const validateSolarFields = (): boolean => {
  if (!manualEntry) {
    // Standard solar panel form
    const missingFields: string[] = [];

    // Remove environment if you don't need it for solar panel
    if (!formData.name?.trim()) missingFields.push("Name");
    if (!formData.module?.trim()) missingFields.push("Module");
    if (!formData.inverter?.trim()) missingFields.push("Inverter");

    if (missingFields.length > 0) {
      console.error("Missing required fields for solar panel:", missingFields.join(", "));
      setErrorMessage("Please fill out all required fields for the solar panel.");
      setOpenError(true);
      return false;
    }
  } else {
    // Manual solar panel form: check all fields from your custom form
    const missingManualFields: string[] = [];

    const customData = formData.customSolarPanelData;
    if (!customData) {
      console.error("All manual fields are missing.");
      setErrorMessage("Please fill out all required fields for manual solar panel entry.");
      setOpenError(true);
      return false;
    }

    // 1) Location checks
    if (!customData.location.name.trim()) missingManualFields.push("Location Name");
    if (customData.location.latitude == null) missingManualFields.push("Latitude");
    if (customData.location.longitude == null) missingManualFields.push("Longitude");
    if (customData.location.altitude == null) missingManualFields.push("Altitude");
    if (!customData.location.timezone.trim()) missingManualFields.push("Timezone");

    // 2) System Parameters
    // We allow 0, so we only check for null/undefined
    if (customData.tilt == null) missingManualFields.push("Tilt");
    if (customData.orientation == null) missingManualFields.push("Orientation");

    // 3) Custom Solar Module
    const moduleData = customData.custom_solar_module;
    if (!moduleData.name.trim()) missingManualFields.push("Module Name");
    if (moduleData.pdc0 == null) missingManualFields.push("Pdc0");
    if (moduleData.gamma_pdc == null) missingManualFields.push("Gamma Pdc");
    if (moduleData.bvoco == null) missingManualFields.push("BvocO");
    if (moduleData.bvmpo == null) missingManualFields.push("BvmpO");
    if (moduleData.impo == null) missingManualFields.push("Impo");
    if (moduleData.vmpo == null) missingManualFields.push("VmpO");
    if (moduleData.pmpo == null) missingManualFields.push("PmpO");
    if (moduleData.a_c == null) missingManualFields.push("A_c");
    if (moduleData.n_s == null) missingManualFields.push("N_s");
    if (moduleData.t_noct == null) missingManualFields.push("T_noct");

    // 4) Custom Inverter
    const inverterData = customData.custom_inverter;
    if (!inverterData.name.trim()) missingManualFields.push("Inverter Name");
    if (inverterData.pdc0 == null) missingManualFields.push("Inverter Pdc0");
    if (inverterData.paco == null) missingManualFields.push("Paco");
    if (inverterData.pdco == null) missingManualFields.push("Pdco");
    if (inverterData.vdco == null) missingManualFields.push("Vdco");
    if (inverterData.pso == null) missingManualFields.push("Pso");
    if (inverterData.c0 == null) missingManualFields.push("C0");
    if (inverterData.c1 == null) missingManualFields.push("C1");
    if (inverterData.c2 == null) missingManualFields.push("C2");
    if (inverterData.c3 == null) missingManualFields.push("C3");

    // 5) Custom Temperature Model Params
    const tempData = customData.custom_temp_model_params;
    if (tempData.u_c == null) missingManualFields.push("U_c");
    if (tempData.u_v == null) missingManualFields.push("U_v");
    if (tempData.eta_m == null) missingManualFields.push("Eta_m");
    if (tempData.alpha_absorption == null) missingManualFields.push("Alpha Absorption");

    // Finally, if any are missing, show error and log
    if (missingManualFields.length > 0) {
      console.error(
        "Missing required fields for manual solar panel entry:",
        missingManualFields.join(", ")
      );
      setErrorMessage("Please fill out all required fields for manual solar panel entry.");
      setOpenError(true);
      return false;
    }
  }

  return true;
};


  const validateGenericFields = (): boolean => {
    const requiredFields: (keyof FormData)[] = [
      "category",
      "name",
      "manufacturerModel",
      "powerConsumption",
      "unit",
      "frequency",
      "duration",
      "location",
      "environment",
      "peakHoursStart",
      "peakHoursEnd",
    ];

    for (const field of requiredFields) {
      if (field === "peakHoursStart" || field === "peakHoursEnd") {
        const dateValue = formData[field] as Dayjs | null;
        if (!dateValue || !dateValue.isValid()) {
          setErrorMessage("Please fill out all required fields.");
          setOpenError(true);
          return false;
        }
      } else {
        const val = formData[field];
        if (!val || !String(val).trim()) {
          setErrorMessage("Please fill out all required fields.");
          setOpenError(true);
          return false;
        }
      }
    }
    return true;
  };

  const validateFields = (): boolean => {
    if (formData.category === "Solar Panel") {
      return validateSolarFields();
    }
    return validateGenericFields();
  };

  const handleSubmit = () => {
    if (!validateFields()) {
      return;
    }

    const updatedFormData = {
      ...formData,
      lastUpdated: new Date().toISOString(),
      // For standard solar panel form, force tilt=30.0 if not manual entry
      tilt: formData.category === "Solar Panel" && !manualEntry ? "30.0" : formData.tilt,
    };

    // Save to localStorage
    const existingDevices = JSON.parse(localStorage.getItem("devices") || "[]");
    if (isEditing && editingIndex !== null) {
      existingDevices[editingIndex] = updatedFormData;
    } else {
      updatedFormData.id = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
      existingDevices.push(updatedFormData);
    }
    localStorage.setItem("devices", JSON.stringify(existingDevices));

    setOpenPopup(true);
  };

  const handleClosePopup = () => {
    setOpenPopup(false);
    navigate("/management");
  };

  const handleCloseError = () => {
    setOpenError(false);
  };

  // Prepare device name for success message
  const deviceName =
    formData.name?.trim() || (formData.category === "Solar Panel" ? "Solar Panel" : "Device");
  const popupTitle = isEditing ? `${deviceName} Updated` : `${deviceName} Added`;
  const popupMessage = isEditing
    ? `The ${deviceName.toLowerCase()} has been successfully updated.`
    : `The ${deviceName.toLowerCase()} has been successfully added to your list.`;

  const renderGenericForm = () => (
    <>
      <TextField
        label="Name"
        value={formData.name}
        onChange={(e) => handleChange("name", e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Manufacturer and Model"
        value={formData.manufacturerModel}
        onChange={(e) => handleChange("manufacturerModel", e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
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
      <FormControl fullWidth sx={{ mb: 2 }}>
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
      <TextField
        label="Duration (hours)"
        type="number"
        value={formData.duration}
        onChange={(e) => handleChange("duration", e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
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
      <Autocomplete
        options={locationsData.locations}
        getOptionLabel={(option) => option || ""}
        value={formData.location}
        onChange={(event, newValue) => handleChange("location", newValue || "")}
        renderInput={(params) => <TextField {...params} label="Location" fullWidth />}
        clearOnEscape
        freeSolo
        disablePortal
        sx={{ mb: 2 }}
      />
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
    </>
  );

  return (
    <>
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

        <FormControl fullWidth>
          <InputLabel id="category-label">Category</InputLabel>
          <Select
            labelId="category-label"
            value={formData.category}
            onChange={(e) => {
              handleChange("category", e.target.value);
              // Reset manualEntry if category changes away from "Solar Panel"
              if (e.target.value !== "Solar Panel") {
                setManualEntry(false);
              }
            }}
          >
            {categoriesData.categories.map((cat) => (
              <MenuItem key={cat.name} value={cat.name}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {formData.category === "Solar Panel" ? (
          <SolarPanelForm
            formData={formData}
            handleChange={handleChange}
            handleCustomChange={(path, val) => {
              // Update nested fields for custom solar panel data
              setFormData((prev) => {
                const defaultSolarPanelData: CustomSolarPanelData = {
                  location: { name: "", latitude: 0, longitude: 0, altitude: 0, timezone: "" },
                  tilt: 30,
                  orientation: 180,
                  custom_solar_module: {
                    name: "",
                    pdc0: 0,
                    gamma_pdc: 0,
                    bvoco: 0,
                    bvmpo: 0,
                    impo: 0,
                    vmpo: 0,
                    pmpo: 0,
                    a_c: 0,
                    n_s: 0,
                    t_noct: 0,
                  },
                  custom_inverter: {
                    name: "",
                    pdc0: 0,
                    paco: 0,
                    pdco: 0,
                    vdco: 0,
                    pso: 0,
                    c0: 0,
                    c1: 0,
                    c2: 0,
                    c3: 0,
                  },
                  custom_temp_model_params: {
                    u_c: 0,
                    u_v: 0,
                    eta_m: 0,
                    alpha_absorption: 0,
                  },
                };

                const currentSolarData = prev.customSolarPanelData
                  ? { ...defaultSolarPanelData, ...prev.customSolarPanelData }
                  : defaultSolarPanelData;

                const segments = path.split(".");
                let obj: any = currentSolarData;
                for (let i = 0; i < segments.length - 1; i++) {
                  if (!obj[segments[i]]) {
                    obj[segments[i]] = {};
                  }
                  obj = obj[segments[i]];
                }
                obj[segments[segments.length - 1]] = val;
                return { ...prev, customSolarPanelData: currentSolarData };
              });
            }}
            manualEntry={manualEntry}
            setManualEntry={setManualEntry}
            modulesList={modulesList}
            invertersList={cecInverters}
          />
        ) : (
          renderGenericForm()
        )}

        <Button
          variant="contained"
          color="primary"
          sx={{ backgroundColor: theme.palette.primary.darker }}
          onClick={handleSubmit}
        >
          {isEditing ? "Update" : "Save"}
        </Button>
      </Box>

      {/* Success Dialog */}
      <Dialog
        open={openPopup}
        onClose={handleClosePopup}
        PaperProps={{ sx: { borderRadius: 4, textAlign: "center", px: 4, py: 3, maxWidth: "360px" } }}
      >
        <DialogTitle sx={{ p: 0, mb: 1, fontSize: "1.25rem" }}>{popupTitle}</DialogTitle>
        <DialogContent sx={{ p: 0, mb: 2 }}>
          <Typography variant="body1">{popupMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 0, justifyContent: "center" }}>
          <Button
            variant="contained"
            onClick={handleClosePopup}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 4,
              backgroundColor: "#000",
              color: "#fff",
              "&:hover": { backgroundColor: "#333" },
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Dialog */}
      <Dialog
        open={openError}
        onClose={handleCloseError}
        PaperProps={{ sx: { borderRadius: 4, textAlign: "center", px: 4, py: 3, maxWidth: "360px" } }}
      >
        <DialogTitle sx={{ p: 0, mb: 1, fontSize: "1.25rem", color: "red" }}>Error</DialogTitle>
        <DialogContent sx={{ p: 0, mb: 2 }}>
          <Typography variant="body1">{errorMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 0, justifyContent: "center" }}>
          <Button
            variant="contained"
            onClick={handleCloseError}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 4,
              backgroundColor: "#000",
              color: "#fff",
              "&:hover": { backgroundColor: "#333" },
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DeviceForm;
