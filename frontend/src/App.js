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
import ElectionDetailsPage from "./components/ElectionDetailsPage";

import { AppBar, Toolbar, Button, Typography, Box, Container, CssBaseline } from "@mui/material";
import { VoterContext } from "./context/VoterContext";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import "./App.css";

/*
  MONOCHROMATIC BLUE THEME:
  - Background: #1B2A41 (dark slate-blue)
  - Paper (cards/nav): #223549 (slightly lighter blue)
  - Accent (buttons/links): #2979FF
  - Text primary: #FFFFFF
  - Text secondary: #BCCCDC
  - Smaller corners (4px)
*/
const customTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#42A5F5" }, // Slightly softer blue than #2979FF
    secondary: { main: '#81D4FA'}, // Lighter blue for secondary actions/accents
    background: {
      default: "#0D1B2A", // Darker navy base
      paper: "#1B2E44",   // Slightly lighter navy for cards/nav
    },
    text: {
      primary: "#E0E0E0", // Slightly off-white for better readability
      secondary: "#A0B0C0", // Softer grey for secondary text
    },
    divider: 'rgba(255, 255, 255, 0.12)', // Subtle divider color
  },
  shape: {
    borderRadius: 8, // Slightly more rounded corners
  },
  typography: {
    fontFamily: "Inter, Roboto, sans-serif",
    h3: { fontWeight: 700, letterSpacing: "0.2px" },
    h4: { fontWeight: 700, letterSpacing: "0.3px" },
    h5: { fontWeight: 600, letterSpacing: "0.2px" },
    h6: { fontWeight: 600, letterSpacing: "0.2px" },
    body1: { fontSize: "1rem", lineHeight: 1.6 },
    body2: { fontSize: "0.875rem", lineHeight: 1.5, color: '#A0B0C0' },
    button: { textTransform: "none", fontWeight: 600, fontSize: '0.9rem' },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#1B2E44", // matches paper color
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)", // Softer shadow
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)', // Add subtle border
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: { minHeight: "60px", padding: "0 1.5rem" }, // Slightly taller toolbar
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState }) => ({
           borderRadius: 8, // Match global shape
           padding: '8px 22px', // Adjust padding slightly
           transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
           boxShadow: 'none', // Start with no shadow
           '&:hover': {
              boxShadow: ownerState.variant === 'contained' ? '0 4px 12px rgba(0, 0, 0, 0.2)' : 'none', // Add shadow on hover for contained
              backgroundColor: ownerState.variant !== 'text' ? undefined : 'rgba(255, 255, 255, 0.08)', // Standard text hover
           },
        }),
        // Keep text button simple
        text: {
          color: "#E0E0E0",
          padding: '8px 16px',
          '&:hover': {
             backgroundColor: 'rgba(255, 255, 255, 0.08)',
          }
        },
        containedPrimary: {
           '&:hover': {
              backgroundColor: '#3A9AE4' // Slightly darker hover for primary
           }
        }
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "#1B2E44",
          backgroundImage: 'none', // Ensure no gradient artifact if present before
          border: '1px solid rgba(255, 255, 255, 0.1)', // Subtle border for definition
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' // Add a default subtle shadow
        },
      },
    },
    MuiCard: { // Also style Card consistently
       styleOverrides: {
        root: {
          backgroundColor: "#1B2E44",
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }
       }
    },
     MuiTextField: {
      defaultProps: {
        variant: 'outlined', // Default to outlined
      },
      styleOverrides: {
         root: {
            '& .MuiOutlinedInput-root': {
               '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.23)', // Lighter default border
               },
               '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)', // Brighter border on hover
               },
               '&.Mui-focused fieldset': {
                  borderColor: '#42A5F5', // Primary color border when focused
               },
            },
            '& .MuiInputLabel-root': { // Style label
               color: '#A0B0C0',
            },
             '& .MuiInputLabel-root.Mui-focused': { // Style label when focused
               color: '#42A5F5',
            }
         }
      }
    },
    MuiLink: { // Style links
       styleOverrides: {
          root: {
             color: '#81D4FA', // Use secondary light blue for links
             textDecoration: 'none',
             '&:hover': {
                textDecoration: 'underline',
             }
          }
       }
    }
  },
});

const Navigation = () => {
  const { voter, logout } = useContext(VoterContext);

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Blockchain Voting
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="text" color="inherit" component={Link} to="/">
            Home
          </Button>
          {voter ? (
            <>
              <Button variant="text" color="inherit" component={Link} to="/create">
                Create
              </Button>
              <Button variant="text" color="inherit" component={Link} to="/polls">
                Polls
              </Button>
              <Button variant="text" color="inherit" component={Link} to="/election">
                Election
              </Button>
              <Button variant="text" color="inherit" component={Link} to="/profile">
                Profile
              </Button>
              <Button variant="text" color="inherit" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="text" color="inherit" component={Link} to="/login">
                Login
              </Button>
              <Button variant="text" color="inherit" component={Link} to="/register">
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

const App = () => (
  <ThemeProvider theme={customTheme}>
    <CssBaseline />
    <VoterProvider>
      <PollProvider>
        <Router>
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
                    <ElectionBallotPage pollId="election" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/poll/:pollId"
                element={
                  <ProtectedRoute>
                    <PollDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/election-details/:pollId"
                element={
                  <ProtectedRoute>
                    <ElectionDetailsPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Container>
        </Router>
      </PollProvider>
    </VoterProvider>
  </ThemeProvider>
);

export default App;
