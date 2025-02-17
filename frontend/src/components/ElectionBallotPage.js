import React, { useState, useEffect } from "react";
import { getPollDetails, submitVote } from "../api/api";
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
  Box,
} from "@mui/material";

const ElectionBallotPage = () => {
  const [election, setElection] = useState(null);
  const [voterId, setVoterId] = useState("");
  const [selectedVotes, setSelectedVotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingElection, setLoadingElection] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchElection = async () => {
      try {
        const electionData = await getPollDetails("election");
  
        // If electionData.options is an array of length 1 containing JSON, parse it:
        if (
          electionData &&
          Array.isArray(electionData.options) &&
          electionData.options.length > 0
        ) {
          const parsed = JSON.parse(electionData.options[0]); // convert JSON string -> object
          setElection({
            ...electionData,
            options: parsed, // replace the string array with the parsed object
          });
        } else {
          throw new Error("Election poll data is invalid or missing options.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingElection(false);
      }
    };
  
    fetchElection();
  }, []);  

  const handleVoteChange = (contest, choice) => {
    setSelectedVotes((prev) => ({ ...prev, [contest]: choice }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!voterId || Object.keys(selectedVotes).length === 0) {
      setError("Please enter your voter ID and select your choices.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await submitVote({
        poll_id: "election",
        voter_id: voterId,
        candidate: JSON.stringify(selectedVotes),
      });
      setSuccess("Election vote submitted successfully!");
    } catch (err) {
      setError("Error submitting election vote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ maxWidth: 800, margin: "auto", padding: 4, mt: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Election Ballot
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loadingElection ? (
        <Box display="flex" justifyContent="center" my={2}>
          <CircularProgress />
        </Box>
      ) : election ? (
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Enter Voter ID"
            value={voterId}
            onChange={(e) => setVoterId(e.target.value)}
            sx={{ mb: 3 }}
          />
          {Object.keys(election.options).map((contest) => (
            <Paper key={contest} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                {contest.charAt(0).toUpperCase() + contest.slice(1)}
              </Typography>
              {Array.isArray(election.options[contest]) ? (
                <RadioGroup
                  name={contest}
                  value={selectedVotes[contest] || ""}
                  onChange={(e) => handleVoteChange(contest, e.target.value)}
                >
                  {election.options[contest].map((choice) => (
                    <FormControlLabel
                      key={choice}
                      value={choice}
                      control={<Radio />}
                      label={choice}
                    />
                  ))}
                </RadioGroup>
              ) : (
                <Typography color="error">Invalid options for {contest}</Typography>
              )}
            </Paper>
          ))}
          <Button
            variant="contained"
            color="primary"
            type="submit"
            fullWidth
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Vote"}
          </Button>
        </form>
      ) : (
        <Typography>No election data available.</Typography>
      )}
    </Paper>
  );
};

export default ElectionBallotPage;
