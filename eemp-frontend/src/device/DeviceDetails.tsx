import React, { useState } from "react";
import { Line } from "react-chartjs-2";
import { ChartData } from "chart.js"; // For typed chart data
import { Box, Typography, ToggleButton, Button } from "@mui/material";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend
);

// FactorBox Component
const FactorBox = ({
  icon,
  title,
  value,
  description,
}: {
  icon: string;
  title: string;
  value: string;
  description: string;
}) => (
  <Box
    sx={{
      backgroundColor: "#F5F5F5",
      padding: { xs: 1.5, sm: 2 },
      borderRadius: "12px",
      display: "flex",
      flexDirection: "column",
      gap: 1,
      width: "100%",
      boxSizing: "border-box",
    }}
  >
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography fontWeight="bold" sx={{ fontSize: { xs: "14px", sm: "16px" } }}>
        {icon} <span style={{ color: "#5A8DEE" }}>{title}</span>
      </Typography>
      <Typography fontWeight="bold" sx={{ fontSize: { xs: "14px", sm: "16px" } }}>
        {value}
      </Typography>
    </Box>
    <Typography variant="body2" sx={{ color: "gray", fontSize: { xs: "12px", sm: "14px" } }}>
      {description}
    </Typography>
  </Box>
);

const DeviceDetails: React.FC = () => {
  const [view, setView] = useState<"week" | "month">("week");
  const navigate = useNavigate();
  const location = useLocation();
  // Retrieve the device from navigation state
  const { device } = (location.state as { device?: any }) || {};

  // Convert stored peak hours strings back to dayjs objects and format them
  const peakHoursStartFormatted = device?.peakHoursStart
    ? dayjs(device.peakHoursStart).format("h:mm A")
    : "";
  const peakHoursEndFormatted = device?.peakHoursEnd
    ? dayjs(device.peakHoursEnd).format("h:mm A")
    : "";

  // State to control the remove-dialog
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);

  // Compute daily energy consumption based on device data.
  // Assumes device.powerConsumption and device.duration are strings representing numbers,
  // and device.unit is either "W" or "kW".
  let dailyConsumption = 0;
  if (device) {
    const power = parseFloat(device.powerConsumption || "0");
    const duration = parseFloat(device.duration || "0");
    if (device.unit === "W") {
      dailyConsumption = (power * duration) / 1000;
    } else {
      dailyConsumption = power * duration;
    }
  }

  // Weekly chart: working days (Mon–Fri)
  const computedWeeklyData: ChartData<"line"> = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    datasets: [
      {
        label: "Energy Consumption (kWh)",
        data: Array(5).fill(dailyConsumption),
        borderColor: "#5A8DEE",
        backgroundColor: "rgba(90, 141, 238, 0.2)",
        tension: 0.4,
        pointRadius: 5,
      },
    ],
  };

  // Monthly chart: 12 months (each month = 20 working days)
  const computedMonthlyData: ChartData<"line"> = {
    labels: Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`),
    datasets: [
      {
        label: "Energy Consumption (kWh)",
        data: Array(12).fill(dailyConsumption * 20),
        borderColor: "#5A8DEE",
        backgroundColor: "rgba(90, 141, 238, 0.2)",
        tension: 0.4,
        pointRadius: 5,
      },
    ],
  };

  // Last updated: if device.lastUpdated exists, use it; otherwise, use current time.
  const lastUpdatedDate = device && device.lastUpdated ? new Date(device.lastUpdated) : new Date();
  const lastUpdatedString = lastUpdatedDate.toLocaleString();

  // Handlers for the remove dialog
  const handleOpenRemoveDialog = () => setOpenRemoveDialog(true);
  const handleCloseRemoveDialog = () => setOpenRemoveDialog(false);

  const handleConfirmRemove = () => {
    // Retrieve stored devices
    const storedDevices = JSON.parse(localStorage.getItem("devices") || "[]");
    // Remove the current device using its unique id
    const updatedDevices = storedDevices.filter((d: any) => d.id !== device.id);
    localStorage.setItem("devices", JSON.stringify(updatedDevices));
    setOpenRemoveDialog(false);
    // Navigate back to the Device Management screen
    navigate("/management");
  };

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        overflowY: "auto",
        overflowX: "hidden",
        p: { xs: 2, sm: 4 },
        boxSizing: "border-box",
      }}
    >
      {/* Main Card Container */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 600,
          backgroundColor: "#fff",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 3,
          p: { xs: 3, sm: 4 },
          mb: 4,
          boxSizing: "border-box",
        }}
      >
        {/* Back Navigation with Device Name */}
        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontSize: { xs: "16px", sm: "18px" },
          }}
        >
          {device ? device.name : "Bulb"}
        </Typography>

        {/* Last Updated */}
        <Typography variant="subtitle2" sx={{ color: "gray", fontSize: { xs: "12px", sm: "14px" } }}>
          Last updated: {lastUpdatedString}
        </Typography>

        {/* Section Title */}
        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: "18px", sm: "20px" } }}>
          Energy Consumption
        </Typography>

        {/* Toggle Buttons */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <ToggleButton
            value="week"
            selected={view === "week"}
            onClick={() => setView("week")}
            sx={{
              textTransform: "none",
              width: { xs: 36, sm: 40 },
              height: { xs: 36, sm: 40 },
              borderRadius: "50%",
              fontSize: { xs: "14px", sm: "16px" },
              fontWeight: "bold",
              backgroundColor: view === "week" ? "#6B97A4" : "#F5F5F5",
              color: view === "week" ? "#fff" : "#000",
              border: "none",
              transition: "background-color 0.2s ease-in-out",
              "&.Mui-selected": { backgroundColor: "#6B97A4 !important", color: "#fff" },
              "&:hover": { backgroundColor: "#6B97A4", color: "#fff" },
            }}
          >
            W
          </ToggleButton>

          <ToggleButton
            value="month"
            selected={view === "month"}
            onClick={() => setView("month")}
            sx={{
              textTransform: "none",
              width: { xs: 36, sm: 40 },
              height: { xs: 36, sm: 40 },
              borderRadius: "50%",
              fontSize: { xs: "14px", sm: "16px" },
              fontWeight: "bold",
              backgroundColor: view === "month" ? "#6B97A4" : "#F5F5F5",
              color: view === "month" ? "#fff" : "#000",
              border: "none",
              transition: "background-color 0.2s ease-in-out",
              "&.Mui-selected": { backgroundColor: "#6B97A4 !important", color: "#fff" },
              "&:hover": { backgroundColor: "#6B97A4", color: "#fff" },
            }}
          >
            M
          </ToggleButton>
        </Box>

        {/* Chart Container */}
        <Box sx={{ width: "100%", height: { xs: 200, sm: 300 } }}>
          <Line
            data={view === "week" ? computedWeeklyData : computedMonthlyData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  beginAtZero: true,
                  min: 0,
                  max:
                    view === "week"
                      ? dailyConsumption * 1.5
                      : dailyConsumption * 20 * 1.2,
                },
              },
            }}
          />
        </Box>

        {/* Estimated Cost (Styled like your screenshot) */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: "18px", sm: "20px" } }}>
            Estimated Cost
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: "28px", sm: "32px" } }}>
            9.36 kWh/month
          </Typography>
          <Typography variant="body2" sx={{ fontSize: { xs: "12px", sm: "14px" } }}>
            <span style={{ color: "red" }}>●</span> Peak: 3.6 kWh
          </Typography>
          <Typography variant="body2" sx={{ fontSize: { xs: "12px", sm: "14px" } }}>
            <span style={{ color: "green" }}>●</span> Off-Peak: 5.4 kWh
          </Typography>
          <Typography variant="body2" sx={{ fontSize: { xs: "12px", sm: "14px" } }}>
            <span style={{ color: "gold" }}>●</span> Standby: 0.36 kWh
          </Typography>
        </Box>

        {/* External Factors Title */}
        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: "18px", sm: "20px" } }}>
          External Factors
        </Typography>

        {/* External Factors Boxes */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <FactorBox
            icon="🌤"
            title="Weather"
            value="Sunny, 24°C"
            description="Reduced usage likely due to sunlight."
          />
          <FactorBox
            icon="🍂"
            title="Season"
            value="Fall"
            description="Daylight hours decreasing; increased lighting usage expected."
          />
          <FactorBox
            icon="⏰"
            title="Peak Hours"
            value={`${peakHoursStartFormatted} - ${peakHoursEndFormatted}`}
            description="Consider dimming lights during peak hours to save energy."
          />
        </Box>

        {/* Buttons Container */}
        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            onClick={() => navigate(-1)}
            sx={{
              flex: 1,
              backgroundColor: "#000",
              color: "white",
              textTransform: "none",
              p: { xs: "8px 16px", sm: "12px 24px" },
              borderRadius: "8px",
              ":hover": { backgroundColor: "#333" },
            }}
          >
            Go Back
          </Button>
          <Button
            variant="contained"
            onClick={handleOpenRemoveDialog}
            sx={{
              flex: 1,
              backgroundColor: "#000",
              color: "white",
              textTransform: "none",
              p: { xs: "8px 16px", sm: "12px 24px" },
              borderRadius: "8px",
              ":hover": { backgroundColor: "#333" },
            }}
          >
            Remove Device
          </Button>
        </Box>
      </Box>

      {/* Confirmation Dialog for Remove */}
      <Dialog
        open={openRemoveDialog}
        onClose={handleCloseRemoveDialog}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "16px",
              p: 2,
            },
          },
        }}
      >
        <DialogTitle sx={{ textAlign: "center", fontWeight: "bold" }}>
          Remove {device ? device.name : "Bulb"}?
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center" }}>
          <Typography>
            Are you sure you want to remove this device? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
            pb: 2,
          }}
        >
          <Button
            variant="contained"
            onClick={handleCloseRemoveDialog}
            sx={{
              backgroundColor: "#ccc",
              color: "#000",
              textTransform: "none",
              borderRadius: "8px",
              ":hover": { backgroundColor: "#aaa" },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmRemove}
            sx={{
              backgroundColor: "red",
              color: "#fff",
              textTransform: "none",
              borderRadius: "8px",
              ":hover": { backgroundColor: "#b71c1c" },
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeviceDetails;
