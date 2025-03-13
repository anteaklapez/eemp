import { UserLocation } from '../interfaces/locationInterfaces';

/**
 * Repository for user location data
 */
export class LocationRepository {
    private readonly STORAGE_KEY = 'userLocation';

    /**
     * Gets the user's saved location
     */
    getUserLocation(): UserLocation | null {
        try {
            const storedLocation = localStorage.getItem(this.STORAGE_KEY);
            return storedLocation ? JSON.parse(storedLocation) : null;
        } catch (error) {
            console.error('Error getting location from localStorage:', error);
            return null;
        }
    }

    /**
     * Saves the user's location
     */
    saveUserLocation(location: UserLocation): UserLocation {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(location));
            return location;
        } catch (error) {
            console.error('Error saving location to localStorage:', error);
            throw error;
        }
    }

    /**
     * Clears the user's location
     */
    clearUserLocation(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing location from localStorage:', error);
        }
    }

    /**
     * Checks if a location is saved
     */
    hasUserLocation(): boolean {
        return localStorage.getItem(this.STORAGE_KEY) !== null;
    }

    /**
     * Gets a default location when none is provided
     */
    getDefaultLocation(): UserLocation {
        return {
            name: 'Default Location',
            latitude: 45.815399,
            longitude: 15.966568,
            altitude: 122,
            timezone: 'Europe/Zagreb',
            country: 'Croatia'
        };
    }
}

// Create a singleton instance
export const locationRepository = new LocationRepository();