// src/components/LoginPage.js
import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { VoterContext } from "../context/VoterContext";
import { Paper, TextField, Button, Typography, Box, CircularProgress, Alert } from "@mui/material";
import { loginUser } from "../api/api";

const LoginPage = () => {
  const { setVoter } = useContext(VoterContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // Call API to login user
      const response = await loginUser({ 
        email, 
        password 
      });
      
      // Save voter info in context
      setVoter({
        voterId: response.user.voter_id,
        name: response.user.name,
        zip: response.user.zip_code,
        birthdate: response.user.birth_date
      });
      
      // Redirect to home
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ maxWidth: 400, margin: "auto", padding: 4, mt: 4 }}>
      <Typography variant="h5" align="center" gutterBottom>
        Voter Login
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleLogin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Email"
          type="email"
          variant="outlined"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button 
          variant="contained" 
          color="primary" 
          type="submit" 
          disabled={loading}
          sx={{ mt: 1 }}
        >
          {loading ? <CircularProgress size={24} /> : "Login"}
        </Button>
        
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2">
            Don't have an account?{" "}
            <Link to="/register" style={{ textDecoration: "none", color: "primary" }}>
              Register here
            </Link>
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default LoginPage;