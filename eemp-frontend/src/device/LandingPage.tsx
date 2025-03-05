import React, { useEffect } from "react";
import { Box, Typography, Button, Container } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

// Create a styled button that scales up on hover
const EnlargingButton = styled(Button)(({ theme }) => ({
  position: "relative",
  padding: "10px 20px",
  fontSize: "1rem",
  textTransform: "none",
  background: "#000",
  transition: "transform 0.3s ease-in-out",
  "&:hover": {
    transform: "scale(1.1)", // Enlarge the button on hover
  },
}));

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Disable scrolling when this component mounts, re-enable on unmount
  useEffect(() => {
    // Disable scrolling
    document.body.style.overflow = "hidden";
    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "hidden";

    // Re-enable scrolling when this component unmounts
    return () => {
      document.body.style.overflow = "hidden";
      document.body.style.overflowX = "hidden";
      document.body.style.overflowY = "hidden";
    };
  }, []);

  return (
    <Box
      sx={{
        width: "100vw",        // Full viewport width
        height: "100vh",       // Full viewport height
        display: "flex",
        flexDirection: "column",
        justifyContent: "center", // Center vertically
        alignItems: "center",     // Center horizontally
        background: "linear-gradient(to bottom, #6B97A4 0%, #28393E 100%)",
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          textAlign: { xs: "center", sm: "left" },
        }}
      >
        <Typography
          variant="h3"
          gutterBottom
          sx={{
            color: "black",
            fontWeight: "bold",
            fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4.5rem", lg: "5rem" },
          }}
        >
          Achieve energy Independence.
          <br /> Save on costs.
        </Typography>

        <Typography
          variant="body1"
          sx={{
            fontSize: { xs: "1rem", sm: "1.5rem", md: "2rem" },
            mb: { xs: "1.5rem", sm: "2rem" },
              color: "white",
          }}
        >
          Input and monitor your household devices, view real-time energy consumption data,
          and receive personalized recommendations to reduce costs and increase efficiency.
        </Typography>

        <Box>
          <EnlargingButton
            variant="contained"
            color="primary"
            onClick={() => navigate("/location")}
          >
            Learn More
          </EnlargingButton>
        </Box>
      </Container>
    </Box>
  );
};

export default LandingPage;
