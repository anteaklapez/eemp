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

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}
// -------------------------------------------------------

// Dummy data for CONSUMPTION
const consumptionDataWeek = [
  { name: "Mon", current: 15, recommended: 12 },
  { name: "Tue", current: 18, recommended: 14 },
  { name: "Wed", current: 25, recommended: 20 },
  { name: "Thu", current: 22, recommended: 20 },
  { name: "Fri", current: 30, recommended: 28 },
];

const consumptionDataMonth = [
  { name: "Apr", current: 20, recommended: 18 },
  { name: "May", current: 15, recommended: 14 },
  { name: "Jun", current: 25, recommended: 22 },
  { name: "Jul", current: 35, recommended: 32 },
  { name: "Aug", current: 40, recommended: 38 },
  { name: "Sep", current: 30, recommended: 28 },
  { name: "Oct", current: 45, recommended: 42 },
];

const consumptionDataYear = [
  { name: "Jan", current: 10, recommended: 9 },
  { name: "Feb", current: 12, recommended: 11 },
  { name: "Mar", current: 20, recommended: 18 },
  { name: "Apr", current: 15, recommended: 14 },
  { name: "May", current: 25, recommended: 23 },
  { name: "Jun", current: 30, recommended: 28 },
  { name: "Jul", current: 36, recommended: 34 },
  { name: "Aug", current: 40, recommended: 38 },
  { name: "Sep", current: 25, recommended: 23 },
  { name: "Oct", current: 42, recommended: 40 },
  { name: "Nov", current: 28, recommended: 26 },
  { name: "Dec", current: 35, recommended: 33 },
];

const consumptionDataSets = {
  week: consumptionDataWeek,
  month: consumptionDataMonth,
  year: consumptionDataYear,
};

// Dummy data for PRODUCTION
const productionDataWeek = [
  { name: "Mon", current: 10, recommended: 8 },
  { name: "Tue", current: 12, recommended: 10 },
  { name: "Wed", current: 18, recommended: 16 },
  { name: "Thu", current: 40, recommended: 35 },
  { name: "Fri", current: 25, recommended: 22 },
  { name: "Sat", current: 22, recommended: 20 },
  { name: "Sun", current: 15, recommended: 13 },
];

const productionDataMonth = [
  { name: "Apr", current: 10, recommended: 9 },
  { name: "May", current: 12, recommended: 11 },
  { name: "Jun", current: 18, recommended: 16 },
  { name: "Jul", current: 40, recommended: 38 },
  { name: "Aug", current: 50, recommended: 47 },
  { name: "Sep", current: 20, recommended: 18 },
  { name: "Oct", current: 55, recommended: 50 },
];

const productionDataYear = [
  { name: "Jan", current: 5, recommended: 4 },
  { name: "Feb", current: 10, recommended: 9 },
  { name: "Mar", current: 12, recommended: 11 },
  { name: "Apr", current: 18, recommended: 16 },
  { name: "May", current: 22, recommended: 20 },
  { name: "Jun", current: 28, recommended: 26 },
  { name: "Jul", current: 35, recommended: 33 },
  { name: "Aug", current: 50, recommended: 47 },
  { name: "Sep", current: 20, recommended: 18 },
  { name: "Oct", current: 55, recommended: 52 },
  { name: "Nov", current: 15, recommended: 14 },
  { name: "Dec", current: 25, recommended: 23 },
];

const productionDataSets = {
  week: productionDataWeek,
  month: productionDataMonth,
  year: productionDataYear,
};

// Extra details for each tile (dummy text)
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

const Tile: React.FC<TileProps> = ({ title, shortText, expandKey, children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const handleToggle = () => setIsExpanded(!isExpanded);
  return (
    <Box
      onClick={handleToggle}
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
          <Typography variant="body2" sx={{ whiteSpace: "pre-line", fontSize: "0.8rem", color: "#666" }}>
            {children}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
};

const RecommendationsScreen: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Default to "week" timeframe
  const [mode, setMode] = useState<"consumption" | "production">("consumption");
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("week");

  // Get the data for the chart based on the selected mode and timeframe
  const currentData =
    mode === "consumption"
      ? consumptionDataSets[timeframe]
      : productionDataSets[timeframe];

  // Dummy total kWh value (example)
  const totalKwh =
    mode === "consumption"
      ? timeframe === "week"
        ? 150
        : timeframe === "month"
        ? 400
        : 1200
      : timeframe === "week"
      ? 100
      : timeframe === "month"
      ? 250
      : 700;

  // Mode toggle handler
  const handleModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: "consumption" | "production" | null
  ) => {
    if (newValue) {
      setMode(newValue);
    }
  };

  // Timeframe toggle handler
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
        maxWidth: 600,
        mx: "auto",
        p: isMobile ? 2 : 3,
        backgroundColor: "#fff",
        fontFamily: "Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <Box sx={{ width: "100%", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Recommendations
        </Typography>
        <Typography variant="body2" sx={{ color: "gray", mt: 0.5, fontSize: "0.9rem" }}>
          Your Personalized Energy-Saving Tips
        </Typography>
      </Box>

      {/* Dome Progress (dummy info) */}
      <Box sx={{ mb: 3, textAlign: "center", width: "100%" }}>
        <Typography variant="body1" sx={{ fontWeight: 400, mb: 1 }}>
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
            <path
              d={arcPath(60, 60, 50, 180, 0)}
              stroke="#e0e0e0"
              strokeWidth="10"
              fill="transparent"
            />
            <path
              d={arcPath(60, 60, 50, 180, 45)}
              stroke="#5A9FA3"
              strokeWidth="10"
              fill="transparent"
            />
          </svg>
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
            <Typography variant="body1" sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
              75%
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" sx={{ color: "#555" }}>
          closer to your target.
        </Typography>
      </Box>

      {/* Suggestions */}
      <Box sx={{ width: "100%", mb: 4 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Today’s suggestions
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            alignItems: "start",
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
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Efficiency Gains
          </Typography>
          <ToggleButtonGroup
            color="primary"
            value={timeframe}
            exclusive
            onChange={handleTimeframeChange}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: "9999px",
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
                minWidth: 40,
                padding: "2px",
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
            <ToggleButton value="week">W</ToggleButton>
            <ToggleButton value="month">M</ToggleButton>
            <ToggleButton value="year">Y</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ width: "100%", height: 220, mb: 2 }}>
          <ResponsiveContainer>
            <LineChart data={currentData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontFamily: "inherit", fontSize: 12, fill: "#8D8D8D" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontFamily: "inherit", fontSize: 12, fill: "#8D8D8D" }}
                domain={[0, 50]}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  fontFamily: "inherit",
                }}
              />
              <Line type="monotone" dataKey="current" stroke="#5A9FA3" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="recommended" stroke="#999" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        {/* Legend */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "center", mt: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#5A9FA3" }} />
            <Typography variant="body2" sx={{ fontFamily: "inherit", fontSize: "0.9rem" }}>
              Current usage
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#999" }} />
            <Typography variant="body2" sx={{ fontFamily: "inherit", fontSize: "0.9rem" }}>
              Recommended usage
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RecommendationsScreen;
