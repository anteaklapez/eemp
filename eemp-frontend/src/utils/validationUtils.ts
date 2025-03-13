import dayjs from 'dayjs';
import { FormData } from '../models/interfaces/deviceInterfaces';
/**
 * Interface for validation errors
 */
export interface ValidationError {
    field: string;
    message: string;
}

/* helper function */
const isDayjs = (value: any): value is dayjs.Dayjs => {
    return value && typeof value === 'object' && typeof value.format === 'function';
};

/**
 * Validates a field is not empty
 */
export function validateRequired(value: any, fieldName: string): ValidationError | null {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        return {
            field: fieldName,
            message: `${fieldName} is required`,
        };
    }
    return null;
}

/**
 * Validates a string is not longer than maxLength
 */
export function validateMaxLength(value: string, maxLength: number, fieldName: string): ValidationError | null {
    if (value && value.length > maxLength) {
        return {
            field: fieldName,
            message: `${fieldName} must be at most ${maxLength} characters`,
        };
    }
    return null;
}

/**
 * Validates a number is between min and max
 */
export function validateNumberRange(value: number, min: number, max: number, fieldName: string): ValidationError | null {
    if (isNaN(value) || value < min || value > max) {
        return {
            field: fieldName,
            message: `${fieldName} must be between ${min} and ${max}`,
        };
    }
    return null;
}

/**
 * Validates a value is a number
 */
export function validateNumeric(value: string, fieldName: string): ValidationError | null {
    const numericRegex = /^[0-9]+$/;
    if (!numericRegex.test(value.trim())) {
        return {
            field: fieldName,
            message: `${fieldName} must be a number without special characters or letters`,
        };
    }
    return null;
}

/**
 * Validates the form data for a solar panel
 */
export function validateSolarPanelForm(formData: FormData, manualEntry: boolean): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate name
    const nameError = validateRequired(formData.name, 'Name');
    if (nameError) errors.push(nameError);

    const nameLengthError = validateMaxLength(formData.name || '', 20, 'Name');
    if (nameLengthError) errors.push(nameLengthError);

    if (!manualEntry) {
        // Standard form validation
        if (!formData.module?.trim()) {
            errors.push({ field: 'Module', message: 'Module is required' });
        }

        if (!formData.inverter?.trim()) {
            errors.push({ field: 'Inverter', message: 'Inverter is required' });
        }

        const tiltValue = Number(formData.tilt);
        const tiltError = validateNumberRange(tiltValue, 1, 359, 'Tilt');
        if (tiltError) errors.push(tiltError);

        // Validate rows in parallel (numberOfStrings)
        const numberOfStrings = formData.customSolarPanelData?.numberOfStrings;
        const stringsError = validateNumberRange(numberOfStrings || 0, 1, 10000, 'Rows in parallel');
        if (stringsError) errors.push(stringsError);

        // Validate panels per row (modulesPerString)
        const modulesPerString = formData.customSolarPanelData?.modulesPerString;
        const modulesError = validateNumberRange(modulesPerString || 0, 1, 10000, 'Panels per row');
        if (modulesError) errors.push(modulesError);

        // Validate orientation
        const orientationValue = Number(formData.customSolarPanelData?.orientation);
        const orientationError = validateNumberRange(orientationValue, 1, 359, 'Orientation');
        if (orientationError) errors.push(orientationError);
    } else {
        // Manual entry validation
        const customData = formData.customSolarPanelData;
        if (!customData) {
            errors.push({ field: 'SolarPanelData', message: 'Solar panel data is missing' });
            return errors;
        }

        // Location validation
        if (!customData.location.name.trim()) {
            errors.push({ field: 'Location Name', message: 'Location name is required' });
        }

        if (customData.location.latitude == null) {
            errors.push({ field: 'Latitude', message: 'Latitude is required' });
        }

        if (customData.location.longitude == null) {
            errors.push({ field: 'Longitude', message: 'Longitude is required' });
        }

        if (customData.location.altitude == null) {
            errors.push({ field: 'Altitude', message: 'Altitude is required' });
        }

        if (!customData.location.timezone.trim()) {
            errors.push({ field: 'Timezone', message: 'Timezone is required' });
        }

        // System parameters validation
        const tiltError = validateNumberRange(customData.tilt || 0, 1, 359, 'Tilt');
        if (tiltError) errors.push(tiltError);

        const stringsError = validateNumberRange(customData.numberOfStrings, 1, 10000, 'Rows in parallel');
        if (stringsError) errors.push(stringsError);

        const modulesError = validateNumberRange(customData.modulesPerString, 1, 10000, 'Panels per row');
        if (modulesError) errors.push(modulesError);

        const orientationError = validateNumberRange(customData.orientation, 1, 359, 'Orientation');
        if (orientationError) errors.push(orientationError);

        // Module validation
        const moduleData = customData.custom_solar_module;
        if (!moduleData.name.trim()) {
            errors.push({ field: 'Module Name', message: 'Module name is required' });
        }

        // Check all required module fields
        const moduleFields = [
            'pdc0', 'gamma_pdc', 'bvoco', 'bvmpo', 'impo',
            'vmpo', 'pmpo', 'a_c', 'n_s', 't_noct'
        ];
        moduleFields.forEach(field => {
            if (moduleData[field] == null) {
                errors.push({ field, message: `${field} is required` });
            }
        });

        // Inverter validation
        const inverterData = customData.custom_inverter;
        if (!inverterData.name.trim()) {
            errors.push({ field: 'Inverter Name', message: 'Inverter name is required' });
        }

        // Check all required inverter fields
        const inverterFields = [
            'pdc0', 'paco', 'pdco', 'vdco', 'pso',
            'c0', 'c1', 'c2', 'c3'
        ];
        inverterFields.forEach(field => {
            if (inverterData[field] == null) {
                errors.push({ field, message: `${field} is required` });
            }
        });

        // Temperature model validation
        const tempData = customData.custom_temp_model_params;
        const tempFields = ['u_c', 'u_v', 'eta_m', 'alpha_absorption'];
        tempFields.forEach(field => {
            if (tempData[field] == null) {
                errors.push({ field, message: `${field} is required` });
            }
        });
    }

    return errors;
}

/**
 * Validates the form data for a normal device
 */
export function validateNormalDeviceForm(formData: FormData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required fields
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
        const error = validateRequired(formData[field], field.toString());
        if (error) errors.push(error);
    }

    // Validate name length
    const nameLengthError = validateMaxLength(formData.name || '', 20, 'Device name');
    if (nameLengthError) errors.push(nameLengthError);

    // Validate room name length
    const roomNameLengthError = validateMaxLength(formData.roomName || '', 20, 'Room name');
    if (roomNameLengthError) errors.push(roomNameLengthError);

    // Validate numeric fields
    if (formData.powerRatingValue) {
        const powerRatingError = validateNumeric(formData.powerRatingValue, 'Power rating');
        if (powerRatingError) errors.push(powerRatingError);
    }

    if (formData.standbyPowerValue) {
        const standbyPowerError = validateNumeric(formData.standbyPowerValue, 'Standby power');
        if (standbyPowerError) errors.push(standbyPowerError);
    }

    // Validate number of devices
    if (formData.numberOfDevices) {
        const numDevicesError = validateNumeric(formData.numberOfDevices, 'Number of devices');
        if (numDevicesError) errors.push(numDevicesError);

        const numDevices = Number(formData.numberOfDevices);
        if (numDevices > 100000) {
            errors.push({
                field: 'numberOfDevices',
                message: 'Number of devices cannot exceed 100,000',
            });
        }
    }

    // Validate usage times
    if (!formData.usageTimes || formData.usageTimes.length !== 7) {
        errors.push({
            field: 'usageTimes',
            message: 'Please provide usage times for all 7 days of the week',
        });
    } else {
        for (let i = 0; i < formData.usageTimes.length; i++) {
            const { start, end } = formData.usageTimes[i];
            if (!start || !end) {
                errors.push({
                    field: `usageTimes[${i}]`,
                    message: 'Please provide both start and end times',
                });
            } else if ((isDayjs(end) && isDayjs(start) && end.isBefore(start)) ||
                (!isDayjs(end) && !isDayjs(start) && dayjs(end as string).isBefore(dayjs(start as string)))) {
                const dayLabel = (formData.weekStart || dayjs())
                    .add(i, 'day')
                    .format('ddd, MMM D');
                errors.push({
                    field: `usageTimes[${i}]`,
                    message: `For ${dayLabel}: End time must be after start time`,
                });
            }
        }
    }

    return errors;
}
