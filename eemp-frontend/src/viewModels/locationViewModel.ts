import { useState, useEffect, useCallback } from 'react';
import { locationRepository } from '../models/repositories/locationRepository';
import { UserLocation, LocationCoordinates } from '../models/interfaces/locationInterfaces';
import { getCurrentSeason } from '../utils/dateUtils';

export function useLocationViewModel() {
    const [location, setLocation] = useState<UserLocation | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<UserLocation | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [mapType, setMapType] = useState<'satellite' | 'hybrid' | 'terrain'>('hybrid');

    // The season based on current date
    const currentSeason = getCurrentSeason();

    // Load location on mount
    useEffect(() => {
        const storedLocation = locationRepository.getUserLocation();
        setLocation(storedLocation);
    }, []);

    // Save location
    const saveLocation = useCallback(async () => {
        if (!selectedLocation) {
            setError('No location selected');
            return false;
        }

        try {
            setLoading(true);
            locationRepository.saveUserLocation(selectedLocation);
            setLocation(selectedLocation);
            setLoading(false);
            return true;
        } catch (err) {
            console.error('Error saving location:', err);
            setError('Failed to save location');
            setLoading(false);
            return false;
        }
    }, [selectedLocation]);

    // Update selected location
    const updateSelectedLocation = useCallback((newLocation: UserLocation) => {
        setSelectedLocation(newLocation);
        setError(null);
    }, []);

    // Handle map click
    const handleMapClick = useCallback((coordinates: LocationCoordinates) => {
        const newLocation: UserLocation = {
            name: 'Manual Selection',
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            altitude: 122, // Default value
            timezone: 'Unknown', // Default value
        };

        updateSelectedLocation(newLocation);
    }, [updateSelectedLocation]);

    // Handle map type change
    const handleMapTypeChange = useCallback((newType: 'satellite' | 'hybrid' | 'terrain') => {
        setMapType(newType);
    }, []);

    // Get default center for map
    const getMapCenter = useCallback((): LocationCoordinates => {
        if (selectedLocation) {
            return {
                lat: selectedLocation.latitude,
                lng: selectedLocation.longitude
            };
        }

        if (location) {
            return {
                lat: location.latitude,
                lng: location.longitude
            };
        }

        // Default location (e.g., San Francisco)
        return { lat: 37.7749, lng: -122.4194 };
    }, [selectedLocation, location]);

    // Check if user has set a location
    const hasLocation = useCallback((): boolean => {
        return locationRepository.hasUserLocation();
    }, []);

    return {
        location,
        selectedLocation,
        loading,
        error,
        mapType,
        currentSeason,
        getMapCenter,
        updateSelectedLocation,
        handleMapClick,
        handleMapTypeChange,
        saveLocation,
        hasLocation,
    };
}