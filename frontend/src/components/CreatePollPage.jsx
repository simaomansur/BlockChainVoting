// src/components/CreatePollPage.jsx
import React, { useState, useContext } from "react";
import { createPoll } from "../api/api";
import { VoterContext } from "../context/VoterContext";
import { TextField, Button, Typography, Grid, Paper, Checkbox, FormControlLabel, Alert } from "@mui/material";

const CreatePollPage = () => {
  const { voter } = useContext(VoterContext);
  const [pollData, setPollData] = useState({
    title: "",
    question: "",
    options: "",
    is_public: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [createdPollId, setCreatedPollId] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPollData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    setPollData((prev) => ({ ...prev, is_public: e.target.checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pollData.title || !pollData.question || !pollData.options) {
      setError("All fields are required.");
      return;
    }
    if (!voter || !voter.voterId) {
      setError("Voter ID is missing. Please log in.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const formattedPollData = {
        ...pollData,
        options: pollData.options.split(",").map((opt) => opt.trim()),
      };
      const response = await createPoll(formattedPollData);
      setSuccess("Poll created successfully!");
      setCreatedPollId(response.poll_id); // Store the generated poll ID from response
      setPollData({ title: "", question: "", options: "", is_public: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        maxWidth: 600,
        margin: "auto",
        padding: 4,
        mt: 4,
        borderRadius: 2,
      }}
    >
      <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700 }}>
        Create a New Poll
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2, backgroundColor: "rgba(255,0,0,0.1)", color: "#FFFFFF" }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2, backgroundColor: "rgba(0,255,0,0.1)", color: "#FFFFFF" }}>
          {success}
          {createdPollId && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Poll ID: <strong>{createdPollId}</strong> (Save this ID to access your poll)
            </Typography>
          )}
        </Alert>
      )}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Poll Title"
              name="title"
              value={pollData.title}
              onChange={handleChange}
              sx={{ "& .MuiInputLabel-root": { color: "#B0BEC5" } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Poll Question"
              name="question"
              value={pollData.question}
              onChange={handleChange}
              sx={{ "& .MuiInputLabel-root": { color: "#B0BEC5" } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Options (comma-separated)"
              name="options"
              value={pollData.options}
              onChange={handleChange}
              sx={{ "& .MuiInputLabel-root": { color: "#B0BEC5" } }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={pollData.is_public}
                  onChange={handleCheckboxChange}
                  color="primary"
                  sx={{
                    color: "#B0BEC5",
                    "&.Mui-checked": { color: "#2196F3" },
                  }}
                />
              }
              label="Public Poll"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                backgroundColor: "#2196F3",
                color: "#000000",
                fontWeight: 600,
                borderRadius: 2,
                ":hover": { backgroundColor: "#64B5F6" },
              }}
            >
              {loading ? "Creating..." : "Create Poll"}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default CreatePollPage;