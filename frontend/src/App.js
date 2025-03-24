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

// IMPORTANT: The PollDetailsPage import
import PollDetailsPage from "./components/PollDetailsPage";

import ProtectedRoute from "./components/ProtectedRoute";
import {
  AppBar,
  Toolbar,
  Button,
  Typography,
  Box,
  Container
} from "@mui/material";
import { VoterContext } from "./context/VoterContext";

// 1) Import MUI theme utilities
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { alpha } from "@mui/material/styles";

// 2) Create a dark monotone blue theme with some extra polish
const darkBlueTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#0D47A1", // Deep blue
    },
    secondary: {
      main: "#1565C0", // Another shade of blue
    },
    background: {
      default: "#0A1929", // Very dark blue
      paper: "#0F2137",   // Slightly lighter dark blue for surfaces
    },
    text: {
      primary: "#FFFFFF",
      secondary: alpha("#FFFFFF", 0.7), // Subtle text
    },
  },
  typography: {
    fontFamily: "Inter, Roboto, sans-serif",
    h6: {
      fontWeight: 600,
      letterSpacing: "0.5px",
    },
    h4: {
      fontWeight: 700,
      letterSpacing: "0.5px",
    },
    button: {
      textTransform: "none", // Disable uppercase on buttons
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 10, // Slightly more rounded corners
  },
  components: {
    // 3) Example: Override MUI Button to look more polished
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
          ":hover": {
            boxShadow: "0px 4px 12px rgba(0,0,0,0.2)",
          },
        },
      },
    },
    // 4) Example: Card or Paper can have more subtle shadow
    MuiPaper: {
      styleOverrides: {
        elevation3: {
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        },
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
        // 5) Fancy gradient background & subtle shadow
        background: "linear-gradient(45deg, #0D47A1 30%, #1565C0 90%)",
        boxShadow: "0 4px 15px rgba(13,71,161,0.4)",
      }}
    >
      <Toolbar>
        {/* Optionally add a brand logo here */}
        {/* <img src="/logo.png" alt="Brand Logo" style={{ height: 40, marginRight: 16 }} /> */}

        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Blockchain Voting
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button color="inherit" component={Link} to="/">
            Home
          </Button>

          {voter ? (
            <>
              <Button color="inherit" component={Link} to="/create">
                Create Poll
              </Button>
              <Button color="inherit" component={Link} to="/polls">
                View Polls
              </Button>
              <Button color="inherit" component={Link} to="/election">
                Election
              </Button>
              <Button color="inherit" component={Link} to="/profile">
                Profile
              </Button>
              <Button color="inherit" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">
                Login
              </Button>
              <Button color="inherit" component={Link} to="/register">
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

const App = () => {
  return (
    // 6) Wrap everything with ThemeProvider + CssBaseline
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

                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/create"
                    element={
                      <ProtectedRoute>
                        <CreatePollPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/polls"
                    element={
                      <ProtectedRoute>
                        <ExistingPollsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/election"
                    element={
                      <ProtectedRoute>
                        <ElectionBallotPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Unified Poll Details route (shows both poll info and results) */}
                  <Route
                    path="/poll/:pollId"
                    element={
                      <ProtectedRoute>
                        <PollDetailsPage />
                      </ProtectedRoute>
                    }
                  />
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
