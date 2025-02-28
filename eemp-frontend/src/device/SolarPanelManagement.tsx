import React, { useEffect, useState } from "react";
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
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useNavigate, useParams } from "react-router-dom";

import WbSunnyIcon from "@mui/icons-material/WbSunny";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DeviceData {
  id?: number | string;
  category?: string;
  name?: string;
  lastUpdated?: string;
  // ... any other fields
}

const SolarPanelManagement: React.FC = () => {
  const { id } = useParams(); // expects route: /solar-panel-management/:id
  const navigate = useNavigate();
  const [view, setView] = useState<"week" | "month">("week");
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);

  // Load the device from localStorage using id
  useEffect(() => {
    const storedDevices = JSON.parse(localStorage.getItem("devices") || "[]");
    const foundDevice = storedDevices.find(
      (d: DeviceData) => String(d.id) === String(id)
    );
    if (foundDevice) {
      setDevice(foundDevice);
    }
  }, [id]);

  if (!device) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading solar panel details...</Typography>
      </Box>
    );
  }

  // Display the device's name in bold; fallback to "Solar Panel"
  const displayName =
    device.name && device.name.trim() !== "" ? device.name : "Solar Panel";

  // Format last updated date
  const lastUpdatedDate = device.lastUpdated
    ? new Date(device.lastUpdated)
    : new Date();
  const lastUpdatedString = lastUpdatedDate.toLocaleDateString();

  // Placeholder summary values
  const batteryPercentage = "80%";
  const kWhStored = "12 kWh";
  const duration = "6h";
  const savings = "€35";

  // Chart Data for Week and Month
  const weeklyLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklySolarData = [3, 6, 9, 8, 12, 7, 4];
  const weeklyGridData = [2, 2, 3, 5, 2, 4, 3];

  const monthlyLabels = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const monthlySolarData = [20, 25, 22, 30, 28, 35, 33, 31, 24, 20, 18, 22];
  const monthlyGridData = [10, 12, 8, 15, 16, 14, 13, 10, 9, 8, 7, 10];

  const chartData = {
    labels: view === "week" ? weeklyLabels : monthlyLabels,
    datasets: [
      {
        label: "Solar energy",
        data: view === "week" ? weeklySolarData : monthlySolarData,
        borderColor: "#5A8DEE",
        backgroundColor: "rgba(90,141,238,0.2)",
        tension: 0.4,
        pointRadius: 6,
      },
      {
        label: "Grid energy",
        data: view === "week" ? weeklyGridData : monthlyGridData,
        borderColor: "#CCC",
        backgroundColor: "rgba(200,200,200,0.2)",
        tension: 0.4,
        pointRadius: 6,
      },
    ],
  };

  const maxVal = Math.max(
    ...chartData.datasets[0].data,
    ...chartData.datasets[1].data
  );
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, suggestedMax: maxVal + 2, grid: { display: false } },
    },
  };

  // Handlers for remove dialog
  const handleRemoveDevice = () => setOpenRemoveDialog(true);
  const handleCloseRemoveDialog = () => setOpenRemoveDialog(false);
  const handleConfirmRemove = () => {
    const storedDevices = JSON.parse(localStorage.getItem("devices") || "[]");
    const updatedDevices = storedDevices.filter(
      (d: DeviceData) => String(d.id) !== String(device.id)
    );
    localStorage.setItem("devices", JSON.stringify(updatedDevices));
    setOpenRemoveDialog(false);
    navigate("/management");
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, margin: "0 auto" }}>
      {/* Heading */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
        {displayName}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Last updated {lastUpdatedString}
      </Typography>

      {/* Summary */}
      <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2 }}>
        Summary
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="body2" color="text.secondary">
            Battery
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            {batteryPercentage}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Stored
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            {kWhStored}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Duration
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            {duration}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Savings
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            {savings}
          </Typography>
        </Box>
      </Box>

      {/* Energy Production */}
      <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2 }}>
        Energy Production
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
            "&.Mui-selected": {
              backgroundColor: "#6B97A4 !important",
              color: "#fff",
            },
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
            "&.Mui-selected": {
              backgroundColor: "#6B97A4 !important",
              color: "#fff",
            },
            "&:hover": { backgroundColor: "#6B97A4", color: "#fff" },
          }}
        >
          M
        </ToggleButton>
      </Box>
      <Box sx={{ height: 250, mb: 3 }}>
        <Line data={chartData} options={chartOptions} />
      </Box>

      {/* Savings Section */}
      <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2 }}>
        Savings
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        This solar panel has contributed to <strong>45%</strong> of your energy independence this month.
      </Typography>

      {/* External Factors */}
      <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2 }}>
        External Factors
      </Typography>

      {/* Weather Box */}
      <Box
        sx={{
          border: "1px solid #eee",
          borderRadius: 2,
          p: 2,
          mb: 3,
          backgroundColor: "#fafafa",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between", // Space between for left label & right text
            mb: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <WbSunnyIcon sx={{ color: "#000", fontSize: "20px" }} />
            <Typography
              variant="body2"
              fontWeight="bold"
              sx={{ color: "#6B97A4", fontSize: "16px" }}
            >
              Weather
            </Typography>
          </Box>
          {/* Make the value black & bold, aligned to the right */}
          <Typography
            variant="body2"
            sx={{ color: "#000", fontWeight: "bold", fontSize: "16px" }}
          >
            25°C, 0% cloud cover
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Sunny weather boosts solar panel efficiency. Cloud cover or poor weather might reduce output.
        </Typography>
      </Box>

      {/* Peak Hours Box */}
      <Box
        sx={{
          border: "1px solid #eee",
          borderRadius: 2,
          p: 2,
          mb: 3,
          backgroundColor: "#fafafa",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between", // Space between for left label & right text
            mb: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AccessTimeIcon sx={{ color: "#000", fontSize: "20px" }} />
            <Typography
              variant="body2"
              fontWeight="bold"
              sx={{ color: "#6B97A4", fontSize: "16px" }}
            >
              Peak Hours
            </Typography>
          </Box>
          {/* Make the value black & bold, aligned to the right */}
          <Typography
            variant="body2"
            sx={{ color: "#000", fontWeight: "bold", fontSize: "16px" }}
          >
            9 AM - 3 PM
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Peak hours are when your panel generates the most energy. Use high-energy devices during this time to maximize efficiency and savings.
        </Typography>
      </Box>

      {/* Bottom Buttons */}
      <Box
        sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}
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
          onClick={handleRemoveDevice}
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
          Remove {device.name || "Solar Panel"}?
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

export default SolarPanelManagement;
