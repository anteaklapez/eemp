import React from "react";
import { Box, Typography, Button, Container } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

// Create a styled button that scales up on hover
const EnlargingButton = styled(Button)(({ theme }) => ({
  position: "relative",
  padding: "10px 20px",
  fontSize: "1rem",
  textTransform: "none",
  background: "#000", // originally black
  transition: "transform 0.3s ease-in-out",
  "&:hover": {
    transform: "scale(1.1)", // Enlarge the button on hover
  },
}));

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100%", // Full viewport height
        minWidth: "100%",  // Full viewport width
        background: "linear-gradient(to bottom, #6B97A4 0%, #28393E 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        color: "white",
        paddingTop: "10vh",
      }}
    >
      <Container>
        <Typography
          variant="h3"
          gutterBottom
          sx={{
            color: "black",
            fontWeight: "bold",
            fontSize: "5rem",
            textAlign: "left",
          }}
        >
          Achieve energy Independence. <br /> Save on costs.
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontSize: "2rem",
            marginBottom: "2rem",
            textAlign: "left",
          }}
        >
          Input and monitor your household devices, view real-time energy consumption data, and receive personalized
          recommendations to reduce costs and increase efficiency.
        </Typography>
        <Box sx={{ textAlign: "left" }}>
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
