import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// API Response Types
interface ChartDataPoint {
  name: string;
  value: number;
}

interface Location {
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  timezone: string;
}

interface PowerRating {
  value: number;
  unit: string;
}

interface StandbyPower {
  value: number;
  unit: string;
}

interface Room {
  roomId: string;
  roomName: string;
  roomType: string;
}

interface UsageTime {
  start: string;
  end: string;
}

interface UsagePattern {
  frequency_unit: string;
  frequency_value: number;
  usage_times: UsageTime[];
}

interface Device {
  deviceId: string;
  deviceName: string;
  powerRating: PowerRating;
  usagePattern: UsagePattern;
  energyType: string;
  standbyPower: StandbyPower;
  deviceCategory: string;
  numberOfDevices: number;
  room: Room;
}

interface SolarPanelData {
  inverter_name: string;
  module_name: string;
  tilt: number;
  orientation: number;
  capacity: number;
  efficiency: number;
  installation_year: number;
}

interface ConsumptionRequestBody {
  location: Location;
  start_date: string;
  devices: Device[];
}

interface ProductionRequestBody {
  location: Location;
  solar_panel_data: SolarPanelData;
}

interface HourlyResponse {
  hourly_data: Array<{ hour: number; energy: number }>;
  total_energy: number;
}

interface DailyResponse {
  daily_data: Array<{ day: number; energy: number }>;
  total_energy: number;
}

interface YearlyResponse {
  monthly_data: Array<{ month: number; energy: number }>;
  total_energy: number;
}

interface CategoryBreakdown {
  [key: string]: number;
}

// Component Props & State
type ModeType = "consumption" | "production";
type TimeframeType = "day" | "week" | "year";

interface DashboardState {
  mode: ModeType;
  timeframe: TimeframeType;
  chartData: ChartDataPoint[];
  totalKwh: number;
  loading: boolean;
  categoryBreakdown: CategoryBreakdown;
}

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const baseUrl = "https://your-api-endpoint.com"; // Replace with your actual API endpoint

  // State with proper typing
  const [state, setState] = useState<DashboardState>({
    mode: "consumption",
    timeframe: "day",
    chartData: [],
    totalKwh: 0,
    loading: true,
    categoryBreakdown: {},
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mode, state.timeframe]);

  const fetchData = async (): Promise<void> => {
    setState(prevState => ({ ...prevState, loading: true }));
    
    try {
      // Skip yearly consumption as it's not available
      if (state.mode === "consumption" && state.timeframe === "year") {
        setState(prevState => ({ ...prevState, timeframe: "day" }));
        return;
      }
      
      let endpoint = "";
      let requestBody: ConsumptionRequestBody | ProductionRequestBody;
      
      // Determine endpoint based on mode and timeframe
      if (state.mode === "consumption") {
        endpoint = `/consumption/${state.timeframe === "day" ? "hourly" : "daily"}`;
        
        // Build consumption request body
        requestBody = {
          location: {
            name: "Zagreb",
            latitude: 45.815399,
            longitude: 15.966568,
            altitude: 122,
            timezone: "Europe/Zagreb"
          },
          start_date: "2025-02-28", // Current date
          devices: [
            // Add your devices here based on the API schema
            {
              deviceId: "bulb1",
              deviceName: "LED Bulb",
              powerRating: {
                value: 10,
                unit: "W"
              },
              usagePattern: {
                frequency_unit: "days",
                frequency_value: 1,
                usage_times: [
                  {
                    start: "2025-02-28T18:00:00+01:00",
                    end: "2025-02-28T23:00:00+01:00"
                  }
                ]
              },
              energyType: "AC",
              standbyPower: {
                value: 0.5,
                unit: "W"
              },
              deviceCategory: "lighting",
              numberOfDevices: 3,
              room: {
                roomId: "livingRoom",
                roomName: "Living Room",
                roomType: "Living Room"
              }
            }
          ]
        } as ConsumptionRequestBody;
      } else {
        endpoint = `/production/${state.timeframe === "day" ? "hourly" : state.timeframe === "week" ? "daily" : "yearly"}`;
        
        // Build production request body
        requestBody = {
          location: {
            name: "Zagreb",
            latitude: 45.815399,
            longitude: 15.966568,
            altitude: 122,
            timezone: "Europe/Zagreb"
          },
          solar_panel_data: {
            inverter_name: "ABB__MICRO_0_3HV_I_OUTD_US_208__208V_",
            module_name: "Advent_Solar_AS160___2006_",
            tilt: 30.0,
            orientation: 180.0,
            capacity: 300,
            efficiency: 21.5,
            installation_year: 2022
          }
        } as ProductionRequestBody;
      }
      
      // Make API request
      const response = await axios.post(baseUrl + endpoint, requestBody);
      
      // Process the data based on timeframe
      let processedData: { chartData: ChartDataPoint[]; totalKwh: number; categoryBreakdown?: CategoryBreakdown };
      
      if (state.timeframe === "day") {
        processedData = processHourlyData(response.data as HourlyResponse);
      } else if (state.timeframe === "week") {
        processedData = processDailyData(response.data as DailyResponse);
      } else {
        processedData = processYearlyData(response.data as YearlyResponse);
      }
      
      setState(prevState => ({
        ...prevState,
        chartData: processedData.chartData,
        totalKwh: processedData.totalKwh,
        categoryBreakdown: processedData.categoryBreakdown || prevState.categoryBreakdown,
        loading: false
      }));
      
    } catch (error) {
      console.error("Error fetching data:", error);
      
      // Fallback to sample data
      const sampleData = getSampleData(state.mode, state.timeframe);
      setState(prevState => ({
        ...prevState,
        chartData: sampleData.chartData,
        totalKwh: sampleData.totalKwh,
        categoryBreakdown: sampleData.categoryBreakdown || {},
        loading: false
      }));
    }
  };

  // Process API response data
  const processHourlyData = (data: HourlyResponse): { chartData: ChartDataPoint[]; totalKwh: number; categoryBreakdown?: CategoryBreakdown } => {
    const chartData = data.hourly_data.map(item => ({
      name: formatHour(item.hour),
      value: item.energy
    }));
    
    return {
      chartData,
      totalKwh: data.total_energy
    };
  };
  
  const processDailyData = (data: DailyResponse): { chartData: ChartDataPoint[]; totalKwh: number; categoryBreakdown?: CategoryBreakdown } => {
    const chartData = data.daily_data.map(item => ({
      name: formatDay(item.day),
      value: item.energy
    }));
    
    return {
      chartData,
      totalKwh: data.total_energy
    };
  };
  
  const processYearlyData = (data: YearlyResponse): { chartData: ChartDataPoint[]; totalKwh: number; categoryBreakdown?: CategoryBreakdown } => {
    const chartData = data.monthly_data.map(item => ({
      name: formatMonth(item.month),
      value: item.energy
    }));
    
    return {
      chartData,
      totalKwh: data.total_energy
    };
  };

  // Format functions for time display
  const formatHour = (hour: number): string => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? "AM" : "PM";
    return `${h} ${ampm}`;
  };
  
  const formatDay = (day: number): string => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days[day % 7];
  };
  
  const formatMonth = (month: number): string => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[month - 1];
  };

  // Sample data fallback
  const getSampleData = (mode: ModeType, timeframe: TimeframeType): { chartData: ChartDataPoint[]; totalKwh: number; categoryBreakdown: CategoryBreakdown } => {
    // Daily data: 24 hours (AM/PM format)
    const dayData: ChartDataPoint[] = [
      { name: "12 AM", value: 3 },
      { name: "1 AM", value: 2 },
      { name: "2 AM", value: 2 },
      // ... other hours
      { name: "11 PM", value: 2 },
    ];

    // Weekly data: 7 days
    const weekData: ChartDataPoint[] = [
      { name: "Mon", value: 15 },
      { name: "Tue", value: 18 },
      { name: "Wed", value: 25 },
      { name: "Thu", value: 22 },
      { name: "Fri", value: 30 },
      { name: "Sat", value: 28 },
      { name: "Sun", value: 20 },
    ];

    // Yearly data: 12 months
    const yearData: ChartDataPoint[] = [
      { name: "Jan", value: 10 },
      { name: "Feb", value: 12 },
      // ... other months
      { name: "Dec", value: 35 },
    ];

    const consumptionDataSets = {
      day: dayData,
      week: weekData,
      year: yearData,
    };

    const productionDataSets = {
      day: dayData.map((d) => ({ name: d.name, value: d.value * 0.8 })),
      week: weekData.map((d) => ({ name: d.name, value: d.value * 0.9 })),
      year: yearData.map((d) => ({ name: d.name, value: d.value * 0.85 })),
    };

    const consumptionBreakdown: CategoryBreakdown = {
      lighting: 60,
      appliances: 150,
      hvac: 90,
      electronics: 100
    };

    const productionBreakdown: CategoryBreakdown = {
      solar: 250
    };

    return {
      chartData: mode === "consumption" ? consumptionDataSets[timeframe] : productionDataSets[timeframe],
      totalKwh: mode === "consumption" 
        ? (timeframe === "day" ? 50 : timeframe === "week" ? 300 : 1200)
        : (timeframe === "day" ? 40 : timeframe === "week" ? 250 : 700),
      categoryBreakdown: mode === "consumption" ? consumptionBreakdown : productionBreakdown
    };
  };

  const handleModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: ModeType | null
  ): void => {
    if (newValue) {
      // If switching to consumption and timeframe is year, change to day
      if (newValue === "consumption" && state.timeframe === "year") {
        setState(prevState => ({ ...prevState, mode: newValue, timeframe: "day" }));
      } else {
        setState(prevState => ({ ...prevState, mode: newValue }));
      }
    }
  };

  const handleTimeframeChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: TimeframeType | null
  ): void => {
    if (newValue) {
      // Prevent selecting year when in consumption mode
      if (state.mode === "consumption" && newValue === "year") {
        return;
      }
      setState(prevState => ({ ...prevState, timeframe: newValue }));
    }
  };

  // Chart width based on data length
  const chartWidth = state.timeframe === "day" 
    ? state.chartData.length * 40 
    : state.chartData.length * 80;

  // Toggle button base styles
  const toggleBtnSx = {
    textTransform: "none",
    width: 36,
    height: 36,
    borderRadius: "50%",
    fontSize: "14px",
    fontWeight: "bold",
    border: "none",
    transition: "background-color 0.2s ease-in-out",
    fontFamily: "Roboto, sans-serif",
  };

  // Mode toggle (Consumption/Production)
  const modeToggleStyles = {
    backgroundColor: "#F8F8F8",
    border: "1px solid #ddd",
    p: 0.5,
    borderRadius: "9999px",
    "& .MuiToggleButton-root": {
      ...toggleBtnSx,
      borderRadius: "17px",
      textTransform: "none",
      fontFamily: "inherit",
      fontSize: "0.9rem",
      color: "#666",
      minWidth: 110,
      padding: "5px",
      margin: "0 5px",
      "&:hover": { backgroundColor: "#ECECEC" },
      "&.Mui-selected": {
        backgroundColor: "#6B97A4",
        color: "#fff",
        "&:hover": { backgroundColor: "#6B97A4" },
      },
    },
  };

  // Timeframe toggle (Day/Week/Year)
  const timeframeToggleStyles = {
    backgroundColor: "#F8F8F8",
    border: "1px solid #ddd",
    p: 0.5,
    borderRadius: "9999px",
    "& .MuiToggleButton-root": {
      ...toggleBtnSx,
      borderRadius: "17px",
      textTransform: "none",
      fontFamily: "inherit",
      fontSize: "0.9rem",
      color: "#666",
      minWidth: 50,
      padding: "5px",
      margin: "0 5px",
      "&:hover": { backgroundColor: "#ECECEC" },
      "&.Mui-selected": {
        backgroundColor: "#6B97A4",
        color: "#fff",
        "&:hover": { backgroundColor: "#6B97A4" },
      },
    },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        maxWidth: 600,
        mx: "auto",
        p: isMobile ? 2 : 3,
        pb: 10,
        backgroundColor: "#fff",
        fontFamily: "Roboto, sans-serif",
      }}
    >
      {/* Top (centered) */}
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{ mb: 1, fontFamily: "inherit" }}
        >
          Welcome!
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: "1rem", fontFamily: "inherit" }}
        >
          Check out your energy consumption or production below.
        </Typography>
      </Box>

      {/* Overview (left-aligned) */}
      <Box sx={{ textAlign: "left", mb: 4 }}>
        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{ mb: 2, fontFamily: "inherit" }}
        >
          Overview
        </Typography>

        {/* Consumption vs Production Toggle */}
        <ToggleButtonGroup
          value={state.mode}
          exclusive
          onChange={handleModeChange}
          sx={{ ...modeToggleStyles, mb: 2 }}
        >
          <ToggleButton value="consumption">Consumption</ToggleButton>
          <ToggleButton value="production">Production</ToggleButton>
        </ToggleButtonGroup>

        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{ mb: 2, fontFamily: "inherit" }}
        >
          {state.mode === "consumption"
            ? `Total Consumption: ${state.totalKwh} kWh`
            : `Total Production: ${state.totalKwh} kWh`}
        </Typography>

        {/* Timeframe Toggle (D/W/Y) */}
        <ToggleButtonGroup
          value={state.timeframe}
          exclusive
          onChange={handleTimeframeChange}
          sx={timeframeToggleStyles}
        >
          <ToggleButton value="day">D</ToggleButton>
          <ToggleButton value="week">W</ToggleButton>
          {/* Only show Year option for Production */}
          {state.mode === "production" && <ToggleButton value="year">Y</ToggleButton>}
        </ToggleButtonGroup>
      </Box>

      {/* Bar Chart Section */}
      <Box
        sx={{
          width: "100%",
          mb: 4,
          overflowX: "auto",
          scrollBehavior: "smooth",
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
        onWheel={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLDivElement).scrollLeft += e.deltaY;
        }}
      >
        {state.loading ? (
          <Typography>Loading data...</Typography>
        ) : (
          <Box
            sx={{
              width: chartWidth,
              height: 200,
              display: "flex",
              mx: chartWidth < 600 ? "auto" : 0, // center if narrower than container
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={state.chartData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                <YAxis hide />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 12,
                    fill: "#666",
                    fontFamily: "Roboto, sans-serif",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                    fontFamily: "Roboto, sans-serif",
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#5A9FA3"
                  barSize={12}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>

      {/* Bottom Tiles */}
      <Box sx={{ textAlign: "left", mb: 4 }}>
        {state.mode === "consumption" ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            {Object.entries(state.categoryBreakdown).map(([category, value]) => (
              <Box
                key={category}
                sx={{
                  p: 2,
                  backgroundColor: "#f8f8f8",
                  borderRadius: 2,
                  border: "1px solid #e0e0e0",
                  textAlign: "center",
                  fontFamily: "inherit",
                }}
              >
                <Typography variant="body2" sx={{ color: "#888", mb: 1 }}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {value} kWh
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              p: 2,
              backgroundColor: "#f8f8f8",
              borderRadius: 2,
              border: "1px solid #e0e0e0",
              textAlign: "center",
              maxWidth: 300,
              fontFamily: "inherit",
            }}
          >
            <Typography variant="body2" sx={{ color: "#888", mb: 1 }}>
              Solar Panels
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {state.categoryBreakdown.solar || 0} kWh
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DashboardPage;
// API Response Types
interface HourlyDataPoint {
  hour: number;
  energy: number;
}

interface DailyDataPoint {
  day: number;
  energy: number;
}

interface MonthlyDataPoint {
  month: number;
  energy: number;
}

interface HourlyResponse {
  hourly_data: HourlyDataPoint[];
  total_energy: number;
  category_breakdown?: {
    [key: string]: number;
  };
}

interface DailyResponse {
  daily_data: DailyDataPoint[];
  total_energy: number;
  category_breakdown?: {
    [key: string]: number;
  };
}

interface YearlyResponse {
  monthly_data: MonthlyDataPoint[];
  total_energy: number;
  category_breakdown?: {
    [key: string]: number;
  };
}
