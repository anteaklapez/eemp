import React from 'react';
import { Box, Typography } from '@mui/material';

interface FactorBoxProps {
    icon: React.ReactNode;
    title: string;
    value: string;
    description: string;
}

/**
 * FactorBox component for displaying external factors
 * Used in DeviceDetails and SolarPanelManagement
 */
const FactorBox: React.FC<FactorBoxProps> = ({
                                                 icon,
                                                 title,
                                                 value,
                                                 description,
                                             }) => (
    <Box
        sx={{
            backgroundColor: '#F5F5F5',
            p: 2,
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            width: '100%',
            boxSizing: 'border-box',
        }}
    >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {icon}
                <Typography
                    variant="body2"
                    fontWeight="bold"
                    sx={{
                        color: '#6B97A4',
                        fontSize: '16px',
                    }}
                >
                    {title}
                </Typography>
            </Box>
            <Typography
                variant="body2"
                fontWeight="bold"
                sx={{
                    fontSize: '16px',
                    color: '#000',
                }}
            >
                {value}
            </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
            {description}
        </Typography>
    </Box>
);

export default FactorBox;