// src/components/ProfilePage.js
import React, { useState, useContext, useEffect } from "react";
import { VoterContext } from "../context/VoterContext";
import { 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Alert, 
  Grid, 
  Divider,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from "@mui/material";
import { getUserProfile, updateUserProfile, changePassword } from "../api/api";

const ProfilePage = () => {
  const { voter, setVoter } = useContext(VoterContext);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    zip_code: ""
  });
  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!voter || !voter.voterId) return;
      
      setLoading(true);
      try {
        const userData = await getUserProfile(voter.voterId);
        setProfileData({
          name: userData.name || "",
          zip_code: userData.zip_code || ""
        });
      } catch (err) {
        setError("Failed to load profile data. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [voter]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const updatedProfile = await updateUserProfile(voter.voterId, profileData);
      
      // Update voter context with new data
      setVoter(prev => ({
        ...prev,
        name: updatedProfile.user.name,
        zip: updatedProfile.user.zip_code
      }));
      
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError("New passwords do not match.");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      await changePassword(voter.voterId, {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      });
      
      setPasswordData({
        old_password: "",
        new_password: "",
        confirm_password: ""
      });
      
      setOpenPasswordDialog(false);
      setSuccess("Password changed successfully!");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!voter) {
    return (
      <Paper elevation={3} sx={{ maxWidth: 600, margin: "auto", padding: 4, mt: 4 }}>
        <Typography variant="h5" align="center">
          Please log in to view your profile
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ maxWidth: 600, margin: "auto", padding: 4, mt: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        My Profile
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
      
      <Box component="form" onSubmit={handleProfileUpdate} sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Voter ID"
              value={voter.voterId}
              disabled
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={profileData.name}
              onChange={handleProfileChange}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Zip Code"
              name="zip_code"
              value={profileData.zip_code}
              onChange={handleProfileChange}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Update Profile"}
            </Button>
          </Grid>
        </Grid>
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <Box textAlign="center">
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => setOpenPasswordDialog(true)}
        >
          Change Password
        </Button>
      </Box>
      
      {/* Password Change Dialog */}
      <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)}>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please enter your current password and choose a new password.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            name="old_password"
            label="Current Password"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordData.old_password}
            onChange={handlePasswordChange}
          />
          <TextField
            margin="dense"
            name="new_password"
            label="New Password"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordData.new_password}
            onChange={handlePasswordChange}
          />
          <TextField
            margin="dense"
            name="confirm_password"
            label="Confirm New Password"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordData.confirm_password}
            onChange={handlePasswordChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPasswordDialog(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handlePasswordUpdate} 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Update Password"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ProfilePage;