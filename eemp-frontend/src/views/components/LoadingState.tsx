import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingStateProps {
    message?: string;
    fullScreen?: boolean;
}

/**
 * Loading state component with optional message
 */
const LoadingState: React.FC<LoadingStateProps> = ({
                                                       message = 'Loading...',
                                                       fullScreen = false,
                                                   }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: fullScreen ? '100vh' : '100%',
                width: '100%',
                p: 4,
            }}
        >
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography color="text.secondary">{message}</Typography>
        </Box>
    );
};

export default LoadingState;