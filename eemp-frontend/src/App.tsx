import React from 'react';
import './App.css';
import DeviceForm from "./device/DeviceForm";
import {LocalizationProvider} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "@fontsource/inter"; // Defaults to weight 400
import { createTheme } from '@mui/material/styles';
import {blue, blueGrey} from '@mui/material/colors';
import {ThemeProvider} from "@mui/material";


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


function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DeviceForm />
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
