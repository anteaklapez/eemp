import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { deviceRepository } from '../models/repositories/deviceRepository';
import { locationRepository } from '../models/repositories/locationRepository';
import { FormData, CustomSolarPanelData } from '../models/interfaces/deviceInterfaces';
import {
    validateSolarPanelForm,
    validateNormalDeviceForm,
    ValidationError
} from '../utils/validationUtils';
import { generateId, generateRoomId } from '../utils/idUtils';

export function useFormViewModel() {
    const navigate = useNavigate();
    const location = useLocation();

    // State for form data
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
            tilt: undefined,
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

    // Other states
    const [manualEntry, setManualEntry] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [openError, setOpenError] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);

    // Load device if we're editing
    useEffect(() => {
        if (location.state?.device) {
            const device = location.state.device as any;
            loadDeviceForEdit(device);
            setIsEditing(true);
            setEditingIndex(location.state.index ?? null);
        }
    }, [location.state]);

    // Update solar panel location when category changes
    useEffect(() => {
        if (formData.category === 'Solar Panel') {
            loadUserLocation();
        }
    }, [formData.category]);

    // Update number of devices when category & room change
    useEffect(() => {
        if (formData.category === 'Solar Panel') return;
        if (formData.category && formData.roomName) {
            calculateDeviceQuantity();
        }
    }, [formData.category, formData.roomName]);

    // Load device for editing
    const loadDeviceForEdit = (device: any) => {
        if (
            device.category === 'Solar Panel' ||
            device.deviceCategory === 'Solar Panel'
        ) {
            // Editing a Solar Panel
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
            // Editing a Normal Device
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
    };

    // Load user location for solar panel
    const loadUserLocation = () => {
        const userLocation = locationRepository.getUserLocation();
        if (userLocation) {
            setFormData((prev) => {
                const defaultSolarPanelData: CustomSolarPanelData = {
                    location: {
                        name: '',
                        latitude: 0,
                        longitude: 0,
                        altitude: 0,
                        timezone: '',
                    },
                    tilt: undefined,
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
                            ...userLocation,
                        },
                        // Do not override tilt
                        tilt: currentSolarData.tilt,
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
        }
    };

    // Calculate device quantity for the room/category
    const calculateDeviceQuantity = () => {
        const devices = deviceRepository.getAllDevices();
        const aggregated = devices
            .filter((device) => {
                return (
                    (device.category === formData.category || device.deviceCategory === formData.category) &&
                    device.room && (
                        typeof device.room === 'object'
                            ? device.room.roomName === formData.roomName
                            : device.room === formData.roomName
                    )
                );
            })
            .reduce((sum: number, device: any) => {
                const qty = Number(device.quantity || device.numberOfDevices || 1);
                return sum + qty;
            }, 0);

        if (!formData.numberOfDevices || formData.numberOfDevices.trim() === '') {
            setFormData((prev) => ({ ...prev, numberOfDevices: aggregated.toString() }));
        }
    };

    // Handle field changes
    const handleChange = useCallback((field: keyof FormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));

        // Clear errors related to this field
        setErrors((prev) => prev.filter((error) => error.field !== field));
    }, []);

    // Handle custom field changes for nested solar panel data
    const handleCustomChange = useCallback((fieldPath: string, val: any) => {
        setFormData((prev) => {
            const defaultSolarPanelData: CustomSolarPanelData = {
                location: {
                    name: '',
                    latitude: 0,
                    longitude: 0,
                    altitude: 0,
                    timezone: '',
                },
                tilt: undefined,
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

            const segments = fieldPath.split(".");
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

        // Clear errors related to this field
        setErrors((prev) => prev.filter((error) => error.field !== fieldPath));
    }, []);

    const isDayjs = (value: any): value is dayjs.Dayjs => {
        return value && typeof value === 'object' && typeof value.format === 'function';
    };
    // Handle week start change
    const handleWeekStartChange = useCallback((newValue: string) => {
        const newWeekStart = dayjs(newValue);
        const newUsageTimes = formData.usageTimes?.map((ut, i) => {
            const startHour = isDayjs(ut.start) ? ut.start.hour() : dayjs(ut.start).hour();
            const startMinute = isDayjs(ut.start) ? ut.start.minute() : dayjs(ut.start).minute();
            const endHour = isDayjs(ut.end) ? ut.end.hour() : dayjs(ut.end).hour();
            const endMinute = isDayjs(ut.end) ? ut.end.minute() : dayjs(ut.end).minute();

            const startTime = newWeekStart
                .add(i, 'day')
                .hour(startHour)
                .minute(startMinute);
            const endTime = newWeekStart
                .add(i, 'day')
                .hour(endHour)
                .minute(endMinute);
            return { start: startTime, end: endTime };
        });
        setFormData((prev) => ({
            ...prev,
            weekStart: newWeekStart,
            usageTimes: newUsageTimes,
        }));
    }, [formData.usageTimes]);

    // Handle usage time changes
    const handleUsageTimeChange = useCallback((index: number, type: 'start' | 'end', value: string) => {
        const newTime = dayjs(value, 'HH:mm');
        setFormData((prev) => {
            const updatedUsageTimes = [...(prev.usageTimes || [])];
            const currentValue = updatedUsageTimes[index][type];

            if (isDayjs(currentValue)) {
                updatedUsageTimes[index][type] = currentValue
                    .hour(newTime.hour())
                    .minute(newTime.minute());
            } else {
                // If it's a string, convert to dayjs
                updatedUsageTimes[index][type] = dayjs(currentValue as string)
                    .hour(newTime.hour())
                    .minute(newTime.minute());
            }

            return { ...prev, usageTimes: updatedUsageTimes };
        });
    }, []);;

    // Validate the form
    const validateForm = useCallback(() => {
        let validationErrors: ValidationError[] = [];

        if (formData.category === 'Solar Panel') {
            validationErrors = validateSolarPanelForm(formData, manualEntry);
        } else {
            validationErrors = validateNormalDeviceForm(formData);
        }

        setErrors(validationErrors);

        if (validationErrors.length > 0) {
            // Show the first error in the dialog
            setErrorMessage(validationErrors[0].message);
            setOpenError(true);
            return false;
        }

        return true;
    }, [formData, manualEntry]);

    // Handle form submission
    const handleSubmit = useCallback(async () => {
        if (!validateForm()) {
            return false;
        }

        setLoading(true);

        try {
            const existingDevices = deviceRepository.getAllDevices();

            if (formData.category === 'Solar Panel') {
                const baseSolarData = {
                    ...formData,
                    lastUpdated: new Date().toISOString(),
                    tilt: formData.tilt,
                };

                if (isEditing && editingIndex !== null) {
                    const count =
                        formData.numberOfDevices && formData.numberOfDevices.trim() !== ''
                            ? Number(formData.numberOfDevices)
                            : existingDevices[editingIndex]?.quantity || 1;

                    const updatedDevice = {
                        ...baseSolarData,
                        quantity: count,
                        id: formData.id || existingDevices[editingIndex]?.id
                    };

                    deviceRepository.updateDevice(updatedDevice);
                } else {
                    const count = Number(formData.numberOfDevices) || 1;
                    const newDevice = {
                        ...baseSolarData,
                        quantity: count,
                        id: generateId(),
                    };

                    deviceRepository.addDevice(newDevice);
                }
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
                                start: isDayjs(time.start) ? time.start.toISOString() : time.start,
                                end: isDayjs(time.end) ? time.end.toISOString() : time.end,
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

                    const updatedDevice = {
                        ...baseNormalData,
                        deviceId: String(formData.id || existingDevices[editingIndex]?.deviceId),
                        room: {
                            roomId: formData.roomId ||
                                (existingDevices[editingIndex]?.room &&
                                typeof existingDevices[editingIndex]?.room === 'object' ?
                                    (existingDevices[editingIndex]?.room as any).roomId :
                                    generateRoomId()),
                            roomName: formData.roomName,
                            roomType: formData.roomType,
                        },
                        quantity: count,
                    };

                    deviceRepository.updateDevice(updatedDevice);
                } else {
                    const count = Number(formData.numberOfDevices) || 1;
                    const newDevice = {
                        ...baseNormalData,
                        quantity: count,
                        deviceId: generateId().toString(),
                        room: {
                            roomId: generateRoomId(),
                            roomName: formData.roomName,
                            roomType: formData.roomType,
                        },
                    };

                    deviceRepository.addDevice(newDevice);
                }
            }

            setLoading(false);
            return true;
        } catch (error) {
            console.error('Error submitting form:', error);
            setErrorMessage('Error saving device. Please try again.');
            setOpenError(true);
            setLoading(false);
            return false;
        }
    }, [formData, isEditing, editingIndex, manualEntry, validateForm]);

    // Handle canceling the form
    const handleCancel = useCallback(() => {
        navigate('/management');
    }, [navigate]);

    // Handle closing the error dialog
    const handleCloseError = useCallback(() => {
        setOpenError(false);
    }, []);

    return {
        formData,
        manualEntry,
        isEditing,
        loading,
        errors,
        errorMessage,
        openError,
        setManualEntry,
        handleChange,
        handleCustomChange,
        handleWeekStartChange,
        handleUsageTimeChange,
        handleSubmit,
        handleCancel,
        handleCloseError,
    };
}