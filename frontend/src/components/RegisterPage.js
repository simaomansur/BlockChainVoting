// src/components/RegisterPage.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Paper, TextField, Button, Typography, Box, CircularProgress, Alert } from "@mui/material";
import { registerUser, checkEmailExists } from "../api/api";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    zip_code: "",
    birth_date: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailError, setEmailError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    
    // Clear email error when user changes the email
    if (name === "email") {
      setEmailError("");
    }
  };

  // Check if email already exists when email field loses focus
  const handleEmailBlur = async () => {
    const email = formData.email.trim();
    if (email && email.includes('@')) {
      setEmailChecking(true);
      try {
        console.log("Checking email:", email); // Debug log
        const response = await checkEmailExists(email);
        console.log("Email check response:", response); // Debug log
        
        if (response && response.exists) {
          setEmailError("This email is already registered");
        } else {
          setEmailError("");
        }
      } catch (err) {
        console.error("Failed to check email:", err);
        // Don't set an error message for the email field on API error
        // This allows the form submission to proceed and handle the error there
      } finally {
        setEmailChecking(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Check if email has error
    if (emailError) {
      setError(emailError);
      setLoading(false);
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // Don't do another email check here - if the backend has email uniqueness validation,
      // it will catch duplicates and return an error

      // Prepare registration data
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        zip_code: formData.zip_code,
        birth_date: formData.birth_date
      };

      // Call API to register user
      const response = await registerUser(registrationData);
      
      // Show success message
      setSuccess(`Registration successful! Your voter ID is: ${response.voter_id}`);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      console.error("Registration error:", err);
      // Check if this is an email duplication error from backend
      if (err.response?.data?.error?.includes("Email already registered")) {
        setEmailError("This email is already registered");
      }
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ maxWidth: 500, margin: "auto", padding: 4, mt: 4 }}>
      <Typography variant="h5" align="center" gutterBottom>
        Voter Registration
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Full Name"
          name="name"
          variant="outlined"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          variant="outlined"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleEmailBlur}
          required
          error={!!emailError}
          helperText={emailChecking ? "Checking email..." : emailError}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          variant="outlined"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <TextField
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          variant="outlined"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />
        <TextField
          label="Zip Code"
          name="zip_code"
          variant="outlined"
          value={formData.zip_code}
          onChange={handleChange}
          required
        />
        <TextField
          label="Birth Date (YYYY-MM-DD)"
          name="birth_date"
          variant="outlined"
          placeholder="YYYY-MM-DD"
          value={formData.birth_date}
          onChange={handleChange}
          required
        />
        <Button 
          variant="contained" 
          color="primary" 
          type="submit" 
          disabled={loading || emailChecking}
          sx={{ mt: 1 }}
        >
          {loading ? <CircularProgress size={24} /> : "Register"}
        </Button>
        
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2">
            Already have an account?{" "}
            <Link to="/login" style={{ textDecoration: "none", color: "primary" }}>
              Login here
            </Link>
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default RegisterPage;