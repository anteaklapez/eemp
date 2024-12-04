import React from "react";
import './App.css';
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import LandingPage from "./device/LandingPage";
import DeviceForm from "./device/DeviceForm";
import DeviceManagement from "./device/DeviceManagement";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "@fontsource/inter";
import { createTheme } from "@mui/material/styles";
import { blueGrey } from "@mui/material/colors";
import { ThemeProvider, BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import AppsIcon from "@mui/icons-material/Apps";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import { CSSTransition, SwitchTransition } from "react-transition-group";

declare module '@mui/material/styles' {
  interface PaletteColor {
    darker?: string;
  }

  interface SimplePaletteColorOptions {
    darker?: string;
  }
}

const theme = createTheme({
  palette: {
    primary: {
      light: blueGrey[300],
      main: blueGrey[500],
      dark: blueGrey[700],
      darker: blueGrey[900],
    },
  },
});

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentTab = () => {
    if (location.pathname === "/management") return 1;
    return 0;
  };

  const handleNavigation = (newValue: number) => {
    if (newValue === 0) navigate("/");
    if (newValue === 1) navigate("/management");
  };

  return (
    <Paper
      sx={{
        position: "fixed",
        bottom: 15,
        left: "50%",
        transform: "translateX(-50%)",
        width: "60%",
        maxWidth: 300,
        background: "#f5f5f5",
        borderRadius: "20px",
        boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.1)",
      }}
      elevation={3}
    >
      <BottomNavigation
        value={getCurrentTab()}
        onChange={(event, newValue) => handleNavigation(newValue)}
        showLabels
        sx={{
          backgroundColor: "transparent",
          justifyContent: "space-around",
        }}
      >
        <BottomNavigationAction
          label="Home"
          icon={<HomeIcon />}
          sx={{
            color: getCurrentTab() === 0 ? "white" : "black",
            background: getCurrentTab() === 0 ? "linear-gradient(to bottom, #6B97A4, #28393E)" : "none",
            borderRadius: "20px",
            transform: getCurrentTab() === 0 ? "scale(1.05)" : "scale(0.9)",
            transition: "all 0.3s ease-in-out",
          }}
        />
        <BottomNavigationAction
          label="Devices"
          icon={<AppsIcon />}
          sx={{
            color: getCurrentTab() === 1 ? "white" : "black",
            background: getCurrentTab() === 1 ? "linear-gradient(to bottom, #6B97A4, #28393E)" : "none",
            borderRadius: "20px",
            transform: getCurrentTab() === 1 ? "scale(1.05)" : "scale(0.9)",
            transition: "all 0.3s ease-in-out",
          }}
        />
      </BottomNavigation>
    </Paper>
  );
};

const App: React.FC = () => {
  const location = useLocation();

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <SwitchTransition>
          <CSSTransition key={location.pathname} classNames="slide" timeout={300}>
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/management" element={<DeviceManagement />} />
              <Route path="/form" element={<DeviceForm />} />
            </Routes>
          </CSSTransition>
        </SwitchTransition>
        {/* Conditionally render the navigation bar only if the current route is "/management" */}
        {location.pathname === "/management" && <Navigation />}
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App;
