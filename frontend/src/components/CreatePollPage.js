import React, { useState } from "react";
import { createPoll } from "../api/api";
import {
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  Checkbox,
  FormControlLabel,
  Alert,
} from "@mui/material";

const CreatePollPage = () => {
  const [pollData, setPollData] = useState({
    poll_id: "",
    title: "",
    question: "",
    options: "",
    is_public: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPollData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    setPollData((prev) => ({ ...prev, is_public: e.target.checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pollData.poll_id || !pollData.title || !pollData.question || !pollData.options) {
      setError("All fields are required.");
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

      await createPoll(formattedPollData);
      setSuccess("Poll created successfully!");
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
