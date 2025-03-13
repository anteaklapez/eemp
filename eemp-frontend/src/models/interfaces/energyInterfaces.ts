// Energy-related interfaces

export interface ChartDataPoint {
    name: string;
    value: number;
}

export interface ConsumptionData {
    day: ChartDataPoint[];
    week: ChartDataPoint[];
}

export interface ProductionData extends ConsumptionData {
    year: ChartDataPoint[];
}

export interface CategoryConsumption {
    [category: string]: number;
}

export interface EnergyOutput {
    [timestamp: string]: number;
}

export interface DailyConsumption {
    consumption: number;
    timestamp: string;
}

export interface EnergyBreakdown {
    peak: number;
    offPeak: number;
    standby: number;
}

export interface EnergyData {
    consumption?: {
        hourly?: {
            energy_output?: EnergyOutput;
        };
        daily?: {
            energy_output?: EnergyOutput;
            daily_consumption?: DailyConsumption[];
        };
    };
    production?: {
        hourly?: {
            energy_output?: EnergyOutput;
        };
        daily?: {
            energy_output?: EnergyOutput;
        };
        yearly?: {
            energy_output?: {
                [month: string]: number;
            };
        };
    };
}

export interface SolarEfficiency {
    daily: number;
    monthly: number;
}

export interface SavingsPrediction {
    title: string;
    suggestion: string;
    savings_predictions: string[];
    efficiency: SolarEfficiency;
}

export interface Recommendation {
    title: string;
    suggestion: string;
    savings_predictions: string[];
    efficiency: {
        daily: number;
        monthly: number;
    };
}

export interface RecommendationsData {
    recommendations: Recommendation[];
    predicted_efficiency?: {
        weekly?: Record<string, number>;
        monthly?: Record<string, number>;
        yearly?: Record<string, number>;
    };
    current_efficiency?: {
        weekly?: Record<string, number>;
        monthly?: Record<string, number>;
        yearly?: Record<string, number>;
    };
}