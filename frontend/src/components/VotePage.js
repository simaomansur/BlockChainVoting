import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { submitVote, getPollDetails, getVoteCounts } from "../api/api";
import {
  Paper,
  Typography,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Grid,
  Box,
} from "@mui/material";

const VotePage = () => {
  const { poll_id } = useParams();
  const [poll, setPoll] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState("");
  const [voterId, setVoterId] = useState("");
  const [voteCounts, setVoteCounts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPoll, setLoadingPoll] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchPollDetails = async () => {
      try {
        const pollData = await getPollDetails(poll_id);
        if (!pollData || !pollData.options) {
          throw new Error("Poll not found or missing options.");
        }
        setPoll(pollData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingPoll(false);
      }
    };

    fetchPollDetails();
  }, [poll_id]);

  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChoice || !voterId) {
      setError("Please enter your voter ID and select a choice.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await submitVote({
        poll_id,
        voter_id: voterId,
        candidate: selectedChoice,
      });
      setSuccess("Vote submitted successfully!");

      // Fetch updated vote counts
      const counts = await getVoteCounts(poll_id);
      setVoteCounts(counts.vote_counts);
    } catch (err) {
      setError("Error submitting vote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ maxWidth: 600, margin: "auto", padding: 4, mt: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Vote in Poll: {poll ? poll.title : "Loading..."}
      </Typography>

      {loadingPoll && (
        <Box display="flex" justifyContent="center" my={2}>
          <CircularProgress />
        </Box>
      )}

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

      {poll && poll.options && (
        <form onSubmit={handleVoteSubmit}>
          < container spacing={2}>
            < item xs={12}>
              <TextField
                fullWidth
                label="Enter Voter ID"
                value={voterId}
                onChange={(e) => setVoterId(e.target.value)}
              />
            </item>
            <item xs={12}>
              <Typography variant="h6" gutterBottom>
                {poll.question}
              </Typography>
              <RadioGroup
                value={selectedChoice}
                onChange={(e) => setSelectedChoice(e.target.value)}
              >
                {poll.options.map((option, index) => (
                  <FormControlLabel
                    key={index}
                    value={option}
                    control={<Radio />}
                    label={option}
                  />
                ))}
              </RadioGroup>
            </item>
            <item xs={12}>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Vote"}
              </Button>
            </item>
          </container>
        </form>
      )}
      {voteCounts && Object.keys(voteCounts).length > 0 ? (
        <Box mt={4}>
          <Typography variant="h5" align="center">
            Live Vote Results
          </Typography>
          <List>
            {Object.entries(voteCounts).map(([candidate, count]) => (
              <ListItem key={candidate}>
                <ListItemText primary={`${candidate}: ${count} votes`} />
              </ListItem>
            ))}
          </List>
        </Box>
      ) : (
        <Box mt={4}>
          <Typography variant="h6" align="center">
            No votes yet.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default VotePage;
