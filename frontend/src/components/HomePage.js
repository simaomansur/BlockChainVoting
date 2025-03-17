import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Box, Button, Typography, Grid, Paper } from "@mui/material";
import { VoterContext } from "../context/VoterContext";

const HomePage = () => {
  const navigate = useNavigate();
  const { voter, logout } = useContext(VoterContext);

  return (
    <Container maxWidth="md">
      <Box sx={{ textAlign: "center", mt: 8 }}>
        <Typography variant="h3" gutterBottom>
          Welcome to the Blockchain Voting System
        </Typography>
        
        {voter ? (
          <>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Logged in as: <strong>{voter.name}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Voter ID: {voter.voterId}
              </Typography>
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={logout}
                sx={{ mr: 1 }}
              >
                Logout
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => navigate(`/profile`)}
              >
                My Profile
              </Button>
            </Paper>
            
            <Typography variant="subtitle1" sx={{ mb: 4 }}>
              Choose an action below to get started
            </Typography>
            
            <Grid container spacing={3} justifyContent="center">
              <Grid item xs={12} sm={4}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
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
                  size="large"
                  onClick={() => navigate("/polls")}
                >
                  View Polls
                </Button>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  color="info"
                  onClick={() => navigate("/election")}
                >
                  Election
                </Button>
              </Grid>
            </Grid>
          </>
        ) : (
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 4 }}>
              Please log in or register to continue
            </Typography>
            <Grid container spacing={3} justifyContent="center">
              <Grid item xs={12} sm={6}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  onClick={() => navigate("/login")}
                >
                  Login
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  size="large"
                  onClick={() => navigate("/register")}
                >
                  Register
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default HomePage;