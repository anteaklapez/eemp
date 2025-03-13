import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Animated dots component for the lightning overlay
 */
const AnimatedDots: React.FC = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            }}
        >
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', mr: 1 }}>
                Calculating
            </Typography>
            <Box sx={{ display: 'flex' }}>
                <Box className="dot" sx={{ width: 8, height: 8, backgroundColor: 'white', borderRadius: '50%', mx: 0.5 }} />
                <Box className="dot" sx={{ width: 8, height: 8, backgroundColor: 'white', borderRadius: '50%', mx: 0.5 }} />
                <Box className="dot" sx={{ width: 8, height: 8, backgroundColor: 'white', borderRadius: '50%', mx: 0.5 }} />
            </Box>
            <style>
                {`
          @keyframes dotBlink {
            0%, 80%, 100% { opacity: 0; }
            40% { opacity: 1; }
          }
          .dot {
            animation: dotBlink 1.4s infinite;
          }
          .dot:nth-of-type(1) {
            animation-delay: 0s;
          }
          .dot:nth-of-type(2) {
            animation-delay: 0.2s;
          }
          .dot:nth-of-type(3) {
            animation-delay: 0.4s;
          }
        `}
            </style>
        </Box>
    );
};

/**
 * Lightning Overlay component
 * Shows an animated lightning effect during calculation
 */
const LightningOverlay: React.FC = () => {
    // Generate an array of random bolt properties on each render
    const count = 20;
    const bolts = Array.from({ length: count }, () => ({
        left: Math.random() * 100,         // random horizontal position (%)
        top: Math.random() * 100,          // random vertical position (%)
        height: 30 + Math.random() * 70,   // bolt height between 30px and 100px
        delay: Math.random() * 2,          // random delay up to 2 seconds
    }));

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'black',
                zIndex: 9999,           // High z-index to cover everything
                pointerEvents: 'auto',  // Intercepts all clicks, blocking interaction beneath
            }}
        >
            {/* Keyframes for the lightning bolt flash */}
            <style>
                {`
          @keyframes boltFlash {
            0% { opacity: 0; }
            20% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}
            </style>
            {bolts.map((bolt, index) => (
                <Box
                    key={index}
                    sx={{
                        position: 'absolute',
                        left: `${bolt.left}%`,
                        top: `${bolt.top}%`,
                        width: '2px',
                        height: `${bolt.height}px`,
                        backgroundColor: 'white',
                        animation: `boltFlash 1s infinite`,
                        animationDelay: `${bolt.delay}s`,
                    }}
                />
            ))}
            {/* AnimatedDots component */}
            <AnimatedDots />
        </Box>
    );
};

export default LightningOverlay;