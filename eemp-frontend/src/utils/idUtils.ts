/**
 * Generates a unique ID for new records
 * Combines timestamp with a random number for uniqueness
 */
export function generateId(): string {
    return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/**
 * Generates a unique room ID
 */
export function generateRoomId(): string {
    return `room_${generateId()}`;
}

/**
 * Generates a unique device ID
 */
export function generateDeviceId(): string {
    return `device_${generateId()}`;
}