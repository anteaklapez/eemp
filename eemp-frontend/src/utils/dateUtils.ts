import dayjs from 'dayjs';

/**
 * Gets the current season based on the current date
 */
export function getCurrentSeason() {
    const now = new Date();
    const month = now.getMonth();

    if (month >= 2 && month <= 4)
        return {
            name: 'Spring',
            message: 'Daylight hours increasing; decreased lighting and heating usage expected.',
        };
    if (month >= 5 && month <= 7)
        return {
            name: 'Summer',
            message: 'Long daylight hours; minimal lighting and maximum cooling usage expected.',
        };
    if (month >= 8 && month <= 10)
        return {
            name: 'Fall',
            message: 'Daylight hours decreasing; increased lighting and heating usage expected.',
        };
    return {
        name: 'Winter',
        message: 'Short daylight hours; maximum lighting and heating usage expected.',
    };
}

/**
 * Calculate duration between two time strings in hours
 */
export function calculateDurationInHours(start: string | dayjs.Dayjs, end: string | dayjs.Dayjs): number {
    try {
        const startTime = typeof start === 'string' ? dayjs(start) : start;
        const endTime = typeof end === 'string' ? dayjs(end) : end;

        if (!startTime.isValid() || !endTime.isValid()) {
            return 0;
        }

        let hours = endTime.diff(startTime, 'hour', true);

        // If negative, assume overnight usage
        if (hours < 0) {
            hours += 24;
        }

        // Clamp to [0..24]
        return Math.max(0, Math.min(hours, 24));
    } catch (error) {
        console.error('Error calculating duration:', error);
        return 0;
    }
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
    try {
        return new Date(date).toLocaleDateString();
    } catch (error) {
        return 'Invalid date';
    }
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: string | Date): string {
    try {
        return new Date(date).toLocaleString();
    } catch (error) {
        return 'Invalid date';
    }
}

/**
 * Get days in the current month
 */
export function getDaysInCurrentMonth(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

/**
 * Get weeks in the current month (approximate)
 */
export function getWeeksInCurrentMonth(): number {
    return getDaysInCurrentMonth() / 7;
}