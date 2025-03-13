/**
 * Formats a number to a fixed number of decimal places
 * @param value The number to format
 * @param decimals The number of decimal places (default: 2)
 * @returns The formatted number as a string
 */
export function formatNumber(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
}

/**
 * Formats a number to display as kWh
 * @param value The number in kWh
 * @param decimals The number of decimal places (default: 2)
 * @returns Formatted string with kWh unit
 */
export function formatKWh(value: number, decimals: number = 2): string {
    return `${formatNumber(value, decimals)} kWh`;
}

/**
 * Formats a number to display as W or kW depending on the value
 * @param value The wattage value
 * @param decimals The number of decimal places (default: 2)
 * @returns Formatted string with appropriate unit
 */
export function formatWattage(value: number, decimals: number = 2): string {
    if (value >= 1000) {
        return `${formatNumber(value / 1000, decimals)} kW`;
    }
    return `${formatNumber(value, decimals)} W`;
}

/**
 * Formats a percentage
 * @param value The percentage as a decimal (e.g., 0.75 for 75%)
 * @param decimals The number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 0): string {
    return `${formatNumber(value * 100, decimals)}%`;
}

/**
 * Formats a date to a locale string
 * @param date The date to format
 * @param options The Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
    date: Date | string,
    options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }
): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('default', options).format(dateObj);
}

/**
 * Formats a date and time to a locale string
 * @param date The date to format
 * @param options The Intl.DateTimeFormatOptions
 * @returns Formatted date and time string
 */
export function formatDateTime(
    date: Date | string,
    options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }
): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('default', options).format(dateObj);
}

/**
 * Truncates text to a specified length and adds ellipsis if needed
 * @param text The text to truncate
 * @param maxLength Maximum length (default: 50)
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number = 50): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
}

/**
 * Capitalizes the first letter of a string
 * @param text The text to capitalize
 * @returns Capitalized text
 */
export function capitalize(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Formats a time duration in hours and minutes
 * @param hours The duration in hours
 * @returns Formatted duration string
 */
export function formatDuration(hours: number): string {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);

    if (wholeHours === 0) {
        return `${minutes} min`;
    } else if (minutes === 0) {
        return `${wholeHours} hr`;
    } else {
        return `${wholeHours} hr ${minutes} min`;
    }
}