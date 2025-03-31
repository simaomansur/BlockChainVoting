// src/components/ProtectedRoute.js
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { VoterContext } from "../context/VoterContext";
import { CircularProgress, Box } from "@mui/material";

const ProtectedRoute = ({ children }) => {
  const { voter, loading } = useContext(VoterContext);

  // While the voter data is still loading, show a spinner
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // If no voter data is available after loading, redirect to login
  if (!voter || !voter.voterId) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
