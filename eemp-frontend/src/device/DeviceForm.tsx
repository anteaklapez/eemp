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
  SxProps,
  Theme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import categoriesData from "../assets/categories.json";
import locationsData from "../assets/locations.json";
import cecModules from "../assets/cec_modules.json";
import sandiaModules from "../assets/sandia_modules.json";
import cecInverters from "../assets/cec_inverters.json";

// ---------------- Virtualization Helper for Autocomplete ----------------
const LISTBOX_PADDING = 8; // px

function renderRow(props: ListChildComponentProps) {
  const { data, index, style } = props;
  return React.cloneElement(data[index] as React.ReactElement, {
    style: { ...style, top: (style.top as number) + LISTBOX_PADDING },
  });
}

const OuterElementContext = React.createContext({});

const OuterElementType = React.forwardRef<HTMLDivElement>((props, ref) => {
  const outerProps = React.useContext(OuterElementContext);
  return <div ref={ref} {...props} {...outerProps} />;
});

const VirtualizedListboxComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLElement>
>(function VirtualizedListboxComponent(props, ref) {
  const { children, ...other } = props;
  const itemData = React.Children.toArray(children);
  const itemCount = itemData.length;
  const itemSize = 36;
  return (
    <div ref={ref}>
      <OuterElementContext.Provider value={other}>
        <FixedSizeList
          height={Math.min(8 * itemSize, itemCount * itemSize) + 2 * LISTBOX_PADDING}
          width="100%"
          itemData={itemData}
          itemSize={itemSize}
          itemCount={itemCount}
          overscanCount={5}
          outerElementType={OuterElementType}
        >
          {renderRow}
        </FixedSizeList>
      </OuterElementContext.Provider>
    </div>
  );
});

// ---------------- Types for Custom Solar Panel Data ----------------
interface CustomSolarPanelData {
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

interface FormData {
  id?: number | string;
  category: string;
  // Generic fields
  name?: string;
  manufacturerModel?: string;
  powerConsumption?: string;
  unit?: string;
  frequency?: string;
  duration?: string;
  peakHoursStart?: Dayjs | null;
  peakHoursEnd?: Dayjs | null;
  location?: string;
  environment?: string;
  estimatedCost?: string;
  lastUpdated?: string;
  // Solar Panel specific fields (standard mode)
  module?: string;
  inverter?: string;
  orientation?: string;
  tilt?: string;
  // Custom manual solar panel data
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
  const [manualEntry, setManualEntry] = useState(false); // toggle manual (advanced) entry mode

  // NEW: state for success popup
  const [openPopup, setOpenPopup] = useState(false);

  // Merge the two module arrays and memoize the result.
  const modulesList = useMemo(() => [...cecModules, ...sandiaModules], []);

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

  // Helper to update nested customSolarPanelData fields
  const handleCustomChange = (fieldPath: string, value: any) => {
    setFormData((prev) => {
      const custom = {
        ...(prev.customSolarPanelData || {
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
        }),
      };
      const keys = fieldPath.split(".");
      let obj: any = custom;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) {
          obj[keys[i]] = {};
        }
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return { ...prev, customSolarPanelData: custom };
    });
  };

  const handleSubmit = () => {
    const existingDevices = JSON.parse(localStorage.getItem("devices") || "[]");
    const updatedFormData = {
      ...formData,
      lastUpdated: new Date().toISOString(),
      // enforce tilt=30 if it's a Solar Panel in standard mode
      tilt: formData.category === "Solar Panel" && !manualEntry ? "30.0" : formData.tilt,
    };

    if (isEditing && editingIndex !== null) {
      existingDevices[editingIndex] = updatedFormData;
    } else {
      updatedFormData.id = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
      existingDevices.push(updatedFormData);
    }

    localStorage.setItem("devices", JSON.stringify(existingDevices));
    // Show the success popup
    setOpenPopup(true);
  };

  // Called when user clicks "OK" in the popup
  const handleClosePopup = () => {
    setOpenPopup(false);
    navigate("/management");
  };

  // Determine device name for popup text.
  let deviceName = formData.name?.trim() || "Device";
  if (formData.category === "Solar Panel") {
    // If the category is Solar Panel, we now take the name from the solar panel form.
    deviceName = formData.name?.trim() || "Solar Panel";
  }

  const popupTitle = isEditing ? `${deviceName} Updated` : `${deviceName} Added`;
  const popupMessage = isEditing
    ? `The ${deviceName.toLowerCase()} has been successfully updated.`
    : `The ${deviceName.toLowerCase()} has been successfully added to your list.`;

  // ---------- Render Functions for each form section ----------

  // 1. Generic Form for non–Solar Panel
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

  // 2. Standard Solar Panel form (non-manual mode)
  // Updated to include a Name input so that the solar panel gets a name.
  const renderSolarPanelForm = () => (
    <Box sx={{ mb: 2 }}>
      {/* Solar Panel Name Input */}
      <TextField
        label="Name"
        value={formData.name}
        onChange={(e) => handleChange("name", e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Typography variant="h6" gutterBottom>
        Solar Panel Details
      </Typography>

      <Autocomplete
        options={modulesList}
        value={formData.module || ""}
        onChange={(event, newValue) => handleChange("module", newValue || "")}
        renderInput={(params) => <TextField {...params} label="Module" variant="outlined" />}
        ListboxComponent={VirtualizedListboxComponent as React.ComponentType<React.HTMLAttributes<HTMLElement>>}
        sx={{ mb: 2 }}
      />

      <Autocomplete
        options={cecInverters}
        value={formData.inverter || ""}
        onChange={(event, newValue) => handleChange("inverter", newValue || "")}
        renderInput={(params) => <TextField {...params} label="Inverter" variant="outlined" />}
        ListboxComponent={VirtualizedListboxComponent as React.ComponentType<React.HTMLAttributes<HTMLElement>>}
        sx={{ mb: 2 }}
      />

      <TextField
        label="Orientation (°)"
        type="number"
        value={formData.orientation || ""}
        onChange={(e) => handleChange("orientation", e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />

      <TextField
        label="Tilt (°)"
        type="number"
        value="30.0"
        disabled
        fullWidth
        sx={{ mb: 2 }}
      />

      <Button variant="text" onClick={() => setManualEntry(true)}>
        Enter Manual Solar Panel Data
      </Button>
    </Box>
  );

  // 3. Custom (manual) Solar Panel form
  const renderCustomSolarPanelForm = () => {
    const custom = formData.customSolarPanelData || {
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
      custom_temp_model_params: { u_c: 0, u_v: 0, eta_m: 0, alpha_absorption: 0 },
    };

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Manual Solar Panel Data Entry
        </Typography>

        <Typography variant="subtitle1">Location</Typography>
        <TextField
          label="Location Name"
          value={custom.location.name}
          onChange={(e) => handleCustomChange("location.name", e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Latitude"
          type="number"
          value={custom.location.latitude}
          onChange={(e) => handleCustomChange("location.latitude", parseFloat(e.target.value))}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Longitude"
          type="number"
          value={custom.location.longitude}
          onChange={(e) => handleCustomChange("location.longitude", parseFloat(e.target.value))}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Altitude"
          type="number"
          value={custom.location.altitude}
          onChange={(e) => handleCustomChange("location.altitude", parseFloat(e.target.value))}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Timezone"
          value={custom.location.timezone}
          onChange={(e) => handleCustomChange("location.timezone", e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />

        <Typography variant="subtitle1">System Parameters</Typography>
        <TextField
          label="Tilt (°)"
          type="number"
          value={custom.tilt}
          onChange={(e) => handleCustomChange("tilt", parseFloat(e.target.value))}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Orientation (°)"
          type="number"
          value={custom.orientation}
          onChange={(e) => handleCustomChange("orientation", parseFloat(e.target.value))}
          fullWidth
          sx={{ mb: 2 }}
        />

        <Typography variant="subtitle1">Custom Solar Module</Typography>
        <TextField
          label="Module Name"
          value={custom.custom_solar_module.name}
          onChange={(e) => handleCustomChange("custom_solar_module.name", e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Pdc0"
          type="number"
          value={custom.custom_solar_module.pdc0}
          onChange={(e) =>
            handleCustomChange("custom_solar_module.pdc0", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Gamma Pdc"
          type="number"
          value={custom.custom_solar_module.gamma_pdc}
          onChange={(e) =>
            handleCustomChange("custom_solar_module.gamma_pdc", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="BvocO"
          type="number"
          value={custom.custom_solar_module.bvoco}
          onChange={(e) =>
            handleCustomChange("custom_solar_module.bvoco", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="BvmpO"
          type="number"
          value={custom.custom_solar_module.bvmpo}
          onChange={(e) =>
            handleCustomChange("custom_solar_module.bvmpo", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Impo"
          type="number"
          value={custom.custom_solar_module.impo}
          onChange={(e) =>
            handleCustomChange("custom_solar_module.impo", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="VmpO"
          type="number"
          value={custom.custom_solar_module.vmpo}
          onChange={(e) =>
            handleCustomChange("custom_solar_module.vmpo", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="PmpO"
          type="number"
          value={custom.custom_solar_module.pmpo}
          onChange={(e) =>
            handleCustomChange("custom_solar_module.pmpo", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="A_c"
          type="number"
          value={custom.custom_solar_module.a_c}
          onChange={(e) =>
            handleCustomChange("custom_solar_module.a_c", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="N_s"
          type="number"
          value={custom.custom_solar_module.n_s}
          onChange={(e) =>
            handleCustomChange("custom_solar_module.n_s", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="T_noct"
          type="number"
          value={custom.custom_solar_module.t_noct}
          onChange={(e) =>
            handleCustomChange("custom_solar_module.t_noct", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />

        <Typography variant="subtitle1">Custom Inverter</Typography>
        <TextField
          label="Inverter Name"
          value={custom.custom_inverter.name}
          onChange={(e) => handleCustomChange("custom_inverter.name", e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Pdc0"
          type="number"
          value={custom.custom_inverter.pdc0}
          onChange={(e) =>
            handleCustomChange("custom_inverter.pdc0", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Paco"
          type="number"
          value={custom.custom_inverter.paco}
          onChange={(e) =>
            handleCustomChange("custom_inverter.paco", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Pdco"
          type="number"
          value={custom.custom_inverter.pdco}
          onChange={(e) =>
            handleCustomChange("custom_inverter.pdco", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Vdco"
          type="number"
          value={custom.custom_inverter.vdco}
          onChange={(e) =>
            handleCustomChange("custom_inverter.vdco", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Pso"
          type="number"
          value={custom.custom_inverter.pso}
          onChange={(e) =>
            handleCustomChange("custom_inverter.pso", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="C0"
          type="number"
          value={custom.custom_inverter.c0}
          onChange={(e) =>
            handleCustomChange("custom_inverter.c0", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="C1"
          type="number"
          value={custom.custom_inverter.c1}
          onChange={(e) =>
            handleCustomChange("custom_inverter.c1", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="C2"
          type="number"
          value={custom.custom_inverter.c2}
          onChange={(e) =>
            handleCustomChange("custom_inverter.c2", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="C3"
          type="number"
          value={custom.custom_inverter.c3}
          onChange={(e) =>
            handleCustomChange("custom_inverter.c3", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />

        <Typography variant="subtitle1">Custom Temperature Model Params</Typography>
        <TextField
          label="U_c"
          type="number"
          value={custom.custom_temp_model_params.u_c}
          onChange={(e) =>
            handleCustomChange("custom_temp_model_params.u_c", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="U_v"
          type="number"
          value={custom.custom_temp_model_params.u_v}
          onChange={(e) =>
            handleCustomChange("custom_temp_model_params.u_v", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Eta_m"
          type="number"
          value={custom.custom_temp_model_params.eta_m}
          onChange={(e) =>
            handleCustomChange("custom_temp_model_params.eta_m", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Alpha Absorption"
          type="number"
          value={custom.custom_temp_model_params.alpha_absorption}
          onChange={(e) =>
            handleCustomChange("custom_temp_model_params.alpha_absorption", parseFloat(e.target.value))
          }
          fullWidth
          sx={{ mb: 2 }}
        />

        <Button variant="text" onClick={() => setManualEntry(false)}>
          Back to Standard Solar Panel Form
        </Button>
      </Box>
    );
  };

  const formContainerSx: SxProps<Theme> = {
    width: 400,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    ...(manualEntry ? { minHeight: "80vh" } : {}),
  };

  return (
    <>
      <Box component="form" noValidate autoComplete="off" sx={formContainerSx}>
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
              if (e.target.value !== "Solar Panel") {
                setManualEntry(false);
              }
            }}
          >
            {categoriesData.categories.map((category) => (
              <MenuItem key={category.name} value={category.name}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {formData.category === "Solar Panel"
          ? manualEntry
            ? renderCustomSolarPanelForm()
            : renderSolarPanelForm()
          : renderGenericForm()}

        <Button
          variant="contained"
          color="primary"
          sx={{ backgroundColor: theme.palette.primary.darker, mb: manualEntry ? 2 : 0 }}
          onClick={handleSubmit}
        >
          {isEditing ? "Update" : "Save"}
        </Button>
      </Box>

      <Dialog
        open={openPopup}
        onClose={handleClosePopup}
        PaperProps={{
          sx: {
            borderRadius: 4,
            textAlign: "center",
            px: 4,
            py: 3,
            maxWidth: "360px",
          },
        }}
      >
        <DialogTitle sx={{ p: 0, mb: 1, fontSize: "1.25rem" }}>
          {popupTitle}
        </DialogTitle>
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
    </>
  );
};

export default DeviceForm;
