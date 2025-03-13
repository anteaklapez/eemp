// Device interfaces

import dayjs from "dayjs";

export interface PowerRating {
    value: number;
    unit: string;
}

// src/models/interfaces/deviceInterfaces.ts
export interface UsageTime {
    start: string | dayjs.Dayjs;
    end: string | dayjs.Dayjs;
}

export interface UsagePattern {
    usage_times: UsageTime[];
    frequency_unit?: string;
    frequency_value?: number;
}

export interface Room {
    roomId: string;
    roomName: string;
    roomType: string;
}

// Common device interface
export interface IDevice {
    id?: string | number;
    deviceId?: string;
    deviceName?: string;
    name?: string;
    category?: string;
    deviceCategory?: string;
    powerRating?: PowerRating;
    powerRatingValue?: string;
    powerRatingUnit?: string;
    usagePattern?: UsagePattern;
    usageTimes?: UsageTime[];
    energyType?: string;
    standbyPower?: PowerRating;
    standbyPowerValue?: string;
    standbyPowerUnit?: string;
    room?: Room | string;
    roomName?: string;
    roomType?: string;
    roomId?: string;
    quantity?: number;
    numberOfDevices?: string;
    lastUpdated?: string;
}

// Solar panel specific properties
export interface CustomSolarPanelData {
    location: {
        name: string;
        latitude: number;
        longitude: number;
        altitude: number;
        timezone: string;
    };
    tilt?: number;
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

export interface ISolarPanelDevice extends IDevice {
    module?: string;
    inverter?: string;
    tilt?: string | number;
    orientation?: string | number;
    numberOfStrings?: string | number;
    modulesPerString?: string | number;
    customSolarPanelData?: CustomSolarPanelData;
}

// A unified device type that can be either a regular device or a solar panel
export type Device = IDevice | ISolarPanelDevice;

// For forms
export interface FormData extends ISolarPanelDevice {
    id?: number | string;
    category: string;
    manufacturerModel?: string;
    powerConsumption?: string;
    duration?: string;
    unit?: string;
    peakHoursStart?: any; // Using dayjs
    peakHoursEnd?: any; // Using dayjs
    location?: string;
    environment?: string;
    estimatedCost?: string;
    weekStart?: any; // Using dayjs
}