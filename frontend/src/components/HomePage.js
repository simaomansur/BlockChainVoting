import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Box, Button, Typography, Grid } from "@mui/material";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm">
      <Box sx={{ textAlign: "center", mt: 8 }}>
        <Typography variant="h3" gutterBottom>
          Welcome to the Voting System
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 4 }}>
          Choose an action below to get started.
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => navigate("/create")}
            >
              Create a Poll
            </Button>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              onClick={() => navigate("/polls")}
            >
              View Polls
            </Button>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => navigate("/election")}
            >
              Election
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default HomePage;
