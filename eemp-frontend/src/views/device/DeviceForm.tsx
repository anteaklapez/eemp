import React, { useMemo } from 'react';
import {
    Box,
    TextField,
    Button,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Typography,
    useTheme,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import dayjs from 'dayjs';

// Import categories and modules/inverters data
import categoriesData from '../../assets/categories.json';
import cecModules from '../../assets/cec_modules.json';
import sandiaModules from '../../assets/sandia_modules.json';
import cecInverters from '../../assets/cec_inverters.json';
import roomData from '../../assets/locations.json';

// Import view model and components
import { useFormViewModel } from '../../viewModels/formViewModel';
import SolarPanelForm from '../solarPanel/SolarPanelForm';
import LoadingState from '../components/LoadingState';

/**
 * DeviceForm Component
 * Form for adding or editing devices
 */
const DeviceForm: React.FC = () => {
    const theme = useTheme();

    // Use form view model
    const {
        formData,
        manualEntry,
        isEditing,
        loading,
        errorMessage,
        openError,
        setManualEntry,
        handleChange,
        handleCustomChange,
        handleWeekStartChange,
        handleUsageTimeChange,
        handleSubmit,
        handleCancel,
        handleCloseError,
    } = useFormViewModel();

    // Define modulesList so it remains in the same order on every render
    const modulesList = useMemo(() => [...cecModules, ...sandiaModules], []);

    // A helper handler to prevent e/E/+/-
    const handlePreventInvalidKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (['e', 'E', '+', '-'].includes(e.key)) {
            e.preventDefault();
        }
    };

    // Handle form submission
    const onSubmit = async () => {
        const success = await handleSubmit();
        if (success) {
            window.location.href = '/management';
        }
    };

    // Loading state
    if (loading) {
        return <LoadingState message="Processing device data..." />;
    }

    // Generic device form for non-solar panel devices
    const renderGenericForm = () => {
        return (
            <>
                <TextField
                    label="Device Name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                        label="Power Rating (Value)"
                        type="number"
                        value={formData.powerRatingValue}
                        onChange={(e) => handleChange('powerRatingValue', e.target.value)}
                        onKeyDown={handlePreventInvalidKeys}
                        fullWidth
                    />
                    <FormControl sx={{ minWidth: 'fit-content' }}>
                        <InputLabel id="power-rating-unit-label">Unit</InputLabel>
                        <Select
                            labelId="power-rating-unit-label"
                            value={formData.powerRatingUnit}
                            onChange={(e) => handleChange('powerRatingUnit', e.target.value)}
                        >
                            <MenuItem value="W">W</MenuItem>
                            <MenuItem value="kW">kW</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
                <TextField
                    label="Week Start Date"
                    type="date"
                    value={formData.weekStart ? formData.weekStart.format('YYYY-MM-DD') : ''}
                    onChange={(e) => handleWeekStartChange(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                />
                <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
                    Usage Times for the Week
                </Typography>
                {(formData.weekStart || dayjs()) &&
                    formData.usageTimes?.map((time, index) => {
                        const currentDate = (formData.weekStart || dayjs()).add(index, 'day');
                        const startTime = typeof time.start === 'string' ?
                            dayjs(time.start).format('HH:mm') :
                            time.start.format('HH:mm');
                        const endTime = typeof time.end === 'string' ?
                            dayjs(time.end).format('HH:mm') :
                            time.end.format('HH:mm');

                        return (
                            <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                                <Typography sx={{ width: 100 }}>
                                    {currentDate.format('ddd, MMM D')}
                                </Typography>
                                <TextField
                                    label="Start Time"
                                    type="time"
                                    inputProps={{ step: 60 }}
                                    value={startTime}
                                    onChange={(e) => handleUsageTimeChange(index, 'start', e.target.value)}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    label="End Time"
                                    type="time"
                                    inputProps={{ step: 60 }}
                                    value={endTime}
                                    onChange={(e) => handleUsageTimeChange(index, 'end', e.target.value)}
                                    sx={{ mb: 2 }}
                                />
                            </Box>
                        );
                    })}
                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="energy-type-label">Energy Type</InputLabel>
                    <Select
                        labelId="energy-type-label"
                        value={formData.energyType}
                        label="Energy Type"
                        onChange={(e) => handleChange('energyType', e.target.value)}
                    >
                        <MenuItem value="AC">AC</MenuItem>
                        <MenuItem value="DC">DC</MenuItem>
                    </Select>
                </FormControl>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                        label="Standby Power (Value)"
                        type="number"
                        value={formData.standbyPowerValue}
                        onChange={(e) => handleChange('standbyPowerValue', e.target.value)}
                        onKeyDown={handlePreventInvalidKeys}
                        fullWidth
                        sx={{ mb: 0 }}
                    />
                    <FormControl sx={{ minWidth: 'fit-content', mb: 1 }}>
                        <InputLabel id="standby-power-unit-label">Unit</InputLabel>
                        <Select
                            labelId="standby-power-unit-label"
                            value={formData.standbyPowerUnit}
                            onChange={(e) => handleChange('standbyPowerUnit', e.target.value)}
                        >
                            <MenuItem value="W">W</MenuItem>
                            <MenuItem value="kW">kW</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
                {formData.category !== 'Solar Panel' && (
                    <TextField
                        label="Number of Devices"
                        type="number"
                        value={formData.numberOfDevices}
                        onChange={(e) => handleChange('numberOfDevices', e.target.value)}
                        onKeyDown={handlePreventInvalidKeys}
                        fullWidth
                        sx={{ mb: 2 }}
                    />
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                    <TextField
                        label="Room Name"
                        value={formData.roomName}
                        onChange={(e) => handleChange('roomName', e.target.value)}
                        fullWidth
                        sx={{ mb: 2 }}
                    />
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel id="room-type-label">Room Type</InputLabel>
                        <Select
                            labelId="room-type-label"
                            value={formData.roomType || ''}
                            label="Room Type"
                            onChange={(e) => handleChange('roomType', e.target.value)}
                        >
                            {roomData.type.map((room: string) => (
                                <MenuItem key={room} value={room}>
                                    {room}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </>
        );
    };

    const deviceName =
        formData.name?.trim() ||
        (formData.category === 'Solar Panel' ? 'Solar Panel' : 'Device');

    return (
        <>
            <Box
                component="form"
                noValidate
                autoComplete="off"
                sx={{
                    width: { xs: "90%", sm: 400 },
                    mx: "auto",
                    pt: 4,
                    pb: 4,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}
            >
                <Typography variant="h5" sx={{ textAlign: "center", mb: 2 }}>
                    {isEditing ? "Edit Device" : "Add New Device"}
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="category-label">Category</InputLabel>
                    <Select
                        labelId="category-label"
                        value={formData.category}
                        onChange={(e) => {
                            handleChange("category", e.target.value);
                            if (e.target.value !== "Solar Panel") {
                                setManualEntry(false);
                            }
                        }}
                    >
                        {categoriesData.categories.map((cat) => (
                            <MenuItem key={cat.name} value={cat.name}>
                                {cat.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {formData.category === "Solar Panel" ? (
                    <SolarPanelForm
                        formData={formData}
                        handleChange={handleChange}
                        handleCustomChange={handleCustomChange}
                        manualEntry={manualEntry}
                        setManualEntry={setManualEntry}
                        modulesList={modulesList}
                        invertersList={cecInverters}
                    />
                ) : (
                    renderGenericForm()
                )}

                <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ backgroundColor: theme.palette.primary.dark }}
                        onClick={onSubmit}
                    >
                        {isEditing ? "Update" : "Save"}
                    </Button>
                    <Button variant="outlined" color="primary" fullWidth onClick={handleCancel}>
                        Cancel
                    </Button>
                </Box>
            </Box>

            <Dialog
                open={openError}
                onClose={handleCloseError}
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        textAlign: "center",
                        px: 4,
                        py: 3,
                        maxWidth: "360px",
                    },
                }}
            >
                <DialogTitle sx={{ p: 0, mb: 1, fontSize: "1.25rem", color: "red" }}>
                    Error
                </DialogTitle>
                <DialogContent sx={{ p: 0, mb: 2 }}>
                    <Typography variant="body1">{errorMessage}</Typography>
                </DialogContent>
                <DialogActions sx={{ p: 0, justifyContent: "center" }}>
                    <Button
                        variant="contained"
                        onClick={handleCloseError}
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            px: 4,
                            backgroundColor: "#000",
                            color: "#fff",
                            "&:hover": { backgroundColor: "#333" },
                        }}
                    >
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default DeviceForm;