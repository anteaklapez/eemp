import React, { useState } from "react";
import { Box, Typography, Paper, Tabs, Tab, Grid, ToggleButtonGroup, ToggleButton } from "@mui/material";

const LandingPage: React.FC = () => {
  const [tab, setTab] = useState(0); // 0 = Consumption, 1 = Production
  const [timeframe, setTimeframe] = useState("month"); // Default to "Month"

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  const handleTimeframeChange = (event: React.MouseEvent<HTMLElement>, newTimeframe: string) => {
    if (newTimeframe !== null) {
      setTimeframe(newTimeframe);
    }
  };

  // Dummy Data for Energy Consumption
  const energyData = {
    consumption: { total: 400, breakdown: { lighting: 60, appliances: 150, HVAC: 90, electronics: 100 } },
    production: { total: 500, breakdown: { solar: 300, wind: 120, other: 80 } },

    week: [
      { name: "Mon", value: 30 },
      { name: "Tue", value: 40 },
      { name: "Wed", value: 20 },
      { name: "Thu", value: 50 },
      { name: "Fri", value: 35 },
      { name: "Sat", value: 45 },
      { name: "Sun", value: 55 },
    ],

    month: [
      { name: "Apr", value: 40 },
      { name: "May", value: 25 },
      { name: "Jun", value: 50 },
      { name: "Jul", value: 65 },
      { name: "Aug", value: 55 },
      { name: "Sep", value: 45 },
      { name: "Oct", value: 70 },
    ],

    year: [
      { name: "2019", value: 200 },
      { name: "2020", value: 250 },
      { name: "2021", value: 180 },
      { name: "2022", value: 300 },
      { name: "2023", value: 270 },
      { name: "2024", value: 310 },
      { name: "2025", value: 280 },
    ],
  };

  // Choose which dataset to use
  const selectedData = timeframe === "week" ? energyData.week : timeframe === "month" ? energyData.month : energyData.year;

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "black",
        paddingTop: "5vh",
        overflowY: "auto",
        paddingBottom: "80px", // 👈 Adds space for the navigation bar
      }}
    >
      {/* Overview Section */}
      <Paper
        sx={{
          mt: 3,
          p: 2,
          width: "90%",
          maxWidth: 400,
          backgroundColor: "#f5f5f5",
          borderRadius: "10px",
          overflow: "visible",
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Overview
        </Typography>

        {/* Consumption and Production Tabs */}
        <Tabs value={tab} onChange={handleTabChange} centered>
          <Tab label="Consumption" />
          <Tab label="Production" />
        </Tabs>

        {/* Total Consumption or Production */}
        <Typography variant="h6" sx={{ textAlign: "center", mt: 2 }}>
          {tab === 0
            ? `Total Consumption: ${energyData.consumption.total} kWh`
            : `Total Production: ${energyData.production.total} kWh`}
        </Typography>

        {/* Timeframe Toggle (Week/Month/Year) */}
        <ToggleButtonGroup
          value={timeframe}
          exclusive
          onChange={handleTimeframeChange}
          sx={{ 
            display: "flex", 
            justifyContent: "center", 
            mt: 2, 
            mb: 3, // Extra spacing to avoid overlap
          }}
        >
          <ToggleButton value="week" sx={{ textTransform: "none", fontSize: "0.8rem" }}>
            Week
          </ToggleButton>
          <ToggleButton value="month" sx={{ textTransform: "none", fontSize: "0.8rem" }}>
            Month
          </ToggleButton>
          <ToggleButton value="year" sx={{ textTransform: "none", fontSize: "0.8rem" }}>
            Year
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Dynamic Bar Chart for Week/Month/Year */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mt: 2,
            px: 2,
            alignItems: "flex-end",
            height: "120px",
          }}
        >
          {selectedData.map((item) => (
            <Box key={item.name} sx={{ textAlign: "center" }}>
              <Box
                sx={{
                  width: "10px",
                  height: `${item.value / 2}px`,
                  background: "linear-gradient(to top, #6B97A4, #6B97A4)",
                  borderRadius: "5px",
                  margin: "0 auto",
                }}
              />
              <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                {item.name}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Breakdown Grid */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {Object.entries(tab === 0 ? energyData.consumption.breakdown : energyData.production.breakdown).map(([key, value]) => (
            <Grid item xs={6} key={key}>
              <Paper sx={{ p: 1.5, textAlign: "center", backgroundColor: "#EAEAEA", borderRadius: "10px" }}>
                <Typography variant="body1">{key.charAt(0).toUpperCase() + key.slice(1)}</Typography>
                <Typography variant="h6">{value} kWh</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default LandingPage;
