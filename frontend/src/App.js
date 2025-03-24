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

// IMPORTANT: Rename the import so it matches the actual file name
import PollDetailsPage from "./components/PollDetailsPage";

import ProtectedRoute from "./components/ProtectedRoute";
import { AppBar, Toolbar, Button, Typography, Box, Container } from "@mui/material";
import { VoterContext } from "./context/VoterContext";

// Navigation component with conditional rendering based on auth status
const Navigation = () => {
  const { voter, logout } = useContext(VoterContext);

  return (
    <AppBar position="static">
      <Toolbar>
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
  );
};

export default App;
