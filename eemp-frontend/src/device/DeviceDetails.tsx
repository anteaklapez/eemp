import React, { useState } from "react";
import { Line } from "react-chartjs-2";
import { ChartData } from "chart.js";
import {
  Box,
  Typography,
  ToggleButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
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

// Import Material‑UI icons
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import NatureIcon from "@mui/icons-material/Nature"; // using Nature icon as an alternative to Eco
import AccessTimeIcon from "@mui/icons-material/AccessTime";

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

// FactorBox Component (for External Factors)
interface FactorBoxProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}
const FactorBox: React.FC<FactorBoxProps> = ({ icon, title, value, description }) => (
  <Box
    sx={{
      backgroundColor: "#F5F5F5",
      p: { xs: 1.5, sm: 2 },
      borderRadius: "12px",
      display: "flex",
      flexDirection: "column",
      gap: 1,
      width: "100%",
      boxSizing: "border-box",
    }}
  >
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {icon}
        <Typography
          variant="subtitle1"
          sx={{
            color: "#5A8DEE",
            fontWeight: "bold",
            fontSize: { xs: "14px", sm: "16px" },
          }}
        >
          {title}
        </Typography>
      </Box>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: "bold",
          fontSize: { xs: "14px", sm: "16px" },
        }}
      >
        {value}
      </Typography>
    </Box>
    <Typography
      variant="body2"
      sx={{ color: "gray", fontSize: { xs: "12px", sm: "14px" } }}
    >
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

  // Format peak hours if available
  const peakHoursStartFormatted = device?.peakHoursStart
    ? dayjs(device.peakHoursStart).format("h:mm A")
    : "";
  const peakHoursEndFormatted = device?.peakHoursEnd
    ? dayjs(device.peakHoursEnd).format("h:mm A")
    : "";

  // State for the remove-dialog
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);

  // Calculate daily consumption
  let dailyConsumption = 0;
  if (device) {
    const power = parseFloat(device.powerConsumption || "0");
    const duration = parseFloat(device.duration || "0");
    dailyConsumption =
      device.unit === "W" ? (power * duration) / 1000 : power * duration;
  }

  // Weekly chart data (e.g., Mon–Fri)
  const computedWeeklyData: ChartData<"line"> = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    datasets: [
      {
        label: "Energy Consumption (kWh)",
        data: Array(5).fill(dailyConsumption),
        borderColor: "#5A8DEE",
        backgroundColor: "rgba(90,141,238,0.2)",
        tension: 0.4,
        pointRadius: 6,
      },
    ],
  };

  // Monthly chart data (12 months; each month = 20 working days)
  const computedMonthlyData: ChartData<"line"> = {
    labels: Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`),
    datasets: [
      {
        label: "Energy Consumption (kWh)",
        data: Array(12).fill(dailyConsumption * 20),
        borderColor: "#5A8DEE",
        backgroundColor: "rgba(90,141,238,0.2)",
        tension: 0.4,
        pointRadius: 6,
      },
    ],
  };

  // Last updated
  const lastUpdatedDate = device && device.lastUpdated ? new Date(device.lastUpdated) : new Date();
  const lastUpdatedString = lastUpdatedDate.toLocaleString();

  // Handlers for the remove dialog
  const handleOpenRemoveDialog = () => setOpenRemoveDialog(true);
  const handleCloseRemoveDialog = () => setOpenRemoveDialog(false);
  const handleConfirmRemove = () => {
    const storedDevices = JSON.parse(localStorage.getItem("devices") || "[]");
    const updatedDevices = storedDevices.filter((d: any) => d.id !== device.id);
    localStorage.setItem("devices", JSON.stringify(updatedDevices));
    setOpenRemoveDialog(false);
    navigate("/management");
  };

  return (
    // Main container with same width as the Solar Panel page
    <Box sx={{ p: 3, maxWidth: 600, margin: "0 auto" }}>
      {/* Device Name & Last Updated */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
        {device ? device.name : "Device"}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Last updated {lastUpdatedString}
      </Typography>

      {/* Energy Consumption Section */}
      <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
        Energy Consumption
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mb: 2 }}>
        <ToggleButton
          value="week"
          selected={view === "week"}
          onClick={() => setView("week")}
          sx={{
            textTransform: "none",
            width: 42,
            height: 42,
            borderRadius: "50%",
            fontSize: "16px",
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
            width: 42,
            height: 42,
            borderRadius: "50%",
            fontSize: "16px",
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
      <Box sx={{ height: 250, mb: 3 }}>
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

      {/* Estimated Cost Section */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
          Estimated Cost
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          9.36 kWh/month
        </Typography>
        <Typography variant="body2">
          <span style={{ color: "red" }}>●</span> Peak: 3.6 kWh
        </Typography>
        <Typography variant="body2">
          <span style={{ color: "green" }}>●</span> Off-Peak: 5.4 kWh
        </Typography>
        <Typography variant="body2">
          <span style={{ color: "gold" }}>●</span> Standby: 0.36 kWh
        </Typography>
      </Box>

      {/* External Factors */}
      <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
        External Factors
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
        <FactorBox
          icon={<WbSunnyIcon sx={{ color: "black" }} />}
          title="Weather"
          value="Sunny, 24°C"
          description="Reduced usage likely due to sunlight."
        />
        <FactorBox
          icon={<NatureIcon sx={{ color: "black" }} />}
          title="Season"
          value="Fall"
          description="Daylight hours decreasing; increased lighting usage expected."
        />
        <FactorBox
          icon={<AccessTimeIcon sx={{ color: "black" }} />}
          title="Peak Hours"
          value={`${peakHoursStartFormatted} - ${peakHoursEndFormatted}`}
          description="Consider dimming lights during peak hours to save energy."
        />
      </Box>

      {/* Action Buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Button
          variant="contained"
          onClick={() => navigate(-1)}
          sx={{
            flex: 1,
            backgroundColor: "#000",
            color: "#fff",
            textTransform: "none",
            p: { xs: "10px 20px", sm: "14px 28px" },
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
            color: "#fff",
            textTransform: "none",
            p: { xs: "10px 20px", sm: "14px 28px" },
            borderRadius: "8px",
            ":hover": { backgroundColor: "#333" },
          }}
        >
          Remove Device
        </Button>
      </Box>

      {/* Remove Confirmation Dialog */}
      <Dialog
        open={openRemoveDialog}
        onClose={handleCloseRemoveDialog}
        PaperProps={{
          sx: { borderRadius: 4, textAlign: "center", p: 3 },
        }}
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          Remove {device?.name || "Device"}?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this device? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2 }}>
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
