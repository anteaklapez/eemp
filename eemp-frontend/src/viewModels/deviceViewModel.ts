import {useCallback, useEffect, useState} from 'react';
import {deviceRepository} from '../models/repositories/deviceRepository';
import {energyRepository} from '../models/repositories/energyRepository';
import {Device, FormData, IDevice} from '../models/interfaces/deviceInterfaces';
import {generateId, generateRoomId} from '../utils/idUtils';
import dayjs from 'dayjs';

export function useDeviceViewModel() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<{
        show: boolean;
        message: string;
        type: 'success' | 'error';
    }>({
        show: false,
        message: '',
        type: 'success',
    });
    const [filterCategory, setFilterCategory] = useState<string>('All');
    const [selectedRoom, setSelectedRoom] = useState<string>('All');
    const [openRemoveDialog, setOpenRemoveDialog] = useState<boolean>(false);
    const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);

    // Load devices on mount
    useEffect(() => {
        loadDevices();
    }, []);

    // Load devices from repository
    const loadDevices = useCallback(() => {
        try {
            const loadedDevices = deviceRepository.getAllDevices();
            setDevices(loadedDevices);
        } catch (err) {
            console.error('Error loading devices:', err);
            setError('Failed to load devices');
        }
    }, []);

    // Get device by ID
    const getDeviceById = useCallback((id: string | number): Device | null => {
        return deviceRepository.getDeviceById(id);
    }, []);

    // Add a new device
    const addDevice = useCallback(async (device: FormData): Promise<boolean> => {
        try {
            setLoading(true);

            // Process the form data into a device
            const newDevice = processFormData(device);

            // Add to repository
            deviceRepository.addDevice(newDevice);

            // Refresh devices list
            loadDevices();

            // Show notification
            setNotification({
                show: true,
                message: 'Device added successfully',
                type: 'success',
            });

            setLoading(false);
            return true;
        } catch (err) {
            console.error('Error adding device:', err);
            setError('Failed to add device');
            setNotification({
                show: true,
                message: 'Failed to add device',
                type: 'error',
            });
            setLoading(false);
            return false;
        }
    }, [loadDevices]);

    // Update an existing device
    const updateDevice = useCallback(async (device: FormData): Promise<boolean> => {
        try {
            setLoading(true);

            // Process the form data into a device
            const updatedDevice = processFormData(device);

            // Update in repository
            deviceRepository.updateDevice(updatedDevice);

            // Refresh devices list
            loadDevices();

            // Show notification
            setNotification({
                show: true,
                message: 'Device updated successfully',
                type: 'success',
            });

            setLoading(false);
            return true;
        } catch (err) {
            console.error('Error updating device:', err);
            setError('Failed to update device');
            setNotification({
                show: true,
                message: 'Failed to update device',
                type: 'error',
            });
            setLoading(false);
            return false;
        }
    }, [loadDevices]);

    // Delete a device
    const deleteDevice = useCallback(async (device: Device): Promise<boolean> => {
        try {
            setLoading(true);

            const id = device.id || device.deviceId;

            if (!id) {
                throw new Error('Device ID is missing');
            }

            // Delete from repository
            const success = deviceRepository.deleteDevice(id);

            if (!success) {
                throw new Error('Device not found');
            }

            // Refresh devices list
            loadDevices();

            // Clear energy data if no devices remain
            const remainingDevices = deviceRepository.getAllDevices();
            if (remainingDevices.length === 0) {
                energyRepository.clearEnergyData();
            }

            // Show notification
            setNotification({
                show: true,
                message: 'Device removed successfully',
                type: 'success',
            });

            setLoading(false);
            return true;
        } catch (err) {
            console.error('Error deleting device:', err);
            setError('Failed to delete device');
            setNotification({
                show: true,
                message: 'Failed to delete device',
                type: 'error',
            });
            setLoading(false);
            return false;
        }
    }, [loadDevices]);

    // Open the remove dialog
    const handleOpenRemoveDialog = useCallback((device: Device) => {
        setDeviceToRemove(device);
        setOpenRemoveDialog(true);
    }, []);

    // Close the remove dialog
    const handleCloseRemoveDialog = useCallback(() => {
        setOpenRemoveDialog(false);
        setDeviceToRemove(null);
    }, []);

    // Confirm device removal
    const handleConfirmRemove = useCallback(async () => {
        if (deviceToRemove) {
            await deleteDevice(deviceToRemove);
            setOpenRemoveDialog(false);
            setDeviceToRemove(null);
        }
    }, [deviceToRemove, deleteDevice]);

    // Handle notification close
    const handleCloseNotification = useCallback(() => {
        setNotification({ ...notification, show: false });
    }, [notification]);

    // Get filtered devices based on category and room
    const getFilteredDevices = useCallback(() => {
        return devices.filter((device) => {
            const categoryMatch =
                filterCategory === 'All' ||
                device.category === filterCategory ||
                device.deviceCategory === filterCategory;

            let roomMatch = true;
            if (selectedRoom !== 'All') {
                // Handle room filtering logic
                const [roomName, roomType] = selectedRoom.split('||');

                if (typeof device.room === 'object') {
                    roomMatch = device.room?.roomName === roomName &&
                        (roomType ? device.room?.roomType === roomType : true);
                } else if (typeof device.room === 'string') {
                    roomMatch = device.room === roomName;
                } else if (device.roomName) {
                    roomMatch = device.roomName === roomName &&
                        (roomType ? device.roomType === roomType : true);
                } else {
                    roomMatch = false;
                }
            }

            return categoryMatch && roomMatch;
        });
    }, [devices, filterCategory, selectedRoom]);

    // Get all unique rooms from the devices
    const getAllRooms = useCallback(() => {
        const roomMap = new Map<string, { name: string; type: string }>();

        devices.forEach((device) => {
            let roomName = '';
            let roomType = '';

            if (typeof device.room === 'object') {
                roomName = device.room?.roomName || '';
                roomType = device.room?.roomType || '';
            } else if (typeof device.room === 'string') {
                roomName = device.room;
            } else if (device.roomName) {
                roomName = device.roomName;
                roomType = device.roomType || '';
            }

            if (roomName) {
                const key = `${roomName}||${roomType}`;
                roomMap.set(key, { name: roomName, type: roomType });
            }
        });

        return Array.from(roomMap.entries()).map(([key, value]) => ({
            key,
            name: value.name,
            type: value.type
        }));
    }, [devices]);

    // Process form data into a device object
    const processFormData = (formData: FormData): Device => {
        if (formData.category === 'Solar Panel') {
            // Process solar panel device
            return processSolarPanelFormData(formData);
        } else {
            // Process regular device
            return processRegularDeviceFormData(formData);
        }
    };

    // Process solar panel form data
    const processSolarPanelFormData = (formData: FormData): Device => {
        return {
            id: formData.id || generateId(),
            name: formData.name || 'Solar Panel',
            category: 'Solar Panel',
            module: formData.module,
            inverter: formData.inverter,
            tilt: formData.tilt,
            orientation: formData.orientation,
            numberOfStrings: formData.numberOfStrings,
            modulesPerString: formData.modulesPerString,
            customSolarPanelData: formData.customSolarPanelData,
            quantity: formData.numberOfDevices ? parseInt(formData.numberOfDevices) : 1,
            lastUpdated: new Date().toISOString()
        };
    };

    // Process regular device form data
    const processRegularDeviceFormData = (formData: FormData): Device => {
        // Create device object
        return {
            deviceId: formData.id?.toString() || generateId().toString(),
            deviceName: formData.name || 'Unnamed Device',
            deviceCategory: formData.category,
            powerRating: {
                value: parseFloat(formData.powerRatingValue || '0'),
                unit: formData.powerRatingUnit || 'W'
            },
            usagePattern: {
                usage_times: formData.usageTimes
                    ? formData.usageTimes.map(time => ({
                        start: dayjs(time.start).toISOString(),
                        end: dayjs(time.end).toISOString()
                    }))
                    : []
            },
            energyType: formData.energyType || 'AC',
            standbyPower: {
                value: parseFloat(formData.standbyPowerValue || '0'),
                unit: formData.standbyPowerUnit || 'W'
            },
            room: {
                roomId: formData.roomId || generateRoomId(),
                roomName: formData.roomName || '',
                roomType: formData.roomType || ''
            },
            quantity: formData.numberOfDevices ? parseInt(formData.numberOfDevices) : 1,
            lastUpdated: new Date().toISOString()
        };
    };

    return {
        devices,
        loading,
        error,
        notification,
        filterCategory,
        selectedRoom,
        openRemoveDialog,
        deviceToRemove,
        getDeviceById,
        loadDevices,
        addDevice,
        updateDevice,
        deleteDevice,
        setFilterCategory,
        setSelectedRoom,
        handleOpenRemoveDialog,
        handleCloseRemoveDialog,
        handleConfirmRemove,
        handleCloseNotification,
        getFilteredDevices,
        getAllRooms,
    };
}