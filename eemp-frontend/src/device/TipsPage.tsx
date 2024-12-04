import React from "react";
import { Box, Typography } from "@mui/material";

const TipsPage: React.FC = () => {
    return (
        <Box
            sx={{
                height: "100vh",
                width: "100vw",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(to bottom, #6B97A4, #FFFFFF)",
            }}
        >
            <Typography variant="h3" sx={{ fontWeight: "bold", color: "#28393E", marginBottom: "20px" }}>
                Energy Saving Recommendations
            </Typography>
            <Typography variant="body1" sx={{ fontSize: "1.2rem", color: "#555" }}>
                You will be able to see all the recommendations for you and your home.
            </Typography>
        </Box>
    );
};

export default TipsPage;
