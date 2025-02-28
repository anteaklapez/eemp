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
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Icons
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import NatureIcon from "@mui/icons-material/Nature";
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

  // Get device from route state
  const { device } = (location.state as { device?: any }) || {};

  // For removing device
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);

  // 7-day labels
  const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // 1) Convert power ratings to kW
  const powerRatingKW =
    device?.powerRating
      ? Number(device.powerRating.value) /
        (device.powerRating.unit === "W" ? 1000 : 1)
      : 0;
  const standbyPowerKW =
    device?.standbyPower
      ? Number(device.standbyPower.value) /
        (device.standbyPower.unit === "W" ? 1000 : 1)
      : 0;

  // 2) Compute daily usage hours for each day
  let dailyUsageHours: number[] = Array(7).fill(0);
  if (
    device?.usagePattern?.usage_times &&
    Array.isArray(device.usagePattern.usage_times)
  ) {
    dailyUsageHours = device.usagePattern.usage_times.map((ut: any) => {
      const start = dayjs(ut.start);
      const end = dayjs(ut.end);
      if (!start.isValid() || !end.isValid()) return 0;

      let hours = end.diff(start, "hour", true);
      // If negative, assume overnight usage
      if (hours < 0) {
        hours += 24;
      }
      // Clamp to [0..24]
      if (hours < 0) hours = 0;
      if (hours > 24) hours = 24;

      return hours;
    });
  } else {
    dailyUsageHours = Array(7).fill(1);
  }

  // 3) Compute energy breakdown per day
  const computedDailyBreakdown = dailyUsageHours.map((hours) => {
    const activeEnergy = powerRatingKW * hours; // kWh
    const peakEnergy = activeEnergy * 0.4;      // 40% peak
    const offPeakEnergy = activeEnergy * 0.6;   // 60% off-peak
    const standbyEnergy = standbyPowerKW * (24 - hours);
    return { peak: peakEnergy, offPeak: offPeakEnergy, standby: standbyEnergy };
  });

  // 4) Prepare weekly chart data
  const computedDailyConsumptions = computedDailyBreakdown.map(
    (b) => b.peak + b.offPeak + b.standby
  );
  const computedWeeklyData: ChartData<"line"> = {
    labels: weekLabels,
    datasets: [
      {
        label: "Energy Consumption (kWh)",
        data: computedDailyConsumptions,
        borderColor: "#5A8DEE",
        backgroundColor: "rgba(90,141,238,0.2)",
        tension: 0.4,
        pointRadius: 6,
      },
    ],
  };

  // 5) Compute weekly sums & averages for monthly data
  const sumPeak = computedDailyBreakdown.reduce((acc, b) => acc + b.peak, 0);
  const sumOffPeak = computedDailyBreakdown.reduce((acc, b) => acc + b.offPeak, 0);
  const sumStandby = computedDailyBreakdown.reduce((acc, b) => acc + b.standby, 0);
  const sumTotal = computedDailyConsumptions.reduce((acc, val) => acc + val, 0);

  const averagePeak = sumPeak / 7;
  const averageOffPeak = sumOffPeak / 7;
  const averageStandby = sumStandby / 7;
  const averageTotal = sumTotal / 7;

  // For monthly chart, assume 30 days each month
  const monthlyLabels = Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`);
  const monthlyValues = Array(12).fill(+(averageTotal * 30).toFixed(2));
  const computedMonthlyData: ChartData<"line"> = {
    labels: monthlyLabels,
    datasets: [
      {
        label: "Energy Consumption (kWh)",
        data: monthlyValues,
        borderColor: "#5A8DEE",
        backgroundColor: "rgba(90,141,238,0.2)",
        tension: 0.4,
        pointRadius: 6,
      },
    ],
  };

  // 6) Compute the "peak hours on average" across the entire week
  //    We'll treat each day's usage interval as a start/end in fractional hours (0..24).
  //    Then we sum & average them to get an overall "average start" and "average end."
  let avgPeakHoursStart = "";
  let avgPeakHoursEnd = "";

  if (device?.usagePattern?.usage_times) {
    let sumStart = 0;
    let sumEnd = 0;
    let count = 0;

    device.usagePattern.usage_times.forEach((ut: any) => {
      const start = dayjs(ut.start);
      const end = dayjs(ut.end);
      if (!start.isValid() || !end.isValid()) return;

      // Convert to fractional hour of day (0..24+)
      let startHour = start.hour() + start.minute() / 60 + start.second() / 3600;
      let endHour = end.hour() + end.minute() / 60 + end.second() / 3600;

      // If end is before start => overnight => endHour += 24
      if (end.isBefore(start)) {
        endHour += 24;
      }

      sumStart += startHour;
      sumEnd += endHour;
      count++;
    });

    if (count > 0) {
      let avgStart = sumStart / count; // e.g. 18.5 => 6:30 PM
      let avgEnd = sumEnd / count;
      if (avgEnd < avgStart) {
        avgEnd += 24; // If it crosses midnight
      }

      // Convert fractional hours back to dayjs time
      // We'll pick an arbitrary reference date, e.g. 1970-01-01
      const referenceDate = dayjs("1970-01-01");
      const avgStartTime = referenceDate.add(avgStart, "hour");
      const avgEndTime = referenceDate.add(avgEnd, "hour");

      avgPeakHoursStart = avgStartTime.format("h:mm A");
      avgPeakHoursEnd = avgEndTime.format("h:mm A");

      // If avgEnd > 24 => we might show e.g. "2:00 AM (next day)" logic
      // For clarity, you can add a note if it extends past 24 hours
      if (avgEnd >= 24) {
        // e.g. subtract 24 from display to show the next day's time
        const nextDayEnd = referenceDate.add(avgEnd - 24, "hour");
        avgPeakHoursEnd = `${nextDayEnd.format("h:mm A")} (next day)`;
      }
    }
  }

  // Last updated info
  const lastUpdatedDate = device?.lastUpdated ? new Date(device.lastUpdated) : new Date();
  const lastUpdatedString = lastUpdatedDate.toLocaleString();

  // Remove device logic
  const handleConfirmRemove = () => {
    const storedDevices = JSON.parse(localStorage.getItem("devices") || "[]");
    const updatedDevices = storedDevices.filter((d: any) => d.deviceId !== device.deviceId);
    localStorage.setItem("devices", JSON.stringify(updatedDevices));
    setOpenRemoveDialog(false);
    navigate("/management");
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, margin: "0 auto" }}>
      {/* Device Name & Last Updated */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
        {device?.deviceName ?? device?.name ?? "Device"}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Last updated {lastUpdatedString}
      </Typography>

      {/* Energy Consumption */}
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
                    ? Math.max(...computedDailyConsumptions, 1) * 1.2
                    : (averageTotal * 30 || 1) * 1.2,
              },
            },
          }}
        />
      </Box>

      {/* Estimated Cost / Breakdown */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
          Estimated Cost
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          {(averageTotal * 30).toFixed(2)} kWh/month
        </Typography>
        <Typography variant="body2">
          <span style={{ color: "red" }}>●</span> Peak: {(averagePeak * 30).toFixed(2)} kWh
        </Typography>
        <Typography variant="body2">
          <span style={{ color: "green" }}>●</span> Off-Peak: {(averageOffPeak * 30).toFixed(2)} kWh
        </Typography>
        <Typography variant="body2">
          <span style={{ color: "gold" }}>●</span> Standby: {(averageStandby * 30).toFixed(2)} kWh
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
          value={
            avgPeakHoursStart && avgPeakHoursEnd
              ? `${avgPeakHoursStart} - ${avgPeakHoursEnd}`
              : "N/A"
          }
          description="Average usage interval across all days."
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
          onClick={() => setOpenRemoveDialog(true)}
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
        onClose={() => setOpenRemoveDialog(false)}
        PaperProps={{
          sx: { borderRadius: 4, textAlign: "center", p: 3 },
        }}
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          Remove {device?.deviceName || device?.name || "Device"}?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this device? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2 }}>
          <Button
            variant="contained"
            onClick={() => setOpenRemoveDialog(false)}
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
