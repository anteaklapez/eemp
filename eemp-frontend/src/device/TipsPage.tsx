import React, { useState } from "react";
import {
    Box,
    Typography,
    ToggleButtonGroup,
    ToggleButton,
    Collapse,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

// ------------------ ARC DRAWING UTILS ------------------
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const angleRad = (Math.PI / 180) * angleDeg;
    return {
        x: cx + r * Math.cos(angleRad),
        y: cy - r * Math.sin(angleRad),
    };
}

function arcPath(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    const d = [
        "M",
        start.x,
        start.y,
        "A",
        r,
        r,
        0,
        largeArcFlag,
        0,
        end.x,
        end.y,
    ].join(" ");
    return d;
}
// -------------------------------------------------------

// Weekly vs. monthly chart data
const weeklyData = [
    { name: "Mon", current: 28, recommended: 24 },
    { name: "Tue", current: 30, recommended: 25 },
    { name: "Wed", current: 32, recommended: 27 },
    { name: "Thu", current: 35, recommended: 28 },
    { name: "Fri", current: 38, recommended: 30 },
    { name: "Sat", current: 34, recommended: 29 },
    { name: "Sun", current: 31, recommended: 27 },
];

const monthlyData = [
    { name: "Week 1", current: 27, recommended: 25 },
    { name: "Week 2", current: 32, recommended: 29 },
    { name: "Week 3", current: 36, recommended: 30 },
    { name: "Week 4", current: 34, recommended: 28 },
];

// Extra details for each tile
const expandedDetails = {
    lighting: `Savings
-15 kWh/month
-$7/month
-10 kg CO₂/year`,
    appliances: `Savings
-10 kWh/month
-$5/month
-15 kg CO₂/year`,
    hvac: `Savings
~125 kWh/month
-$20/month
-50 kg CO₂/year`,
    solar: `+15% efficiency
-$12/month
-30 kg CO₂/year`,
};

type TileProps = {
    title: string;
    shortText: string;
    expandKey: string;
    children?: React.ReactNode;
};

const RecommendationsScreen: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    // Chart timeframe toggle
    const [timeframe, setTimeframe] = useState<"W" | "M">("W");

    // Independent expand/collapse for each tile
    const [expandedTiles, setExpandedTiles] = useState<Record<string, boolean>>({});

    const handleTileToggle = (key: string) => {
        setExpandedTiles((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // Chart data
    const chartData = timeframe === "W" ? weeklyData : monthlyData;

    // Dome arcs (75% of a half-circle)
    const cx = 60;
    const cy = 60;
    const r = 50;
    const backgroundArc = arcPath(cx, cy, r, 180, 0);
    const progressArc = arcPath(cx, cy, r, 180, 45);

    // A Tile component
    const Tile: React.FC<TileProps> = ({ title, shortText, expandKey, children }) => {
        const isExpanded = !!expandedTiles[expandKey];

        return (
            <Box
                onClick={() => handleTileToggle(expandKey)}
                sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: "#f8f8f8",
                    cursor: "pointer",
                    border: "1px solid #e0e0e0",
                    transition: "0.2s",
                    "&:hover": { backgroundColor: "#f2f2f2" },
                }}
            >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {title}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                    {shortText}
                </Typography>
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 1 }}>
                        <Typography
                            variant="body2"
                            sx={{ whiteSpace: "pre-line", fontSize: "0.8rem", color: "#666" }}
                        >
                            {children}
                        </Typography>
                    </Box>
                </Collapse>
            </Box>
        );
    };

    const handleTimeframeChange = (
        event: React.MouseEvent<HTMLElement>,
        newValue: "W" | "M" | null
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
                fontFamily: "Roboto, sans-serif", // If you want a specific default
            }}
        >
            {/* Header */}
            <Box sx={{ width: "100%", mb: 3 }}>
                <Typography
                    variant="h5"
                    sx={{ fontWeight: 600, fontFamily: "inherit" }}
                >
                    Recommendations
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ color: "gray", mt: 0.5, fontSize: "0.9rem", fontFamily: "inherit" }}
                >
                    Your Personalized Energy-Saving Tips
                </Typography>
            </Box>

            {/* Dome Progress (75%) */}
            <Box sx={{ mb: 3, textAlign: "center", width: "100%" }}>
                <Typography
                    variant="body1"
                    sx={{ fontWeight: 400, mb: 1, fontFamily: "inherit" }}
                >
                    You are
                </Typography>
                <Box
                    sx={{
                        position: "relative",
                        width: 120,
                        height: 120,
                        mx: "auto",
                        mb: 1,
                    }}
                >
                    <svg width="120" height="120">
                        {/* Background half-circle */}
                        <path
                            d={backgroundArc}
                            stroke="#e0e0e0"
                            strokeWidth="10"
                            fill="transparent"
                        />
                        {/* Progress half-circle (75%) */}
                        <path
                            d={progressArc}
                            stroke="#5A9FA3"
                            strokeWidth="10"
                            fill="transparent"
                        />
                    </svg>
                    {/* Centered 75% text */}
                    <Box
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            pointerEvents: "none",
                        }}
                    >
                        <Typography
                            variant="body1"
                            sx={{
                                fontWeight: "bold",
                                fontSize: "1.1rem",
                                fontFamily: "inherit",
                            }}
                        >
                            75%
                        </Typography>
                    </Box>
                </Box>
                <Typography variant="body2" sx={{ color: "#555", fontFamily: "inherit" }}>
                    closer to your target.
                </Typography>
            </Box>

            {/* Suggestions */}
            <Box sx={{ width: "100%", mb: 4 }}>
                <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, mb: 2, fontFamily: "inherit" }}
                >
                    Today’s suggestions
                </Typography>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1rem",
                        alignItems: "start", // Important to avoid sibling tile expansion
                    }}
                >
                    <Tile
                        title="Lighting"
                        shortText="Switch to LED lights for more energy-efficient lighting."
                        expandKey="lighting"
                    >
                        {expandedDetails.lighting}
                    </Tile>
                    <Tile
                        title="Appliances"
                        shortText="Upgrade to energy-efficient fridge."
                        expandKey="appliances"
                    >
                        {expandedDetails.appliances}
                    </Tile>
                    <Tile
                        title="HVAC"
                        shortText="Install a smart thermostat for better energy management."
                        expandKey="hvac"
                    >
                        {expandedDetails.hvac}
                    </Tile>
                    <Tile
                        title="Solar Panels"
                        shortText="Expand solar panel area from 40 m² to 60 m²."
                        expandKey="solar"
                    >
                        {expandedDetails.solar}
                    </Tile>
                </Box>
            </Box>

            {/* Efficiency Gains */}
            <Box sx={{ width: "100%" }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 2,
                    }}
                >
                    <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 600, fontFamily: "inherit" }}
                    >
                        Efficiency Gains
                    </Typography>

                    {/* Toggle Buttons styled like the reference design */}
                    <ToggleButtonGroup
                        color="primary"
                        value={timeframe}
                        exclusive
                        onChange={handleTimeframeChange}
                        // Make the entire group a “pill” with a subtle outer border
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            borderRadius: "9999px",
                            backgroundColor: "#F8F8F8",
                            border: "1px solid #ddd",
                            // Optional: some padding to shrink the pill height
                            p: 0.5,
                            "& .MuiToggleButton-root": {
                                borderRadius: "17px",
                                border: "none",
                                textTransform: "none",
                                fontFamily: "inherit",
                                fontSize: "0.9rem",
                                color: "#666",
                                minWidth: 40,
                                padding: "2px",
                                margin: "0px 5px",
                                lineHeight: 1.2,
                                // Control hover background on the unselected state
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
                                // Vertical divider between W and M
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
                        <ToggleButton value="W">W</ToggleButton>
                        <ToggleButton value="M">M</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* Chart */}
                <Box sx={{ width: "100%", height: 220, mb: 2 }}>
                    <ResponsiveContainer>
                        <LineChart
                            data={chartData}
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{
                                    fontFamily: "inherit",
                                    fontSize: 12,
                                    fill: "#8D8D8D",
                                }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{
                                    fontFamily: "inherit",
                                    fontSize: 12,
                                    fill: "#8D8D8D",
                                }}
                                domain={[0, 50]}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: "8px",
                                    border: "1px solid #ccc",
                                    fontFamily: "inherit",
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="current"
                                stroke="#5A9FA3"
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="recommended"
                                stroke="#999"
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>

                {/* Legend */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        justifyContent: "center",
                        mt: 1,
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Box
                            sx={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                backgroundColor: "#5A9FA3",
                            }}
                        />
                        <Typography
                            variant="body2"
                            sx={{ fontFamily: "inherit", fontSize: "0.9rem" }}
                        >
                            Current usage
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Box
                            sx={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                backgroundColor: "#999",
                            }}
                        />
                        <Typography
                            variant="body2"
                            sx={{ fontFamily: "inherit", fontSize: "0.9rem" }}
                        >
                            Recommended usage
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default RecommendationsScreen;