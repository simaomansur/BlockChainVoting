import React, { useState, useEffect } from "react";
import { createPoll } from "../api/api";
import {
  TextField,
  Button,
  Typography,
  Grid,
  Paper,
  Checkbox,
  FormControlLabel,
  Alert,
} from "@mui/material";

const CreatePollPage = () => {
  const [pollData, setPollData] = useState({
    poll_id: "", // Optionally auto-generate or allow input
    title: "",
    question: "",
    options: "",
    is_public: true,
  });
  const [voterId, setVoterId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // On mount, load the voter ID from localStorage.
  useEffect(() => {
    const storedVoterId = localStorage.getItem("voterId");
    if (storedVoterId) {
      setVoterId(storedVoterId);
    } else {
      setError("No voter ID found. Please log in first.");
      // Optionally, you could redirect the user to the login page here.
    }
  }, []);

  // Handle text field changes.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setPollData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle the checkbox change.
  const handleCheckboxChange = (e) => {
    setPollData((prev) => ({ ...prev, is_public: e.target.checked }));
  };

  // Handle form submission.
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Ensure all fields are filled in.
    if (!pollData.poll_id || !pollData.title || !pollData.question || !pollData.options) {
      setError("All fields are required.");
      return;
    }
    if (!voterId) {
      setError("Voter ID is missing. Please log in.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Format the options from a comma-separated string to an array.
      const formattedPollData = {
        ...pollData,
        options: pollData.options.split(",").map((opt) => opt.trim()),
      };

      await createPoll(formattedPollData);
      setSuccess("Poll created successfully!");
      // Clear the form (poll_id might be auto-generated in a future revision).
      setPollData({
        poll_id: "",
        title: "",
        question: "",
        options: "",
        is_public: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ maxWidth: 600, margin: "auto", padding: 4, mt: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Create a New Poll
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {/* Display the voter ID from localStorage */}
            <TextField
              fullWidth
              label="Voter ID"
              value={voterId}
              disabled
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Poll ID"
              name="poll_id"
              value={pollData.poll_id}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Poll Title"
              name="title"
              value={pollData.title}
              onChange={handleChange}
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
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Options (comma-separated)"
              name="options"
              value={pollData.options}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={pollData.is_public}
                  onChange={handleCheckboxChange}
                  name="is_public"
                  color="primary"
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
              color="primary"
              disabled={loading}
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
