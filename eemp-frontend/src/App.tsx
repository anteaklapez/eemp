import React from 'react';
import './App.css';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import '@fontsource/inter';
import { createTheme } from '@mui/material/styles';
import { blueGrey } from '@mui/material/colors';
import { ThemeProvider, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AppsIcon from '@mui/icons-material/Apps';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { CSSTransition, SwitchTransition } from 'react-transition-group';

// Import views
import LandingPage from './views/landing/LandingPage';
import HomePage from './views/home/HomePage';
import LocationAccess from './views/location/LocationAccess';

// Import device views (will be implemented)
import DeviceForm from './views/device/DeviceForm';
import DeviceManagement from './views/device/DeviceManagement';
import DeviceDetails from './views/device/DeviceDetails';
import SolarPanelManagement from './views/solarPanel/SolarPanelManagement';
import TipsPage from './views/tips/TipsPage';

// Define custom theme with custom palette color
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

/**
 * Navigation component
 * Provides bottom navigation bar for main sections of the app
 */
const Navigation: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const getCurrentTab = () => {
        if (location.pathname === '/home') return 0;
        if (location.pathname === '/management') return 1;
        if (location.pathname === '/tips') return 2;
        return 0;
    };

    const handleNavigation = (newValue: number) => {
        if (newValue === 0) navigate('/home');
        if (newValue === 1) navigate('/management');
        if (newValue === 2) navigate('/tips');
    };

    return (
        <Paper
            sx={{
                position: 'fixed',
                bottom: 15,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '70%',
                maxWidth: 350,
                background: '#f5f5f5',
                borderRadius: '20px',
                boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.1)',
            }}
            elevation={3}
        >
            <BottomNavigation
                value={getCurrentTab()}
                onChange={(event, newValue) => handleNavigation(newValue)}
                showLabels
                sx={{
                    backgroundColor: 'transparent',
                    justifyContent: 'space-around',
                }}
            >
                {/* Home Tab */}
                <BottomNavigationAction
                    label="Home"
                    icon={<HomeIcon />}
                    sx={{
                        color: 'black',
                        background: getCurrentTab() === 0 ? '#6B97A4' : 'none',
                        borderRadius: '20px',
                        transform: getCurrentTab() === 0 ? 'scale(1.05)' : 'scale(0.9)',
                        transition: 'all 0.3s ease-in-out',
                        '& .MuiSvgIcon-root': {
                            color: getCurrentTab() === 0 ? 'white' : '#666666',
                        },
                        '& .MuiBottomNavigationAction-label': {
                            display: getCurrentTab() === 0 ? 'block' : 'none',
                            color: getCurrentTab() === 0 ? 'white' : '#666666',
                        },
                    }}
                />
                {/* Devices Tab */}
                <BottomNavigationAction
                    label="Devices"
                    icon={<AppsIcon />}
                    sx={{
                        color: 'black',
                        background: getCurrentTab() === 1 ? '#6B97A4' : 'none',
                        borderRadius: '20px',
                        transform: getCurrentTab() === 1 ? 'scale(1.05)' : 'scale(0.9)',
                        transition: 'all 0.3s ease-in-out',
                        '& .MuiSvgIcon-root': {
                            color: getCurrentTab() === 1 ? 'white' : '#666666',
                        },
                        '& .MuiBottomNavigationAction-label': {
                            display: getCurrentTab() === 1 ? 'block' : 'none',
                            color: getCurrentTab() === 1 ? 'white' : '#666666',
                        },
                    }}
                />
                {/* Tips Tab */}
                <BottomNavigationAction
                    label="Tips"
                    icon={<LightbulbIcon />}
                    sx={{
                        color: 'black',
                        background: getCurrentTab() === 2 ? '#6B97A4' : 'none',
                        borderRadius: '20px',
                        transform: getCurrentTab() === 2 ? 'scale(1.05)' : 'scale(0.9)',
                        transition: 'all 0.3s ease-in-out',
                        '& .MuiSvgIcon-root': {
                            color: getCurrentTab() === 2 ? 'white' : '#666666',
                        },
                        '& .MuiBottomNavigationAction-label': {
                            display: getCurrentTab() === 2 ? 'block' : 'none',
                            color: getCurrentTab() === 2 ? 'white' : '#666666',
                        },
                    }}
                />
            </BottomNavigation>
        </Paper>
    );
};

/**
 * Main App component
 * Defines routes and theme for the application
 */
const App: React.FC = () => {
    const location = useLocation();
    const [prevPath, setPrevPath] = React.useState<string>('');

    React.useEffect(() => {
        setPrevPath(location.pathname);
    }, [location.pathname]);

    const getAnimationDirection = () => {
        if (prevPath === '/management' && location.pathname === '/home') {
            return 'slide-left';
        } else if (prevPath === '/home' && location.pathname === '/management') {
            return 'slide-right';
        }
        return 'fade'; // Fallback for unknown transitions
    };

    return (
        <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <SwitchTransition>
                    <CSSTransition
                        key={location.pathname}
                        classNames={getAnimationDirection()}
                        timeout={300}
                    >
                        <Routes location={location}>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/home" element={<HomePage />} />
                            <Route path="/management" element={<DeviceManagement />} />
                            <Route path="/form" element={<DeviceForm />} />
                            <Route path="/tips" element={<TipsPage />} />
                            <Route path="/location" element={<LocationAccess />} />
                            <Route path="/device-details" element={<DeviceDetails />} />
                            <Route path="/solar-panel-management/:id" element={<SolarPanelManagement />} />
                        </Routes>
                    </CSSTransition>
                </SwitchTransition>
                {/* Conditionally render the navigation bar */}
                {!["/", "/form", "/location", "/device-details"].includes(location.pathname) &&
                    !location.pathname.startsWith("/solar-panel-management") && <Navigation />}
            </LocalizationProvider>
        </ThemeProvider>
    );
};

export default App;