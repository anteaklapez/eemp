import React, { useState, useEffect, useMemo } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import categoriesData from '../assets/categories.json';
import cecModules from '../assets/cec_modules.json';
import sandiaModules from '../assets/sandia_modules.json';
import cecInverters from '../assets/cec_inverters.json';
import roomData from '../assets/locations.json';
import SolarPanelForm from './SolarPanelForm';

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
  numberOfStrings: number;
  modulesPerString: number;
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
  // Shared fields (for solar devices)
  name?: string;
  manufacturerModel?: string;
  powerConsumption?: string;
  unit?: string;
  numberOfStrings?: string;
  modulesPerString?: string;
  duration?: string;
  peakHoursStart?: Dayjs | null;
  peakHoursEnd?: Dayjs | null;
  location?: string;
  environment?: string;
  estimatedCost?: string;
  module?: string;
  inverter?: string;
  orientation?: string;
  tilt?: string;
  customSolarPanelData?: CustomSolarPanelData;
  // Normal device fields (only used if category !== "Solar Panel")
  powerRatingValue?: string;
  powerRatingUnit?: string;
  weekStart?: Dayjs;
  usageTimes?: { start: Dayjs; end: Dayjs }[];
  // Energy type dropdown ("AC" or "DC"), default "AC"
  energyType?: string;
  standbyPowerValue?: string;
  standbyPowerUnit?: string;
  numberOfDevices?: string;
  // Room information
  roomName?: string;
  roomType?: string;
  roomId?: string;
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
    category: '',
    name: '',
    manufacturerModel: '',
    powerConsumption: '',
    unit: '',
    duration: '',
    location: '',
    environment: '',
    estimatedCost: '',
    peakHoursStart: dayjs(),
    peakHoursEnd: dayjs(),
    module: '',
    inverter: '',
    orientation: '',
    tilt: '',
    customSolarPanelData: {
      location: {
        name: '',
        latitude: 0,
        longitude: 0,
        altitude: 0,
        timezone: '',
      },
      tilt: 30,
      numberOfStrings: 1,
      modulesPerString: 1,
      orientation: 180,
      custom_solar_module: {
        name: '',
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
        name: '',
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
    powerRatingValue: '',
    powerRatingUnit: 'W',
    weekStart: dayjs(),
    usageTimes: Array.from({ length: 7 }, () => ({
      start: dayjs().hour(18).minute(0),
      end: dayjs().hour(23).minute(0),
    })),
    energyType: 'AC',
    standbyPowerValue: '',
    standbyPowerUnit: 'W',
    numberOfDevices: '',
    roomName: '',
    roomType: '',
    roomId: '',
  });

  const [manualEntry, setManualEntry] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [openError, setOpenError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Define modulesList so it remains in the same order on every render.
  const modulesList = useMemo(() => [...cecModules, ...sandiaModules], []);

  // ---------------- Effects ----------------
  useEffect(() => {
    if (location.state?.device) {
      const device = location.state.device as any;
      if (
        device.category === 'Solar Panel' ||
        device.deviceCategory === 'Solar Panel'
      ) {
        setFormData({
          ...device,
          peakHoursStart: device.peakHoursStart ? dayjs(device.peakHoursStart) : null,
          peakHoursEnd: device.peakHoursEnd ? dayjs(device.peakHoursEnd) : null,
          weekStart: device.weekStart ? dayjs(device.weekStart) : dayjs(),
          usageTimes: device.usageTimes
            ? device.usageTimes.map((ut: any) => ({
                start: dayjs(ut.start),
                end: dayjs(ut.end),
              }))
            : Array.from({ length: 7 }, () => ({
                start: dayjs().hour(18).minute(0),
                end: dayjs().hour(23).minute(0),
              })),
        });
      } else {
        setFormData({
          category: device.deviceCategory,
          name: device.deviceName,
          powerRatingValue: device.powerRating?.value?.toString() || '',
          powerRatingUnit: device.powerRating?.unit || 'W',
          weekStart: device.weekStart
            ? dayjs(device.weekStart)
            : device.usagePattern?.usage_times?.[0]?.start
            ? dayjs(device.usagePattern.usage_times[0].start)
            : dayjs(),
          usageTimes: device.usagePattern?.usage_times
            ? device.usagePattern.usage_times.map((ut: any) => ({
                start: dayjs(ut.start),
                end: dayjs(ut.end),
              }))
            : Array.from({ length: 7 }, () => ({
                start: dayjs().hour(18).minute(0),
                end: dayjs().hour(23).minute(0),
              })),
          energyType: device.energyType || 'AC',
          standbyPowerValue: device.standbyPower?.value?.toString() || '',
          standbyPowerUnit: device.standbyPower?.unit || 'W',
          roomName: device.room?.roomName || '',
          roomType: device.room?.roomType || '',
          roomId: device.room?.roomId || '',
          numberOfDevices:
            device.quantity !== undefined
              ? device.quantity.toString()
              : device.numberOfDevices
              ? device.numberOfDevices.toString()
              : '',
        });
      }
      setIsEditing(true);
      setEditingIndex(location.state.index ?? null);
    }
  }, [location.state]);

  // For solar panels, keep the behavior unchanged (except for state pre-population)
  useEffect(() => {
    if (formData.category === 'Solar Panel') {
      const savedLocation = localStorage.getItem('userLocation');
      if (savedLocation) {
        try {
          const parsedLocation = JSON.parse(savedLocation);
          setFormData((prev) => {
            const defaultSolarPanelData: CustomSolarPanelData = {
              location: {
                name: '',
                latitude: 0,
                longitude: 0,
                altitude: 0,
                timezone: '',
              },
              tilt: 30,
              numberOfStrings: 1,
              modulesPerString: 1,
              orientation: 180,
              custom_solar_module: {
                name: '',
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
                name: '',
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
                    name: '',
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
                    name: '',
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
          console.error('Error parsing userLocation from localStorage:', err);
        }
      }
    }
  }, [formData.category]);

  // Aggregate quantity effect only for normal devices
  useEffect(() => {
    if (formData.category === 'Solar Panel') return;
    if (formData.category && formData.roomName) {
      const existingDevices = JSON.parse(localStorage.getItem('devices') || '[]');
      const aggregated = existingDevices
        .filter((device: any) => {
          return (
            device.deviceCategory === formData.category &&
            device.room &&
            device.room.roomName === formData.roomName
          );
        })
        .reduce((sum: number, device: any) => {
          const qty = Number(device.quantity || device.numberOfDevices || 1);
          return sum + qty;
        }, 0);
      if (!formData.numberOfDevices || formData.numberOfDevices.trim() === '') {
        setFormData((prev) => ({ ...prev, numberOfDevices: aggregated.toString() }));
      }
    }
  }, [formData.category, formData.roomName]);

  // ---------------- Handlers ----------------
  const handleChange = (field: keyof FormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCancel = () => {
    navigate('/management');
  };

  const validateUsageTimes = (): boolean => {
    if (formData.usageTimes) {
      for (let i = 0; i < formData.usageTimes.length; i++) {
        const { start, end } = formData.usageTimes[i];
        if (!start || !end || !start.isBefore(end)) {
          const dayLabel = (formData.weekStart || dayjs()).add(i, 'day').format('ddd, MMM D');
          setErrorMessage(`For ${dayLabel}: Start time must be before end time (within the same day).`);
          setOpenError(true);
          return false;
        }
      }
    }
    return true;
  };

  const validateSolarFields = (): boolean => {
    if (!manualEntry) {
      const missingFields: string[] = [];
      if (!formData.name?.trim()) missingFields.push('Name');
      if (!formData.module?.trim()) missingFields.push('Module');
      if (!formData.inverter?.trim()) missingFields.push('Inverter');
      const tiltValue = Number(formData.tilt);
      if (isNaN(tiltValue) || tiltValue < 0 || tiltValue > 359) {
        missingFields.push('Tilt (must be between 0 and 359)');
      }
      if (missingFields.length > 0) {
        console.error('Missing/invalid required fields for solar panel:', missingFields.join(', '));
        setErrorMessage(
          'Please fill out all required fields for the solar panel. ' +
            missingFields.join(', ')
        );
        setOpenError(true);
        return false;
      }
    } else {
      const missingManualFields: string[] = [];
      const customData = formData.customSolarPanelData;
      if (!customData) {
        console.error('All manual fields are missing.');
        setErrorMessage('Please fill out all required fields for manual solar panel entry.');
        setOpenError(true);
        return false;
      }
      if (!customData.location.name.trim()) missingManualFields.push('Location Name');
      if (customData.location.latitude == null) missingManualFields.push('Latitude');
      if (customData.location.longitude == null) missingManualFields.push('Longitude');
      if (customData.location.altitude == null) missingManualFields.push('Altitude');
      if (!customData.location.timezone.trim()) missingManualFields.push('Timezone');
      if (customData.tilt == null || customData.tilt < 0 || customData.tilt > 359)
        missingManualFields.push('Tilt (must be between 0 and 359)');
      if (customData.orientation == null) missingManualFields.push('Orientation');
      const moduleData = customData.custom_solar_module;
      if (!moduleData.name.trim()) missingManualFields.push('Module Name');
      if (moduleData.pdc0 == null) missingManualFields.push('Pdc0');
      if (moduleData.gamma_pdc == null) missingManualFields.push('Gamma Pdc');
      if (moduleData.bvoco == null) missingManualFields.push('BvocO');
      if (moduleData.bvmpo == null) missingManualFields.push('BvmpO');
      if (moduleData.impo == null) missingManualFields.push('Impo');
      if (moduleData.vmpo == null) missingManualFields.push('VmpO');
      if (moduleData.pmpo == null) missingManualFields.push('PmpO');
      if (moduleData.a_c == null) missingManualFields.push('A_c');
      if (moduleData.n_s == null) missingManualFields.push('N_s');
      if (moduleData.t_noct == null) missingManualFields.push('T_noct');
      const inverterData = customData.custom_inverter;
      if (!inverterData.name.trim()) missingManualFields.push('Inverter Name');
      if (inverterData.pdc0 == null) missingManualFields.push('Inverter Pdc0');
      if (inverterData.paco == null) missingManualFields.push('Paco');
      if (inverterData.pdco == null) missingManualFields.push('Pdco');
      if (inverterData.vdco == null) missingManualFields.push('Vdco');
      if (inverterData.pso == null) missingManualFields.push('Pso');
      if (inverterData.c0 == null) missingManualFields.push('C0');
      if (inverterData.c1 == null) missingManualFields.push('C1');
      if (inverterData.c2 == null) missingManualFields.push('C2');
      if (inverterData.c3 == null) missingManualFields.push('C3');
      const tempData = customData.custom_temp_model_params;
      if (tempData.u_c == null) missingManualFields.push('U_c');
      if (tempData.u_v == null) missingManualFields.push('U_v');
      if (tempData.eta_m == null) missingManualFields.push('Eta_m');
      if (tempData.alpha_absorption == null) missingManualFields.push('Alpha Absorption');
      if (missingManualFields.length > 0) {
        console.error(
          'Missing/invalid required fields for manual solar panel entry:',
          missingManualFields.join(', ')
        );
        setErrorMessage(
          'Please fill out all required fields for manual solar panel entry. ' +
            missingManualFields.join(', ')
        );
        setOpenError(true);
        return false;
      }
    }
    return true;
  };

  const validateNormalFields = (): boolean => {
    const requiredFields: (keyof FormData)[] = [
      'name',
      'powerRatingValue',
      'weekStart',
      'energyType',
      'standbyPowerValue',
      'roomName',
      'roomType',
    ];
    for (const field of requiredFields) {
      if (!formData[field] || !String(formData[field]).trim()) {
        setErrorMessage('Please fill out all required fields for the device.');
        setOpenError(true);
        return false;
      }
    }
    if (!formData.usageTimes || formData.usageTimes.length !== 7) {
      setErrorMessage('Please provide usage times for all 7 days of the week.');
      setOpenError(true);
      return false;
    }
    return true;
  };

  const validateFields = (): boolean => {
    const baseValidation =
      formData.category === 'Solar Panel'
        ? validateSolarFields()
        : validateNormalFields();
    if (!baseValidation) return false;
    return validateUsageTimes();
  };

  // ---------------- Render Functions ----------------
  const renderGenericForm = () => {
    return (
      <>
        <TextField
          label="Device Name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Power Rating (Value)"
            type="number"
            value={formData.powerRatingValue}
            onChange={(e) => handleChange('powerRatingValue', e.target.value)}
            fullWidth
          />
          <FormControl sx={{ minWidth: 'fit-content' }}>
            <InputLabel id="power-rating-unit-label">Unit</InputLabel>
            <Select
              labelId="power-rating-unit-label"
              value={formData.powerRatingUnit}
              onChange={(e) => handleChange('powerRatingUnit', e.target.value)}
            >
              <MenuItem value="W">W</MenuItem>
              <MenuItem value="kW">kW</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <TextField
          label="Week Start Date"
          type="date"
          value={formData.weekStart ? formData.weekStart.format('YYYY-MM-DD') : ''}
          onChange={(e) => handleChange('weekStart', dayjs(e.target.value))}
          fullWidth
          sx={{ mb: 2 }}
        />
        <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
          Usage Times for the Week
        </Typography>
        {(formData.weekStart || dayjs()) &&
          formData.usageTimes?.map((time, index) => {
            const currentDate = (formData.weekStart || dayjs()).add(index, 'day');
            return (
              <Box
                key={index}
                sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}
              >
                <Typography sx={{ width: 100 }}>
                  {currentDate.format('ddd, MMM D')}
                </Typography>
                <TextField
                  label="Start Time"
                  type="time"
                  value={time.start.format('HH:mm')}
                  onChange={(e) => {
                    const newTime = dayjs(e.target.value, 'HH:mm');
                    const updatedUsageTimes = [...(formData.usageTimes || [])];
                    updatedUsageTimes[index].start = (formData.weekStart || dayjs())
                      .add(index, 'day')
                      .hour(newTime.hour())
                      .minute(newTime.minute());
                    handleChange('usageTimes', updatedUsageTimes);
                  }}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="End Time"
                  type="time"
                  value={time.end.format('HH:mm')}
                  onChange={(e) => {
                    const newTime = dayjs(e.target.value, 'HH:mm');
                    const updatedUsageTimes = [...(formData.usageTimes || [])];
                    updatedUsageTimes[index].end = (formData.weekStart || dayjs())
                      .add(index, 'day')
                      .hour(newTime.hour())
                      .minute(newTime.minute());
                    handleChange('usageTimes', updatedUsageTimes);
                  }}
                  sx={{ mb: 2 }}
                />
              </Box>
            );
          })}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="energy-type-label">Energy Type</InputLabel>
          <Select
            labelId="energy-type-label"
            value={formData.energyType}
            label="Energy Type"
            onChange={(e) => handleChange('energyType', e.target.value)}
          >
            <MenuItem value="AC">AC</MenuItem>
            <MenuItem value="DC">DC</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Standby Power (Value)"
            type="number"
            value={formData.standbyPowerValue}
            onChange={(e) => handleChange('standbyPowerValue', e.target.value)}
            fullWidth
            sx={{ mb: 0 }}
          />
          <FormControl sx={{ minWidth: 'fit-content', mb: 1 }}>
            <InputLabel id="standby-power-unit-label">Unit</InputLabel>
            <Select
              labelId="standby-power-unit-label"
              value={formData.standbyPowerUnit}
              onChange={(e) => handleChange('standbyPowerUnit', e.target.value)}
            >
              <MenuItem value="W">W</MenuItem>
              <MenuItem value="kW">kW</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {/* For normal devices, show the Number of Devices field */}
        {formData.category !== 'Solar Panel' && (
          <TextField
            label="Number of Devices"
            type="number"
            value={formData.numberOfDevices}
            onChange={(e) => handleChange('numberOfDevices', e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
          <TextField
            label="Room Name"
            value={formData.roomName}
            onChange={(e) => handleChange('roomName', e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="room-type-label">Room Type</InputLabel>
            <Select
              labelId="room-type-label"
              value={formData.roomType || ''}
              label="Room Type"
              onChange={(e) => handleChange('roomType', e.target.value)}
            >
              {roomData.type.map((room: string) => (
                <MenuItem key={room} value={room}>
                  {room}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </>
    );
  };

  const handleSubmit = () => {
    if (!validateFields()) return;

    const existingDevices = JSON.parse(localStorage.getItem('devices') || '[]');

    if (formData.category === 'Solar Panel') {
      const baseSolarData = {
        ...formData,
        lastUpdated: new Date().toISOString(),
        tilt:
          formData.category === 'Solar Panel' && !manualEntry
            ? '30.0'
            : formData.tilt,
      };

      if (isEditing && editingIndex !== null) {
        const count =
          formData.numberOfDevices && formData.numberOfDevices.trim() !== ''
            ? Number(formData.numberOfDevices)
            : existingDevices[editingIndex]?.quantity || 1;
        existingDevices[editingIndex] = { ...baseSolarData, quantity: count };
      } else {
        const count = Number(formData.numberOfDevices) || 1;
        const newDevice = {
          ...baseSolarData,
          quantity: count,
          id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        };
        existingDevices.push(newDevice);
      }
      localStorage.setItem('devices', JSON.stringify(existingDevices));
    } else {
      const baseNormalData = {
        deviceName: formData.name,
        powerRating: {
          value: Number(formData.powerRatingValue),
          unit: formData.powerRatingUnit,
        },
        usagePattern: {
          usage_times: formData.usageTimes
            ? formData.usageTimes.map((time) => ({
                start: time.start.toISOString(),
                end: time.end.toISOString(),
              }))
            : [],
        },
        energyType: formData.energyType,
        standbyPower: {
          value: Number(formData.standbyPowerValue),
          unit: formData.standbyPowerUnit,
        },
        deviceCategory: formData.category,
        room: {
          roomName: formData.roomName,
          roomType: formData.roomType,
        },
        lastUpdated: new Date().toISOString(),
      };

      if (isEditing && editingIndex !== null) {
        const count =
          formData.numberOfDevices && formData.numberOfDevices.trim() !== ''
            ? Number(formData.numberOfDevices)
            : existingDevices[editingIndex]?.quantity || 1;
        existingDevices[editingIndex] = {
          ...baseNormalData,
          deviceId:
            formData.id ||
            String(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
          room: {
            roomId:
              formData.roomId ||
              String(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
            roomName: formData.roomName,
            roomType: formData.roomType,
          },
          quantity: count,
        };
      } else {
        const count = Number(formData.numberOfDevices) || 1;
        const newDevice = {
          ...baseNormalData,
          quantity: count,
          deviceId: String(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
          room: {
            roomId: String(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
            roomName: formData.roomName,
            roomType: formData.roomType,
          },
        };
        existingDevices.push(newDevice);
      }
      localStorage.setItem('devices', JSON.stringify(existingDevices));
    }
    localStorage.setItem('shouldRefreshEnergyData', 'true');
    navigate('/management', { state: { refreshData: true } });
  };

  const handleCloseError = () => {
    setOpenError(false);
  };

  const deviceName =
    formData.name?.trim() ||
    (formData.category === 'Solar Panel' ? 'Solar Panel' : 'Device');

  return (
    <>
      <Box
        component="form"
        noValidate
        autoComplete="off"
        sx={{
          width: 400,
          mx: 'auto',
          pt: 4,
          pb: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography variant="h5" sx={{ textAlign: 'center', mb: 2 }}>
          {isEditing ? 'Edit Device' : 'Add New Device'}
        </Typography>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="category-label">Category</InputLabel>
          <Select
            labelId="category-label"
            value={formData.category}
            onChange={(e) => {
              handleChange('category', e.target.value);
              if (e.target.value !== 'Solar Panel') {
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

        {formData.category === 'Solar Panel' ? (
          <>
            <SolarPanelForm
              formData={formData}
              handleChange={handleChange}
              handleCustomChange={(path, val) => {
                setFormData((prev) => {
                  const defaultSolarPanelData: CustomSolarPanelData = {
                    location: {
                      name: '',
                      latitude: 0,
                      longitude: 0,
                      altitude: 0,
                      timezone: '',
                    },
                    tilt: 30,
                    numberOfStrings: 1,
                    modulesPerString: 1,
                    orientation: 180,
                    custom_solar_module: {
                      name: '',
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
                      name: '',
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

                  const segments = path.split('.');
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
            {/* For Solar Panels, we are reverting to the default behavior – no manual Number of Devices field */}
          </>
        ) : (
          renderGenericForm()
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ backgroundColor: theme.palette.primary.darker }}
            onClick={handleSubmit}
          >
            {isEditing ? 'Update' : 'Save'}
          </Button>
          <Button variant="outlined" color="primary" fullWidth onClick={handleCancel}>
            Cancel
          </Button>
        </Box>
      </Box>

      <Dialog
        open={openError}
        onClose={handleCloseError}
        PaperProps={{
          sx: {
            borderRadius: 4,
            textAlign: 'center',
            px: 4,
            py: 3,
            maxWidth: '360px',
          },
        }}
      >
        <DialogTitle sx={{ p: 0, mb: 1, fontSize: '1.25rem', color: 'red' }}>
          Error
        </DialogTitle>
        <DialogContent sx={{ p: 0, mb: 2 }}>
          <Typography variant="body1">{errorMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 0, justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={handleCloseError}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 4,
              backgroundColor: '#000',
              color: '#fff',
              '&:hover': { backgroundColor: '#333' },
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
