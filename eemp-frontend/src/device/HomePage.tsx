import React, { useState } from "react";
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Button,
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

// ---------------- DATA DEFINITIONS ----------------

// Daily data: 24 hours (AM/PM format)
const dayData = [
  { name: "12 AM", value: 3 },
  { name: "1 AM", value: 2 },
  { name: "2 AM", value: 2 },
  { name: "3 AM", value: 1 },
  { name: "4 AM", value: 1 },
  { name: "5 AM", value: 1 },
  { name: "6 AM", value: 2 },
  { name: "7 AM", value: 3 },
  { name: "8 AM", value: 4 },
  { name: "9 AM", value: 6 },
  { name: "10 AM", value: 8 },
  { name: "11 AM", value: 7 },
  { name: "12 PM", value: 9 },
  { name: "1 PM", value: 6 },
  { name: "2 PM", value: 5 },
  { name: "3 PM", value: 6 },
  { name: "4 PM", value: 8 },
  { name: "5 PM", value: 7 },
  { name: "6 PM", value: 5 },
  { name: "7 PM", value: 5 },
  { name: "8 PM", value: 4 },
  { name: "9 PM", value: 3 },
  { name: "10 PM", value: 3 },
  { name: "11 PM", value: 2 },
];

// Weekly data: 7 days
const weekData = [
  { name: "Mon", value: 15 },
  { name: "Tue", value: 18 },
  { name: "Wed", value: 25 },
  { name: "Thu", value: 22 },
  { name: "Fri", value: 30 },
  { name: "Sat", value: 28 },
  { name: "Sun", value: 20 },
];

// Yearly data: 12 months
const yearData = [
  { name: "Jan", value: 10 },
  { name: "Feb", value: 12 },
  { name: "Mar", value: 20 },
  { name: "Apr", value: 15 },
  { name: "May", value: 25 },
  { name: "Jun", value: 30 },
  { name: "Jul", value: 36 },
  { name: "Aug", value: 40 },
  { name: "Sep", value: 25 },
  { name: "Oct", value: 42 },
  { name: "Nov", value: 28 },
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

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Mode toggle: consumption or production
  const [mode, setMode] = useState<"consumption" | "production">("consumption");
  // Timeframe toggle: day, week, or year
  const [timeframe, setTimeframe] = useState<"day" | "week" | "year">("day");

  // Determine which dataset to show
  const currentData =
    mode === "consumption"
      ? consumptionDataSets[timeframe]
      : productionDataSets[timeframe];

  // Example total kWh
  const totalKwh =
    mode === "consumption"
      ? timeframe === "day"
        ? 50
        : timeframe === "week"
        ? 300
        : 1200
      : timeframe === "day"
      ? 40
      : timeframe === "week"
      ? 250
      : 700;

  const handleModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: "consumption" | "production" | null
  ) => {
    if (newValue) setMode(newValue);
  };

  const handleTimeframeChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: "day" | "week" | "year" | null
  ) => {
    if (newValue) setTimeframe(newValue);
  };

  // Chart width based on data length
  const chartWidth =
    timeframe === "day"
      ? currentData.length * 40 // 24 bars -> 960px
      : currentData.length * 80; // e.g. 7 bars -> 560px, 12 bars -> 960px

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
          value={mode}
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
          {mode === "consumption"
            ? `Total Consumption: ${totalKwh} kWh`
            : `Total Production: ${totalKwh} kWh`}
        </Typography>

        {/* Timeframe Toggle (D/W/Y) */}
        <ToggleButtonGroup
          value={timeframe}
          exclusive
          onChange={handleTimeframeChange}
          sx={timeframeToggleStyles}
        >
          <ToggleButton value="day">D</ToggleButton>
          <ToggleButton value="week">W</ToggleButton>
          <ToggleButton value="year">Y</ToggleButton>
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
        <Box
          sx={{
            width: chartWidth,
            height: 200,
            display: "flex",
            mx: chartWidth < 600 ? "auto" : 0, // center if narrower than container
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
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
      </Box>

      {/* Bottom Tiles */}
      <Box sx={{ textAlign: "left", mb: 4 }}>
        {mode === "consumption" ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <Box
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
                Lighting
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                60 kWh
              </Typography>
            </Box>
            <Box
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
                Appliances
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                150 kWh
              </Typography>
            </Box>
            <Box
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
                HVAC
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                90 kWh
              </Typography>
            </Box>
            <Box
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
                Electronics
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                100 kWh
              </Typography>
            </Box>
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
              250 kWh
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DashboardPage;
