// src/components/LoginPage.js
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { VoterContext } from "../context/VoterContext";
import { Paper, TextField, Button, Typography, Box, CircularProgress } from "@mui/material";

const LoginPage = () => {
  const { setVoter } = useContext(VoterContext);
  const [name, setName] = useState("");
  const [zip, setZip] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate a verification delay (e.g., 2 seconds)
    setTimeout(() => {
      // Generate a fake voter ID.
      const voterId = `voter-${Math.floor(Math.random() * 10000)}`;
      // Save voter info in context.
      setVoter({ voterId, name, zip, birthdate });
      setLoading(false);
      // Redirect to home.
      navigate("/");
    }, 2000);
  };

  return (
    <Paper sx={{ maxWidth: 400, margin: "auto", padding: 4, mt: 4 }}>
      <Typography variant="h5" align="center" gutterBottom>
        Voter Login
      </Typography>
      <Box component="form" onSubmit={handleLogin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Name"
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextField
          label="Zip Code"
          variant="outlined"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          required
        />
        <TextField
          label="Birthdate"
          variant="outlined"
          value={birthdate}
          onChange={(e) => setBirthdate(e.target.value)}
          required
        />
        <Button variant="contained" color="primary" type="submit" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Login"}
        </Button>
      </Box>
    </Paper>
  );
};

export default LoginPage;
