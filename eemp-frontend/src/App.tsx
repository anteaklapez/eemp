import React from 'react';
import './App.css';
import DeviceForm from "./device/DeviceForm";
import {LocalizationProvider} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";


function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DeviceForm />
    </LocalizationProvider>
  );
}

export default App;
