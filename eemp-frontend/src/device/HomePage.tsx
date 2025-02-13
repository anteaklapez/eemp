import React, { useState } from "react";
import {
    Box,
    Typography,
    Button,
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
    ResponsiveContainer
} from "recharts";

// WEEK / MONTH / YEAR data for CONSUMPTION
const consumptionDataWeek = [
    { name: "Mon", value: 15 },
    { name: "Tue", value: 18 },
    { name: "Wed", value: 25 },
    { name: "Thu", value: 22 },
    { name: "Fri", value: 30 },
];

const consumptionDataMonth = [
    { name: "Apr", value: 20 },
    { name: "May", value: 15 },
    { name: "Jun", value: 25 },
    { name: "Jul", value: 35 },
    { name: "Aug", value: 40 },
    { name: "Sep", value: 30 },
    { name: "Oct", value: 45 },
];

const consumptionDataYear = [
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
    week: consumptionDataWeek,
    month: consumptionDataMonth,
    year: consumptionDataYear,
};

// WEEK / MONTH / YEAR data for PRODUCTION
const productionDataWeek = [
    { name: "Mon", value: 10 },
    { name: "Tue", value: 12 },
    { name: "Wed", value: 18 },
    { name: "Thu", value: 40 },
    { name: "Fri", value: 25 },
    { name: "Sat", value: 22 },
    { name: "Sun", value: 15 },
];

const productionDataMonth = [
    { name: "Apr", value: 10 },
    { name: "May", value: 12 },
    { name: "Jun", value: 18 },
    { name: "Jul", value: 40 },
    { name: "Aug", value: 50 },
    { name: "Sep", value: 20 },
    { name: "Oct", value: 55 },
];

const productionDataYear = [
    { name: "Jan", value: 5 },
    { name: "Feb", value: 10 },
    { name: "Mar", value: 12 },
    { name: "Apr", value: 18 },
    { name: "May", value: 22 },
    { name: "Jun", value: 28 },
    { name: "Jul", value: 35 },
    { name: "Aug", value: 50 },
    { name: "Sep", value: 20 },
    { name: "Oct", value: 55 },
    { name: "Nov", value: 15 },
    { name: "Dec", value: 25 },
];

const productionDataSets = {
    week: productionDataWeek,
    month: productionDataMonth,
    year: productionDataYear,
};

const DashboardPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    // Toggles between “consumption” or “production”
    const [mode, setMode] = useState<"consumption" | "production">("consumption");
    // Toggles between “week” | “month” | “year”
    const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("month");

    // Data for the bar chart based on current mode + timeframe
    const currentData =
        mode === "consumption"
            ? consumptionDataSets[timeframe]
            : productionDataSets[timeframe];

    // For the displayed total
    const totalKwh =
        mode === "consumption"
            ? timeframe === "week"
                ? 150
                : timeframe === "month"
                    ? 400
                    : 1200 // example
            : timeframe === "week"
                ? 100
                : timeframe === "month"
                    ? 250
                    : 700; // example

    // Switch consumption <-> production
    const handleModeChange = (
        event: React.MouseEvent<HTMLElement>,
        newValue: "consumption" | "production" | null
    ) => {
        if (newValue) {
            setMode(newValue);
        }
    };

    // Switch chart timeframe
    const handleTimeframeChange = (
        event: React.MouseEvent<HTMLElement>,
        newValue: "week" | "month" | "year" | null
    ) => {
        if (newValue) {
            setTimeframe(newValue);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                px: isMobile ? 2 : 4,
                py: isMobile ? 2 : 4,
                backgroundColor: "#fff",
                fontFamily: "Roboto, sans-serif",
            }}
        >
            {/* Welcome / Intro Section */}
            <Box sx={{ textAlign: "center", mb: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    Welcome!
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 400 }}>
                    You’ve Saved <Box component="span" sx={{ fontWeight: 700 }}>10% More</Box> Energy This Month!{" "}
                    <span role="img" aria-label="celebration">🎉</span>
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ color: "gray", mt: 1, fontSize: "0.95rem" }}
                >
                    You’re making a positive impact! Keep going to save even more.
                </Typography>

                <Box sx={{ mt: 3 }}>
                    <Button
                        variant="contained"
                        sx={{
                            backgroundColor: "#5A9FA3",
                            color: "#fff",
                            textTransform: "none",
                            fontSize: "1rem",
                            fontWeight: 500,
                            borderRadius: 2,
                            px: 4,
                            py: 1.2,
                            "&:hover": {
                                backgroundColor: "#4a868a",
                            },
                        }}
                    >
                        Save more
                    </Button>
                </Box>
            </Box>

            {/* Overview Section */}
            <Box sx={{ width: "100%", mb: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Overview
                </Typography>

                {/* Consumption vs Production Toggle */}
                <ToggleButtonGroup
                    color="primary"
                    value={mode}
                    exclusive
                    onChange={handleModeChange}
                    sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: "17px",
                        backgroundColor: "#F8F8F8",
                        border: "1px solid #ddd",
                        p: 0.5,
                        "& .MuiToggleButton-root": {
                            borderRadius: "17px",
                            border: "none",
                            textTransform: "none",
                            fontFamily: "inherit",
                            fontSize: "0.9rem",
                            color: "#666",
                            minWidth: 110,
                            padding: "5px",
                            margin: "0px 5px",
                            lineHeight: 1.2,
                            "&:hover": {
                                backgroundColor: "#ECECEC",
                            },
                            "&.Mui-selected": {
                                backgroundColor: "#5A9FA3",
                                color: "#fff",
                                "&:hover": {
                                    backgroundColor: "#4a868a",
                                },
                            },
                            "&:not(:last-of-type)": {
                                position: "relative",
                            },
                            "&:not(:last-of-type)::after": {
                                content: '""',
                                position: "absolute",
                                top: "20%",
                                right: -5,
                                height: "60%",
                                width: "1px",
                                marginLeft: "5px",
                                backgroundColor: "#ccc",
                            },
                        },
                    }}
                >
                    <ToggleButton value="consumption">Consumption</ToggleButton>
                    <ToggleButton value="production">Production</ToggleButton>
                </ToggleButtonGroup>

                <Typography variant="h6" sx={{ fontWeight: 600, mt: 2, mb: 2 }}>
                    {mode === "consumption"
                        ? `Total Consumption: ${totalKwh} kWh`
                        : `Total Production: ${totalKwh} kWh`}
                </Typography>

                {/* Timeframe Toggle (Week | Month | Year) */}
                <ToggleButtonGroup
                    value={timeframe}
                    exclusive
                    onChange={handleTimeframeChange}
                    sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: "17px",
                        backgroundColor: "#F8F8F8",
                        border: "1px solid #ddd",
                        p: 0.5,
                        "& .MuiToggleButton-root": {
                            borderRadius: "17px",
                            border: "none",
                            textTransform: "none",
                            fontFamily: "inherit",
                            fontSize: "0.9rem",
                            color: "#666",
                            minWidth: 50,
                            padding: "5px",
                            margin: "0px 5px",
                            lineHeight: 1.2,
                            "&:hover": {
                                backgroundColor: "#ECECEC",
                            },
                            "&.Mui-selected": {
                                backgroundColor: "#5A9FA3",
                                color: "#fff",
                                "&:hover": {
                                    backgroundColor: "#4a868a",
                                },
                            },
                            "&:not(:last-of-type)": {
                                position: "relative",
                            },
                            "&:not(:last-of-type)::after": {
                                content: '""',
                                position: "absolute",
                                top: "20%",
                                right: -5,
                                height: "60%",
                                width: "1px",
                                marginLeft: "5px",
                                backgroundColor: "#ccc",
                            },
                        },
                    }}
                >
                    <ToggleButton value="week">Week</ToggleButton>
                    <ToggleButton value="month">Month</ToggleButton>
                    <ToggleButton value="year">Year</ToggleButton>
                </ToggleButtonGroup>

                {/* Bar Chart without Grid / Y Axis */}
                <Box sx={{ width: "100%", height: 200, mt: 2 }}>
                    <ResponsiveContainer>
                        <BarChart data={currentData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                            {/* Remove Y-axis line/labels: hide={true} */}
                            <YAxis hide />
                            {/* X-axis just for labels */}
                            <XAxis
                                dataKey="name"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12, fill: "#666", fontFamily: "inherit" }}
                            />
                            {/* No grid lines */}
                            {/* <CartesianGrid /> <-- removed */}
                            <Tooltip
                                contentStyle={{
                                    borderRadius: "8px",
                                    border: "1px solid #ccc",
                                    fontFamily: "inherit",
                                }}
                            />
                            {/* Thinner bars */}
                            <Bar dataKey="value" fill="#5A9FA3" barSize={12} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            </Box>

            {/* Bottom Rectangles / Tiles */}
            <Box sx={{ width: "100%" }}>
                {mode === "consumption" ? (
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "1rem",
                            alignItems: "start",
                        }}
                    >
                        {/* 4 tiles */}
                        <Box
                            sx={{
                                p: 2,
                                backgroundColor: "#f8f8f8",
                                borderRadius: 2,
                                border: "1px solid #e0e0e0",
                                textAlign: "center",
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
                            mb: 2,
                            maxWidth: 300,
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