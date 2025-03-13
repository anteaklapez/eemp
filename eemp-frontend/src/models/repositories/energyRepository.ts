import { EnergyData, RecommendationsData } from '../interfaces/energyInterfaces';

/**
 * Repository for energy data management
 */
export class EnergyRepository {
    private readonly ENERGY_DATA_KEY = 'energyData';
    private readonly LAST_UPDATED_KEY = 'energyDataLastUpdated';
    private readonly RECOMMENDATIONS_KEY = 'recommendations';

    /**
     * Gets the stored energy data
     */
    getEnergyData(): EnergyData | null {
        try {
            const storedData = localStorage.getItem(this.ENERGY_DATA_KEY);
            return storedData ? JSON.parse(storedData) : null;
        } catch (error) {
            console.error('Error getting energy data from localStorage:', error);
            return null;
        }
    }

    /**
     * Saves energy data
     */
    saveEnergyData(data: EnergyData): void {
        try {
            localStorage.setItem(this.ENERGY_DATA_KEY, JSON.stringify(data));
            localStorage.setItem(this.LAST_UPDATED_KEY, new Date().toISOString());
        } catch (error) {
            console.error('Error saving energy data to localStorage:', error);
            throw error;
        }
    }

    /**
     * Gets when the energy data was last updated
     */
    getEnergyDataLastUpdated(): Date | null {
        try {
            const lastUpdated = localStorage.getItem(this.LAST_UPDATED_KEY);
            return lastUpdated ? new Date(lastUpdated) : null;
        } catch (error) {
            console.error('Error getting energy data last updated timestamp:', error);
            return null;
        }
    }

    /**
     * Gets the stored recommendations data
     */
    getRecommendationsData(): RecommendationsData | null {
        try {
            const storedData = localStorage.getItem(this.RECOMMENDATIONS_KEY);
            return storedData ? JSON.parse(storedData) : null;
        } catch (error) {
            console.error('Error getting recommendations data from localStorage:', error);
            return null;
        }
    }

    /**
     * Saves recommendations data
     */
    saveRecommendationsData(data: RecommendationsData): void {
        try {
            localStorage.setItem(this.RECOMMENDATIONS_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving recommendations data to localStorage:', error);
            throw error;
        }
    }

    /**
     * Clears all energy data
     */
    clearEnergyData(): void {
        try {
            localStorage.removeItem(this.ENERGY_DATA_KEY);
            localStorage.removeItem(this.LAST_UPDATED_KEY);
            localStorage.removeItem(this.RECOMMENDATIONS_KEY);
        } catch (error) {
            console.error('Error clearing energy data from localStorage:', error);
        }
    }

    /**
     * Checks if energy data is stored
     */
    hasEnergyData(): boolean {
        return localStorage.getItem(this.ENERGY_DATA_KEY) !== null;
    }

    /**
     * Checks if recommendations data is stored
     */
    hasRecommendationsData(): boolean {
        return localStorage.getItem(this.RECOMMENDATIONS_KEY) !== null;
    }

    /**
     * Checks if energy data needs refreshing (older than 24 hours)
     */
    isEnergyDataStale(): boolean {
        const lastUpdated = this.getEnergyDataLastUpdated();
        if (!lastUpdated) return true;

        const now = new Date();
        const timeDiff = now.getTime() - lastUpdated.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        return hoursDiff > 24;
    }
}

// Create a singleton instance
export const energyRepository = new EnergyRepository();