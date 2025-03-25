// src/App.js
import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { VoterProvider } from "./context/VoterContext";
import { PollProvider } from "./context/PollContext";
import HomePage from "./components/HomePage";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import ProfilePage from "./components/ProfilePage";
import CreatePollPage from "./components/CreatePollPage";
import ExistingPollsPage from "./components/ExistingPollsPage";
import ElectionBallotPage from "./components/ElectionBallotPage";
import PollDetailsPage from "./components/PollDetailsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AppBar, Toolbar, Button, Typography, Box, Container } from "@mui/material";
import { VoterContext } from "./context/VoterContext";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { alpha } from "@mui/material/styles";

const darkBlueTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#0D47A1" },
    secondary: { main: "#1565C0" },
    background: { default: "#0A1929", paper: "#0F2137" },
    text: { primary: "#FFFFFF", secondary: alpha("#FFFFFF", 0.7) },
  },
  typography: {
    fontFamily: "Inter, Roboto, sans-serif",
    h6: { fontWeight: 600, letterSpacing: "0.5px" },
    h4: { fontWeight: 700, letterSpacing: "0.5px" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
          ":hover": { boxShadow: "0px 4px 12px rgba(0,0,0,0.2)" },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        elevation3: { boxShadow: "0 4px 20px rgba(0,0,0,0.15)" },
      },
    },
  },
});

const Navigation = () => {
  const { voter, logout } = useContext(VoterContext);
  return (
    <AppBar
      position="static"
      sx={{
        background: "linear-gradient(45deg, #0D47A1 30%, #1565C0 90%)",
        boxShadow: "0 4px 15px rgba(13,71,161,0.4)",
      }}
    >
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Blockchain Voting
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button color="inherit" component={Link} to="/">Home</Button>
          {voter ? (
            <>
              <Button color="inherit" component={Link} to="/create">Create</Button>
              <Button color="inherit" component={Link} to="/polls">Polls</Button>
              <Button color="inherit" component={Link} to="/election">Election</Button>
              <Button color="inherit" component={Link} to="/profile">Profile</Button>
              <Button color="inherit" onClick={logout}>Logout</Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">Login</Button>
              <Button color="inherit" component={Link} to="/register">Register</Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

const App = () => {
  return (
    <ThemeProvider theme={darkBlueTheme}>
      <CssBaseline />
      <VoterProvider>
        <PollProvider>
          <Router>
            <div>
              <Navigation />
              <Container sx={{ mt: 4 }}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/" element={<HomePage />} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="/create" element={<ProtectedRoute><CreatePollPage /></ProtectedRoute>} />
                  <Route path="/polls" element={<ProtectedRoute><ExistingPollsPage /></ProtectedRoute>} />
                  <Route path="/election" element={<ProtectedRoute><ElectionBallotPage pollId="election" /></ProtectedRoute>} />
                  <Route path="/poll/:pollId" element={<ProtectedRoute><PollDetailsPage /></ProtectedRoute>} />
                </Routes>
              </Container>
            </div>
          </Router>
        </PollProvider>
      </VoterProvider>
    </ThemeProvider>
  );
};

export default App;
