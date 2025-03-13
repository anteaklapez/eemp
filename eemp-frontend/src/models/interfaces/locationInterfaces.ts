// Location-related interfaces

export interface UserLocation {
    name: string;
    latitude: number;
    longitude: number;
    altitude: number;
    timezone: string;
    country?: string;
}

export interface LocationCoordinates {
    lat: number;
    lng: number;
}

export interface MapSettings {
    center: LocationCoordinates;
    zoom: number;
}

export interface Season {
    name: string;
    message: string;
}