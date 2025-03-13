import React, { useEffect } from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import poweredBy from '../../assets/poweredBy.json';

// Styled components
const EnlargingButton = styled(Button)(({ theme }) => ({
    position: 'relative',
    padding: '10px 20px',
    fontSize: '1rem',
    textTransform: 'none',
    background: '#000',
    transition: 'transform 0.3s ease-in-out',
    '&:hover': {
        transform: 'scale(1.1)',
    },
}));

/**
 * Landing Page Component
 * The first page users see when visiting the application
 */
const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    // Disable scrolling on mount
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'hidden';
        };
    }, []);

    return (
        <Box
            sx={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(to bottom, #6B97A4 0%, #28393E 100%)',
            }}
        >
            <Container
                maxWidth="md"
                sx={{
                    textAlign: { xs: 'center', sm: 'left' },
                }}
            >
                <Typography
                    variant="h3"
                    gutterBottom
                    sx={{
                        color: 'black',
                        fontWeight: 'bold',
                        fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem', lg: '5rem' },
                    }}
                >
                    Achieve energy Independence.
                    <br /> Save on costs.
                </Typography>

                <Typography
                    variant="body1"
                    sx={{
                        fontSize: { xs: '1rem', sm: '1.5rem', md: '2rem' },
                        mb: { xs: '1.5rem', sm: '2rem' },
                        color: 'white',
                    }}
                >
                    Input and monitor your household devices, view real-time energy
                    consumption data, and receive personalized recommendations to reduce
                    costs and increase efficiency.
                </Typography>

                <Box>
                    <EnlargingButton
                        variant="contained"
                        color="primary"
                        onClick={() => navigate('/location')}
                    >
                        Learn More
                    </EnlargingButton>
                </Box>
            </Container>

            {/* Responsive "Powered by" section */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: '10px',
                    width: { xs: '100%', sm: 'auto' },
                    left: { xs: '0', sm: 'unset' },
                    right: { xs: '0', sm: '10px' },
                    display: 'flex',
                    justifyContent: { xs: 'center', sm: 'flex-start' },
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: { xs: 'white', sm: 'rgba(255,255,255,0.8)' },
                    padding: '5px 10px',
                    borderRadius: { xs: 0, sm: '8px' },
                }}
            >
                <Typography variant="caption" sx={{ color: 'black' }}>
                    Powered by
                </Typography>
                {poweredBy.logos.map((logo) => (
                    <a
                        key={logo.name}
                        href={logo.link}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <img
                            src={logo.image}
                            alt={logo.name}
                            style={{ height: '30px', cursor: 'pointer' }}
                        />
                    </a>
                ))}
            </Box>
        </Box>
    );
};

export default LandingPage;