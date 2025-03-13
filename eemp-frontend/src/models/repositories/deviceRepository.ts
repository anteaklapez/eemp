import { Device, IDevice, ISolarPanelDevice } from '../interfaces/deviceInterfaces';
import { generateId } from '../../utils/idUtils';

// Repository for device data, primarily using localStorage
export class DeviceRepository {
    private readonly STORAGE_KEY = 'devices';

    // Get all devices from localStorage
    getAllDevices(): Device[] {
        try {
            const storedDevices = localStorage.getItem(this.STORAGE_KEY);
            return storedDevices ? JSON.parse(storedDevices) : [];
        } catch (error) {
            console.error('Error getting devices from localStorage:', error);
            return [];
        }
    }

    // Get a device by ID
    getDeviceById(id: string | number): Device | null {
        try {
            const devices = this.getAllDevices();
            return devices.find(device =>
                (device.id && device.id === id) ||
                (device.deviceId && device.deviceId === id)
            ) || null;
        } catch (error) {
            console.error(`Error getting device with id ${id}:`, error);
            return null;
        }
    }

    // Add a new device
    addDevice(device: Device): Device {
        try {
            const devices = this.getAllDevices();

            // Generate an ID if not provided
            if (!device.id && !device.deviceId) {
                const newId = generateId();
                device.deviceId = String(newId);
            }

            // Set last updated timestamp
            device.lastUpdated = new Date().toISOString();

            devices.push(device);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(devices));
            return device;
        } catch (error) {
            console.error('Error adding device:', error);
            throw error;
        }
    }

    // Update an existing device
    updateDevice(updatedDevice: Device): Device {
        try {
            const devices = this.getAllDevices();
            const index = devices.findIndex(device =>
                (device.id && device.id === updatedDevice.id) ||
                (device.deviceId && device.deviceId === updatedDevice.deviceId)
            );

            if (index === -1) {
                throw new Error(`Device with id ${updatedDevice.id || updatedDevice.deviceId} not found`);
            }

            // Set last updated timestamp
            updatedDevice.lastUpdated = new Date().toISOString();

            devices[index] = updatedDevice;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(devices));
            return updatedDevice;
        } catch (error) {
            console.error('Error updating device:', error);
            throw error;
        }
    }

    // Delete a device
    deleteDevice(id: string | number): boolean {
        try {
            let devices = this.getAllDevices();
            const initialLength = devices.length;

            devices = devices.filter(device =>
                !(device.id && device.id === id) &&
                !(device.deviceId && device.deviceId === id)
            );

            if (devices.length === initialLength) {
                return false; // No device was removed
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(devices));
            return true;
        } catch (error) {
            console.error(`Error deleting device with id ${id}:`, error);
            return false;
        }
    }

    // Get all regular devices (excluding solar panels)
    getRegularDevices(): IDevice[] {
        const devices = this.getAllDevices();
        return devices.filter(device =>
            device.category !== 'Solar Panel' &&
            device.deviceCategory !== 'Solar Panel'
        ) as IDevice[];
    }

    // Get all solar panel devices
    getSolarPanelDevices(): ISolarPanelDevice[] {
        const devices = this.getAllDevices();
        return devices.filter(device =>
            device.category === 'Solar Panel' ||
            device.deviceCategory === 'Solar Panel'
        ) as ISolarPanelDevice[];
    }

    // Get devices by category
    getDevicesByCategory(category: string): Device[] {
        const devices = this.getAllDevices();
        return devices.filter(device =>
            device.category === category ||
            device.deviceCategory === category
        );
    }

    // Get devices by room
    getDevicesByRoom(roomId: string): Device[] {
        const devices = this.getAllDevices();
        return devices.filter(device => {
            if (typeof device.room === 'object') {
                return device.room?.roomId === roomId;
            }
            return false;
        });
    }
}

// Create a singleton instance
export const deviceRepository = new DeviceRepository();