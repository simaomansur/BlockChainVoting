// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { VoterProvider } from "./context/VoterContext";
import HomePage from "./components/HomePage";
import LoginPage from "./components/LoginPage";
import CreatePollPage from "./components/CreatePollPage";
import ExistingPollsPage from "./components/ExistingPollsPage";
import VotePage from "./components/VotePage";
import ElectionBallotPage from "./components/ElectionBallotPage";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <VoterProvider>
      <Router>
        <div>
          {/* Navigation Bar */}
          <nav style={{ display: "flex", justifyContent: "space-around", backgroundColor: "#333", padding: "10px" }}>
            <Link to="/" style={{ color: "white", textDecoration: "none", fontSize: "18px" }}>Home</Link>
            <Link to="/create" style={{ color: "white", textDecoration: "none", fontSize: "18px" }}>Create Poll</Link>
            <Link to="/polls" style={{ color: "white", textDecoration: "none", fontSize: "18px" }}>View Polls</Link>
            <Link to="/election" style={{ color: "white", textDecoration: "none", fontSize: "18px" }}>Election Ballot</Link>
          </nav>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
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
              path="/vote/:poll_id"
              element={
                <ProtectedRoute>
                  <VotePage />
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
          </Routes>
        </div>
      </Router>
    </VoterProvider>
  );
};

export default App;
