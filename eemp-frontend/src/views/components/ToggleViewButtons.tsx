import React from 'react';
import { Box, ToggleButton } from '@mui/material';

interface ToggleViewButtonsProps {
    view: string;
    options: Array<{
        value: string;
        label: string;
    }>;
    onChange: (value: any) => void;
}

/**
 * Toggle View Buttons Component
 * Used to switch between different views (e.g., week/month, consumption/production)
 */
const ToggleViewButtons: React.FC<ToggleViewButtonsProps> = ({
                                                                 view,
                                                                 options,
                                                                 onChange,
                                                             }) => {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
            {options.map((option) => (
                <ToggleButton
                    key={option.value}
                    value={option.value}
                    selected={view === option.value}
                    onClick={() => onChange(option.value)}
                    sx={{
                        textTransform: 'none',
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        backgroundColor: view === option.value ? '#6B97A4' : '#F5F5F5',
                        color: view === option.value ? '#fff' : '#000',
                        border: 'none',
                        transition: 'background-color 0.2s ease-in-out',
                        '&.Mui-selected': {
                            backgroundColor: '#6B97A4 !important',
                            color: '#fff',
                        },
                        '&:hover': { backgroundColor: '#6B97A4', color: '#fff' },
                    }}
                >
                    {option.label}
                </ToggleButton>
            ))}
        </Box>
    );
};

export default ToggleViewButtons;