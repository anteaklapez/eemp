import { WeatherData } from '../interfaces/weatherInterfaces';
import { UserLocation } from '../interfaces/locationInterfaces';

/**
 * Repository for weather data
 */
export class WeatherRepository {
    private readonly API_BASE_URL = 'https://eemp-backend-production.up.railway.app/weather';

    /**
     * Fetches daily weather data
     * @param location User location
     */
    async fetchDailyWeather(location: UserLocation): Promise<WeatherData> {
        try {
            const response = await fetch(`${this.API_BASE_URL}/daily`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(location),
            });

            if (!response.ok) {
                throw new Error(`Weather API returned status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching daily weather:', error);
            throw error;
        }
    }

    /**
     * Gets the first day's weather from the response
     * @param weatherData Full weather data
     */
    getTodayWeather(weatherData: WeatherData): any {
        if (weatherData && weatherData.daily && weatherData.daily.length > 0) {
            return weatherData.daily[0];
        }
        return null;
    }
}

// Create a singleton instance
export const weatherRepository = new WeatherRepository();