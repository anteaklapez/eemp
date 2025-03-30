import dayjs from 'dayjs';
import { FormData } from '../models/interfaces/deviceInterfaces';

/**
 * Interface for validation errors
 */
export interface ValidationError {
  field: string;
  message: string;
}

/* helper function to check if a value is a Dayjs instance */
const isDayjs = (value: any): value is dayjs.Dayjs => {
  return value && typeof value === 'object' && typeof value.format === 'function';
};

/**
 * Validates that a field is not empty.
 * For numeric fields, undefined or null is considered empty.
 */
export function validateRequired(value: any, fieldName: string): ValidationError | null {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return {
      field: fieldName,
      message: `${fieldName} is required`,
    };
  }
  return null;
}

/**
 * Validates that a string is not longer than maxLength.
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
 * Validates that a number is between min and max.
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
 * Validates that a value (provided as a string) contains only digits.
 * (Looser check for other purposes.)
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
 * Validates that a string represents an integer (only digits; no letters, signs, or "e").
 */
export function validateInteger(value: string, fieldName: string): ValidationError | null {
  const integerRegex = /^\d+$/;
  if (!integerRegex.test(value.trim())) {
    return {
      field: fieldName,
      message: `${fieldName} must be an integer without letters or special characters`,
    };
  }
  return null;
}

/**
 * Validates that a string represents a decimal number (digits with an optional decimal point;
 * no letters, signs, or "e").
 */
export function validateDecimal(value: string, fieldName: string): ValidationError | null {
  const decimalRegex = /^\d+(\.\d+)?$/;
  if (!decimalRegex.test(value.trim())) {
    return {
      field: fieldName,
      message: `${fieldName} must be a valid number without letters or special characters`,
    };
  }
  return null;
}

/**
 * Validates the form data for a solar panel.
 *
 * For standard (non-manual) entry, it validates fields in this order:
 * 1. Name
 * 2. Module
 * 3. Inverter
 * 4. Tilt
 * 5. Rows in parallel
 * 6. Panels per row
 * 7. Orientation
 *
 * For numeric fields, it checks that the field is not empty and then validates
 * the numeric format (integer for rows and panels, decimal for orientation and tilt)
 * plus the value range.
 */
export function validateSolarPanelForm(formData: FormData, manualEntry: boolean): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Validate Name
  const nameErr = validateRequired(formData.name, 'Name');
  if (nameErr) errors.push(nameErr);
  const nameLengthErr = validateMaxLength(formData.name || '', 20, 'Name');
  if (nameLengthErr) errors.push(nameLengthErr);

  if (!manualEntry) {
    // 2. Validate Module
    if (!formData.module?.trim()) {
      errors.push({ field: 'Module', message: 'Module is required' });
    }
    // 3. Validate Inverter
    if (!formData.inverter?.trim()) {
      errors.push({ field: 'Inverter', message: 'Inverter is required' });
    }
    // 4. Validate Tilt (from formData.tilt)
    if (validateRequired(formData.tilt, 'Tilt')) {
      errors.push({ field: 'Tilt', message: 'Tilt is required' });
    } else {
      const tiltStr = String(formData.tilt);
      const tiltDecErr = validateDecimal(tiltStr, 'Tilt');
      if (tiltDecErr) errors.push(tiltDecErr);
      const tiltVal = Number(formData.tilt);
      const tiltRangeErr = validateNumberRange(tiltVal, 1, 359, 'Tilt');
      if (tiltRangeErr) errors.push(tiltRangeErr);
    }
    // 5. Validate Rows in parallel (regular field from formData.numberOfStrings)
    const rowsVal = formData.numberOfStrings;
    if (rowsVal === undefined || rowsVal === null) {
      errors.push({ field: 'Rows in parallel', message: 'Rows in parallel is required' });
    } else {
      const rowsStr = String(rowsVal);
      const rowsIntErr = validateInteger(rowsStr, 'Rows in parallel');
      if (rowsIntErr) errors.push(rowsIntErr);
      const rowsNumber = Number(rowsVal);
      const rowsRangeErr = validateNumberRange(rowsNumber, 1, 10000, 'Rows in parallel');
      if (rowsRangeErr) errors.push(rowsRangeErr);
    }
    // 6. Validate Panels per row (regular field from formData.modulesPerString)
    const panelsVal = formData.modulesPerString;
    if (panelsVal === undefined || panelsVal === null) {
      errors.push({ field: 'Panels per row', message: 'Panels per row is required' });
    } else {
      const panelsStr = String(panelsVal);
      const panelsIntErr = validateInteger(panelsStr, 'Panels per row');
      if (panelsIntErr) errors.push(panelsIntErr);
      const panelsNumber = Number(panelsVal);
      const panelsRangeErr = validateNumberRange(panelsNumber, 1, 10000, 'Panels per row');
      if (panelsRangeErr) errors.push(panelsRangeErr);
    }
    // 7. Validate Orientation (regular field from formData.orientation)
    const orientationVal = formData.orientation;
    if (orientationVal === undefined || orientationVal === null) {
      errors.push({ field: 'Orientation', message: 'Orientation is required' });
    } else {
      const orientationStr = String(orientationVal);
      const orientationDecErr = validateDecimal(orientationStr, 'Orientation');
      if (orientationDecErr) errors.push(orientationDecErr);
      const orientationNumber = Number(orientationVal);
      const orientationRangeErr = validateNumberRange(orientationNumber, 1, 359, 'Orientation');
      if (orientationRangeErr) errors.push(orientationRangeErr);
    }
  } else {
    // Manual entry validation (fields are expected in customSolarPanelData)
    const customData = formData.customSolarPanelData;
    if (!customData) {
      errors.push({ field: 'SolarPanelData', message: 'Solar panel data is missing' });
      return errors;
    }
    // Validate Location
    if (validateRequired(customData.location.name, 'Location Name')) {
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
    if (validateRequired(customData.location.timezone, 'Timezone')) {
      errors.push({ field: 'Timezone', message: 'Timezone is required' });
    }
    // Validate System Parameters
    if (validateRequired(customData.tilt, 'Tilt')) {
      errors.push({ field: 'Tilt', message: 'Tilt is required' });
    } else {
      const tiltStr = String(customData.tilt);
      const tiltDecErr = validateDecimal(tiltStr, 'Tilt');
      if (tiltDecErr) errors.push(tiltDecErr);
      const tiltRangeErr = validateNumberRange(customData.tilt, 1, 359, 'Tilt');
      if (tiltRangeErr) errors.push(tiltRangeErr);
    }
    if (customData.numberOfStrings === undefined || customData.numberOfStrings === null) {
      errors.push({ field: 'Rows in parallel', message: 'Rows in parallel is required' });
    } else {
      const rowsStr = String(customData.numberOfStrings);
      const rowsIntErr = validateInteger(rowsStr, 'Rows in parallel');
      if (rowsIntErr) errors.push(rowsIntErr);
      const rowsRangeErr = validateNumberRange(customData.numberOfStrings, 1, 10000, 'Rows in parallel');
      if (rowsRangeErr) errors.push(rowsRangeErr);
    }
    if (customData.modulesPerString === undefined || customData.modulesPerString === null) {
      errors.push({ field: 'Panels per row', message: 'Panels per row is required' });
    } else {
      const panelsStr = String(customData.modulesPerString);
      const panelsIntErr = validateInteger(panelsStr, 'Panels per row');
      if (panelsIntErr) errors.push(panelsIntErr);
      const panelsRangeErr = validateNumberRange(customData.modulesPerString, 1, 10000, 'Panels per row');
      if (panelsRangeErr) errors.push(panelsRangeErr);
    }
    if (customData.orientation === undefined || customData.orientation === null) {
      errors.push({ field: 'Orientation', message: 'Orientation is required' });
    } else {
      const orientationStr = String(customData.orientation);
      const orientationDecErr = validateDecimal(orientationStr, 'Orientation');
      if (orientationDecErr) errors.push(orientationDecErr);
      const orientationRangeErr = validateNumberRange(customData.orientation, 1, 359, 'Orientation');
      if (orientationRangeErr) errors.push(orientationRangeErr);
    }
    // Module validation
    if (validateRequired(customData.custom_solar_module.name, 'Module Name')) {
      errors.push({ field: 'Module Name', message: 'Module name is required' });
    }
    const moduleFields = [
      'pdc0', 'gamma_pdc', 'bvoco', 'bvmpo', 'impo',
      'vmpo', 'pmpo', 'a_c', 'n_s', 't_noct'
    ];
    moduleFields.forEach(field => {
      if (customData.custom_solar_module[field] == null) {
        errors.push({ field, message: `${field} is required` });
      }
    });
    // Inverter validation
    if (validateRequired(customData.custom_inverter.name, 'Inverter Name')) {
      errors.push({ field: 'Inverter Name', message: 'Inverter name is required' });
    }
    const inverterFields = [
      'pdc0', 'paco', 'pdco', 'vdco', 'pso',
      'c0', 'c1', 'c2', 'c3'
    ];
    inverterFields.forEach(field => {
      if (customData.custom_inverter[field] == null) {
        errors.push({ field, message: `${field} is required` });
      }
    });
    // Temperature model validation
    const tempFields = ['u_c', 'u_v', 'eta_m', 'alpha_absorption'];
    tempFields.forEach(field => {
      if (customData.custom_temp_model_params[field] == null) {
        errors.push({ field, message: `${field} is required` });
      }
    });
  }

  return errors;
}

/**
 * Validates the form data for a normal device.
 */
export function validateNormalDeviceForm(formData: FormData): ValidationError[] {
  const errors: ValidationError[] = [];
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
  const nameLengthError = validateMaxLength(formData.name || '', 20, 'Device name');
  if (nameLengthError) errors.push(nameLengthError);
  const roomNameLengthError = validateMaxLength(formData.roomName || '', 20, 'Room name');
  if (roomNameLengthError) errors.push(roomNameLengthError);
  if (formData.powerRatingValue) {
    const powerRatingError = validateNumeric(formData.powerRatingValue, 'Power rating');
    if (powerRatingError) errors.push(powerRatingError);
  }
  if (formData.standbyPowerValue) {
    const standbyPowerError = validateNumeric(formData.standbyPowerValue, 'Standby power');
    if (standbyPowerError) errors.push(standbyPowerError);
  }
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
