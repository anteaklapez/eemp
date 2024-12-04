import React from "react";
import {Box, Typography, Button, Container} from "@mui/material";
import {useNavigate} from "react-router-dom";

const HomePage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Box
            sx={{

                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                alignItems: "center", // Center horizontally
                height: "100vh",
                width: "100vw",
                background: "linear-gradient(to bottom, #6B97A4, #FFFFFF)",
                color: "#333",
                padding: "16px",
                minHeight: "100%", // Ensure it takes full viewport height
                minWidth: "100%", // Ensure it takes full viewport width
            }}
        >
            <Container sx={{marginTop:"15rem" }} >
                <Typography
                    variant="h3"
                    gutterBottom
                    sx={{
                        fontSize: "70px",
                        fontWeight: "bold",
                        color: "#28393E",
                        marginBottom: "20px",
                        textAlign: "left",
                    }}
                >
                    Welcome to Your Smart Home
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        color: "white",
                        fontSize: "1.2rem",
                        marginBottom: "20px",
                        textAlign: "left",
                    }}
                >
                    Here soon, you will be able to see your graphs and consumption
                    <br/> Still work in progress.
                </Typography>
                <Box sx={{ textAlign: "left" }}>
                    <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate("/management")}
                    sx={{

                        backgroundColor: "#2C2C2C",
                        color: "white",
                        padding: "10px 20px",
                        textTransform: "none",
                        justifyContent: "center",
                        ":hover": {
                            backgroundColor: "#1F1F1F",
                        },
                    }}
                >
                    Go to Device Management
                </Button>

                </Box>

            </Container>
        </Box>
    );
};

export default HomePage;
