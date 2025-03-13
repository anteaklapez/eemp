import React from 'react';
import { Snackbar, Alert } from '@mui/material';

interface NotificationSnackbarProps {
    open: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    onClose: () => void;
    autoHideDuration?: number;
}

/**
 * Notification Snackbar component
 * Displays a notification message with an alert
 */
const NotificationSnackbar: React.FC<NotificationSnackbarProps> = ({
                                                                       open,
                                                                       message,
                                                                       type,
                                                                       onClose,
                                                                       autoHideDuration = 6000, // Default auto-hide duration
                                                                   }) => {
    return (
        <Snackbar
            open={open}
            autoHideDuration={autoHideDuration}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert onClose={onClose} severity={type} sx={{ width: '100%' }}>
                {message}
            </Alert>
        </Snackbar>
    );
};

export default NotificationSnackbar;