import React, { useEffect } from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    IconButton,
    Avatar,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Fade,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDeviceViewModel } from '../../viewModels/deviceViewModel';
import { useEnergyViewModel } from '../../viewModels/energyViewModel';
import LoadingState from '../components/LoadingState';
import LightningOverlay from '../components/LightningOverlay';
import NotificationSnackbar from '../components/NotificationSnackbar';
import ConfirmationDialog from '../components/ConfirmationDialog';
import categoriesData from '../../assets/categories.json';

/**
 * DeviceManagement Component
 * Allows users to manage their devices (add, edit, delete)
 */
const DeviceManagement: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Use device view model
    const {
        devices,
        loading,
        error,
        notification,
        filterCategory,
        selectedRoom,
        openRemoveDialog,
        deviceToRemove,
        loadDevices,
        setFilterCategory,
        setSelectedRoom,
        handleOpenRemoveDialog,
        handleCloseRemoveDialog,
        handleConfirmRemove,
        handleCloseNotification,
        getFilteredDevices,
        getAllRooms,
    } = useDeviceViewModel();

    // Use energy view model for calculations
    const {
        isCalculating,
        calculateEnergyData
    } = useEnergyViewModel();

    // Load devices on mount and handle location state for refreshes
    useEffect(() => {
        loadDevices();

        // Check if we need to refresh energy data from navigation
        if (location.state?.refreshData) {
            calculateEnergyData();
        }
    }, [loadDevices, calculateEnergyData, location.state]);

    // Get filtered devices and rooms
    const filteredDevices = getFilteredDevices();
    const derivedRooms = getAllRooms();

    // Get category icon from the categories data
    const getCategoryIcon = (category: string): string => {
        const categoryInfo = categoriesData.categories.find(
            (item) => item.name === category
        );
        return categoryInfo ? categoryInfo.icon : categoriesData.defaultIcon;
    };

    // Handle adding a new device
    const handleAddDevice = () => {
        navigate('/form');
    };

    // Handle calculating energy data
    const handleCalculate = async () => {
        if (devices.length === 0) {
            handleCloseNotification();
            return;
        }

        await calculateEnergyData();
    };

    // Handle device editing
    const handleEdit = (index: number) => {
        const deviceToEdit = filteredDevices[index];
        navigate('/form', { state: { device: deviceToEdit, index } });
    };

    // Handle device deletion
    const handleDelete = (index: number) => {
        const deviceToDelete = filteredDevices[index];
        handleOpenRemoveDialog(deviceToDelete);
    };

    // Handle viewing device details
    const handleViewDetails = (index: number) => {
        const selectedDevice = filteredDevices[index];

        if (
            selectedDevice.category === 'Solar Panel' ||
            selectedDevice.deviceCategory === 'Solar Panel'
        ) {
            navigate(`/solar-panel-management/${selectedDevice.id || selectedDevice.deviceId}`);
        } else {
            navigate('/device-details', { state: { device: selectedDevice } });
        }
    };

    // If loading, show loading state
    if (loading) {
        return <LoadingState message="Loading devices..." />;
    }

    // If error, show error message
    if (error) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="error">{error}</Typography>
                <Button
                    variant="contained"
                    onClick={() => loadDevices()}
                    sx={{ mt: 2 }}
                >
                    Retry
                </Button>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                position: 'relative',
                p: 3,
                maxWidth: 600,
                margin: '0 auto',
                boxSizing: 'border-box',
                backgroundColor: '#fff',
            }}
        >
            {/* Full-page overlay with Fade transition that blocks all clicks when calculating */}
            <Fade in={isCalculating} timeout={500}>
                <div>
                    <LightningOverlay />
                </div>
            </Fade>

            {/* Header */}
            <Box sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                    Device Management
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    List of Devices
                </Typography>
            </Box>

            {/* Filter Dropdowns */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl fullWidth>
                    <InputLabel id="filter-category-label">Filter by Category</InputLabel>
                    <Select
                        labelId="filter-category-label"
                        value={filterCategory}
                        label="Filter by Category"
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <MenuItem value="All">All</MenuItem>
                        {categoriesData.categories.map((cat) => (
                            <MenuItem key={cat.name} value={cat.name}>
                                {cat.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl fullWidth>
                    <InputLabel id="filter-room-label">Filter by Room</InputLabel>
                    <Select
                        labelId="filter-room-label"
                        value={selectedRoom}
                        label="Filter by Room"
                        onChange={(e) => setSelectedRoom(e.target.value)}
                    >
                        <MenuItem value="All">All</MenuItem>
                        {derivedRooms.map((room) => (
                            <MenuItem key={room.key} value={room.key}>
                                {room.name} {room.type ? `(${room.type})` : ''}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Device List */}
            {filteredDevices.length === 0 ? (
                <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                    No devices found.
                </Typography>
            ) : (
                <List sx={{ mb: 2 }}>
                    {filteredDevices.map((device, index) => (
                        <ListItem
                            key={device.id || device.deviceId}
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                py: 1,
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                                '&:hover': { backgroundColor: '#f5f5f5' },
                            }}
                            onClick={() => handleViewDetails(index)}
                        >
                            <ListItemAvatar>
                                <Avatar
                                    src={getCategoryIcon(device.category || device.deviceCategory)}
                                    alt={`${device.category || device.deviceCategory} Icon`}
                                    sx={{ backgroundColor: 'transparent' }}
                                />
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    device.quantity && device.quantity > 1
                                        ? `${device.name || device.deviceName} (${device.quantity})`
                                        : device.name || device.deviceName
                                }
                                secondary={device.category || device.deviceCategory}
                                sx={{ textAlign: 'left' }}
                            />
                            <Box>
                                <IconButton
                                    edge="end"
                                    aria-label="edit"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(index);
                                    }}
                                >
                                    <EditIcon />
                                </IconButton>
                                <IconButton
                                    edge="end"
                                    aria-label="delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(index);
                                    }}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        </ListItem>
                    ))}
                </List>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6, gap: 2 }}>
                <Button
                    variant="contained"
                    onClick={handleAddDevice}
                    disabled={loading || isCalculating}
                    sx={{
                        textTransform: 'none',
                        fontSize: { xs: '12px', sm: '14px' },
                        p: { xs: 1, sm: 1.5 },
                        borderRadius: 2,
                        backgroundColor: '#6B97A4',
                        '&:hover': { backgroundColor: '#5a8292' },
                    }}
                >
                    Add Device
                </Button>
                <Button
                    variant="contained"
                    onClick={handleCalculate}
                    disabled={loading || isCalculating}
                    sx={{
                        textTransform: 'none',
                        fontSize: { xs: '12px', sm: '14px' },
                        p: { xs: 1, sm: 1.5 },
                        borderRadius: 2,
                        backgroundColor: '#6B97A4',
                        '&:hover': { backgroundColor: '#5a8292' },
                    }}
                >
                    Calculate
                </Button>
            </Box>

            {/* Confirmation Dialog for device removal */}
            <ConfirmationDialog
                open={openRemoveDialog}
                title={`Remove ${deviceToRemove?.name || deviceToRemove?.deviceName || 'Device'}?`}
                message="Are you sure you want to remove this device? This action cannot be undone."
                onCancel={handleCloseRemoveDialog}
                onConfirm={handleConfirmRemove}
                confirmLabel="Remove"
                cancelLabel="Cancel"
                confirmColor="error"
            />

            {/* Notification Snackbar */}
            <NotificationSnackbar
                open={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={handleCloseNotification}
            />
        </Box>
    );
};

export default DeviceManagement;