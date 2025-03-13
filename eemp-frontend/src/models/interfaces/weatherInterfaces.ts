// Weather-related interfaces

export interface WeatherCondition {
    id: number;
    main: string;
    description: string;
    icon: string;
}

export interface Temperature {
    day: number;
    min: number;
    max: number;
    night: number;
    eve: number;
    morn: number;
}

export interface DailyWeather {
    dt: number;
    sunrise: number;
    sunset: number;
    temp: Temperature;
    feels_like: Temperature;
    pressure: number;
    humidity: number;
    dew_point: number;
    wind_speed: number;
    wind_deg: number;
    weather: WeatherCondition[];
    clouds: number;
    pop: number;
    uvi: number;
    rain?: number;
}

export interface WeatherData {
    daily: DailyWeather[];
}