import React, { useState, useEffect } from "react";
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
  ResponsiveContainer,
  Legend as RechartsLegend,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import dayjs from "dayjs";

// ---------- SUGGESTIONS DATA ----------
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
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
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

const RecommendationsScreen: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("week");

  // ---------- LINE CHART DATA ----------
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
  const currentLineData = consumptionDataSets[timeframe];

  // ---------- LOAD DEVICES & COMPUTE DAILY CONSUMPTION PER ROOM ----------
  const [roomsConsumption, setRoomsConsumption] = useState<
    { name: string; consumption: number }[]
  >([]);

  useEffect(() => {
    const storedDevicesStr = localStorage.getItem("devices") || "[]";
    let storedDevices: any[] = [];
    try {
      storedDevices = JSON.parse(storedDevicesStr);
    } catch (error) {
      console.error("Error parsing devices:", error);
    }

    // Exclude solar devices
    const filteredDevices = storedDevices.filter((dev) => {
      const cat = dev.category || dev.deviceCategory;
      return cat !== "Solar Panel";
    });

    // Compute consumption for each device (multiplying by quantity)
    const consumptionPerDevice = filteredDevices.map((dev) => {
      if (!dev.room || (!dev.room.roomName && typeof dev.room !== "string")) {
        return null;
      }
      const powerKW =
        dev.powerRating && dev.powerRating.value
          ? Number(dev.powerRating.value) / (dev.powerRating.unit === "W" ? 1000 : 1)
          : 0;
      const standbyKW =
        dev.standbyPower && dev.standbyPower.value
          ? Number(dev.standbyPower.value) / (dev.standbyPower.unit === "W" ? 1000 : 1)
          : 0;

      let avgActiveHours = 1;
      if (
        dev.usagePattern &&
        Array.isArray(dev.usagePattern.usage_times) &&
        dev.usagePattern.usage_times.length > 0
      ) {
        const hoursArr = dev.usagePattern.usage_times.map((ut: any) => {
          const start = dayjs(ut.start);
          const end = dayjs(ut.end);
          if (!start.isValid() || !end.isValid()) return 0;
          let h = end.diff(start, "hour", true);
          if (h < 0) h += 24;
          return Math.max(0, Math.min(24, h));
        });
        avgActiveHours = hoursArr.reduce((a: number, b: number) => a + b, 0) / hoursArr.length;
      }
      const activeConsumption = powerKW * avgActiveHours;
      const standbyConsumption = standbyKW * (24 - avgActiveHours);
      const totalDaily = activeConsumption + standbyConsumption;
      const quantity = Number(dev.quantity) || 1;
      return { room: dev.room, consumption: totalDaily * quantity };
    });

    const roomMap = new Map<string, number>();
    consumptionPerDevice.forEach((item) => {
      if (item && item.room) {
        let roomName = "";
        let roomType = "";
        if (typeof item.room === "object") {
          roomName = item.room.roomName || "";
          roomType = item.room.roomType || "";
        } else {
          roomName = item.room;
        }
        const key = `${roomName}||${roomType}`;
        const prev = roomMap.get(key) || 0;
        roomMap.set(key, prev + item.consumption);
      }
    });
    const consumptionArray = Array.from(roomMap.entries()).map(([key, consumption]) => {
      const [roomName, roomType] = key.split("||");
      const displayName = roomType ? `${roomName} (${roomType})` : roomName;
      return { name: displayName, consumption };
    });
    setRoomsConsumption(consumptionArray);
  }, []);

  // Colors for the pie chart
  const pieColors = ["#5A9FA3", "#FF8A65", "#4DB6AC", "#BA68C8", "#FFD54F", "#90A4AE"];

  // ---------- TIMEFRAME TOGGLE HANDLER ----------
  const handleTimeframeChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: "week" | "month" | "year" | null
  ) => {
    if (newValue) {
      setTimeframe(newValue);
    }
  };

  // Toggle button style
  const toggleBtnSx = {
    textTransform: "none",
    width: 36,
    height: 36,
    borderRadius: "50%",
    fontSize: "14px",
    fontWeight: "bold",
    border: "none",
    transition: "background-color 0.2s ease-in-out",
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        maxWidth: 600,
        mx: "auto",
        p: isMobile ? 2 : 3,
        pb: 10, // <-- Increased bottom padding so the navigation won't overlap
        backgroundColor: "#fff",
      }}
    >
      {/* Header */}
      <Box sx={{ width: "100%", mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
          Recommendations
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          Your Personalized Energy-Saving Tips
        </Typography>
      </Box>

      {/* Pie Chart for Energy Consumption by Room */}
      <Box
        sx={{
          mb: 3,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 400, mb: 1 }}>
          Energy Consumption by Room
        </Typography>
        {roomsConsumption.length > 0 ? (
          <PieChart width={320} height={320}>
            <Pie
              data={roomsConsumption}
              dataKey="consumption"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {roomsConsumption.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
            <RechartsTooltip formatter={(value: number) => `${value.toFixed(2)} kWh`} />
            <RechartsLegend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              wrapperStyle={{ fontSize: "0.8rem", marginTop: "10px" }}
            />
          </PieChart>
        ) : (
          <Typography variant="body2">
            No room consumption data available.
          </Typography>
        )}
      </Box>

      {/* Suggestions */}
      <Box sx={{ width: "100%", mb: 4 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          Today’s Suggestions
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
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

      {/* Efficiency Gains - Line Chart Section */}
      <Box sx={{ width: "100%" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Efficiency Gains
          </Typography>
          <ToggleButtonGroup
            value={timeframe}
            exclusive
            onChange={handleTimeframeChange}
            sx={{
              backgroundColor: "#F8F8F8",
              border: "1px solid #ddd",
              p: 0.5,
              borderRadius: "9999px",
            }}
          >
            <ToggleButton
              value="week"
              disableRipple
              sx={{
                ...toggleBtnSx,
                backgroundColor:
                  timeframe === "week" ? "#6B97A4 !important" : "#F5F5F5 !important",
                color: timeframe === "week" ? "#fff" : "#000",
                "&:hover": {
                  backgroundColor:
                    timeframe === "week" ? "#6B97A4 !important" : "#F5F5F5 !important",
                },
              }}
            >
              W
            </ToggleButton>
            <ToggleButton
              value="month"
              disableRipple
              sx={{
                ...toggleBtnSx,
                backgroundColor:
                  timeframe === "month" ? "#6B97A4 !important" : "#F5F5F5 !important",
                color: timeframe === "month" ? "#fff" : "#000",
                "&:hover": {
                  backgroundColor:
                    timeframe === "month" ? "#6B97A4 !important" : "#F5F5F5 !important",
                },
              }}
            >
              M
            </ToggleButton>
            <ToggleButton
              value="year"
              disableRipple
              sx={{
                ...toggleBtnSx,
                backgroundColor:
                  timeframe === "year" ? "#6B97A4 !important" : "#F5F5F5 !important",
                color: timeframe === "year" ? "#fff" : "#000",
                "&:hover": {
                  backgroundColor:
                    timeframe === "year" ? "#6B97A4 !important" : "#F5F5F5 !important",
                },
              }}
            >
              Y
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ width: "100%", height: 220, mb: 2 }}>
          <ResponsiveContainer>
            <LineChart
              data={currentLineData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
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
              <RechartsTooltip
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
