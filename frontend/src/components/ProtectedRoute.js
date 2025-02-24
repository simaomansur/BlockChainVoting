// src/components/ProtectedRoute.js
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { VoterContext } from "../context/VoterContext";

const ProtectedRoute = ({ children }) => {
  const { voter } = useContext(VoterContext);
  if (!voter || !voter.voterId) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
