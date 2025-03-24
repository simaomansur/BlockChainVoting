// src/components/PollDetailsPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { VoterContext } from "../context/VoterContext";
import {
  Paper,
  Typography,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Box,
} from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { castVote, getPollDetails, getVoteCounts } from "../api/api";

const PollDetailsPage = () => {
  // The route param is named "pollId" in App.js: "/poll/:pollId"
  const { pollId } = useParams();
  const { voter } = useContext(VoterContext);

  const [poll, setPoll] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState("");
  const [voteCounts, setVoteCounts] = useState({});
  const [chartData, setChartData] = useState([]);
  const [loadingPoll, setLoadingPoll] = useState(true);
  const [loadingVote, setLoadingVote] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // 1) On mount, fetch poll details + existing counts
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1A) Get the poll details
        const pollData = await getPollDetails(pollId);
        if (!pollData || !pollData.options) {
          throw new Error("Poll not found or missing options.");
        }
        setPoll(pollData);

        // 1B) Get the current vote counts
        const counts = await getVoteCounts(pollId);
        if (counts && counts.vote_counts) {
          setVoteCounts(counts.vote_counts);

          // Transform { "Rust": 10, "Python": 5 } into
          // [ { id: 0, label: "Rust", value: 10 }, ... ]
          const formatted = Object.entries(counts.vote_counts).map(
            ([option, count], idx) => ({
              id: idx,
              label: option,
              value: count,
            })
          );
          setChartData(formatted);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingPoll(false);
      }
    };

    fetchData();
  }, [pollId]);

  // 2) Submit a vote
  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChoice || !voter?.voterId) {
      setError("No choice selected or missing voter ID.");
      return;
    }

    setLoadingVote(true);
    setError(null);
    setSuccess(null);

    try {
      // The backend expects "poll_id", "voter_id", and "vote"
      await castVote({
        poll_id: pollId,        // <-- fix: send poll_id, not pollId
        voter_id: voter.voterId,
        vote: selectedChoice,
      });

      setSuccess("Vote submitted successfully!");

      // Re-fetch updated counts
      const counts = await getVoteCounts(pollId);
      if (counts && counts.vote_counts) {
        setVoteCounts(counts.vote_counts);
        const formatted = Object.entries(counts.vote_counts).map(
          ([option, count], idx) => ({
            id: idx,
            label: option,
            value: count,
          })
        );
        setChartData(formatted);
      }
    } catch (err) {
      setError("Error submitting vote.");
    } finally {
      setLoadingVote(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ maxWidth: 700, margin: "auto", p: 4, mt: 4 }}>
      {/* Title */}
      <Typography variant="h4" align="center" gutterBottom>
        {poll ? poll.title : "Loading Poll..."}
      </Typography>

      {/* If still loading poll details */}
      {loadingPoll && (
        <Box display="flex" justifyContent="center" my={2}>
          <CircularProgress />
        </Box>
      )}

      {/* Error / success messages */}
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

      {/* Poll question + options */}
      {poll && poll.options && (
        <>
          <Typography variant="h6" gutterBottom>
            {poll.question}
          </Typography>
          <form onSubmit={handleVoteSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Voter ID"
                  value={voter?.voterId || ""}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <RadioGroup
                  value={selectedChoice}
                  onChange={(e) => setSelectedChoice(e.target.value)}
                >
                  {poll.options.map((option, idx) => (
                    <FormControlLabel
                      key={idx}
                      value={option}
                      control={<Radio />}
                      label={option}
                    />
                  ))}
                </RadioGroup>
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loadingVote}
                >
                  {loadingVote ? "Submitting..." : "Submit Vote"}
                </Button>
              </Grid>
            </Grid>
          </form>
        </>
      )}

      {/* Show current results as a PieChart */}
      {Object.keys(voteCounts).length > 0 && (
        <Box mt={4} textAlign="center">
          <Typography variant="h5" gutterBottom>
            Current Results
          </Typography>
          <PieChart
            series={[
              {
                data: chartData,
                // optional "donut" effect
                innerRadius: 60,
                arcLabel: (item) => `${item.label}: ${item.value}`,
              },
            ]}
            width={400}
            height={400}
          />
        </Box>
      )}

      {/* If we have loaded the poll but no votes exist */}
      {!loadingPoll && Object.keys(voteCounts).length === 0 && (
        <Box mt={4}>
          <Typography variant="h6" align="center">
            No votes recorded yet.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default PollDetailsPage;
