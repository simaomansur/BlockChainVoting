// src/components/PollDetailsPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { VoterContext } from "../context/VoterContext";
import {
  Card,
  CardContent,
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
  Divider,
  LinearProgress,
} from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { castVote, getPollDetails, getVoteCounts } from "../api/api";

const PollDetailsPage = () => {
  // 1) Identical logic
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

  // 2) On mount, fetch poll details + existing counts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const pollData = await getPollDetails(pollId);
        if (!pollData || !pollData.options) {
          throw new Error("Poll not found or missing options.");
        }
        setPoll(pollData);

        const counts = await getVoteCounts(pollId);
        if (counts && counts.vote_counts) {
          setVoteCounts(counts.vote_counts);

          // Build chartData from vote_counts
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

  // 3) Submit a vote
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
        poll_id: pollId,
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

  // 4) Calculate total votes for display
  const totalVotes = chartData.reduce((acc, item) => acc + item.value, 0);

  return (
    <Card
      elevation={6}
      sx={{
        maxWidth: 800,
        margin: "auto",
        mt: 4,
        // For a more dramatic look, you can add a border or background
        borderRadius: 2,
      }}
    >
      <CardContent>
        {/* Title */}
        <Typography variant="h4" align="center" gutterBottom>
          {poll ? poll.title : "Loading Poll..."}
        </Typography>

        {/* Loading indicator */}
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

        {/* Poll content */}
        {poll && poll.options && !loadingPoll && (
          <>
            <Typography variant="h6" gutterBottom>
              {poll.question}
            </Typography>

            {/* Optional poll description (if exists) */}
            {poll.description && (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {poll.description}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Voting Form */}
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

            <Divider sx={{ my: 4 }} />

            {/* Current results */}
            {Object.keys(voteCounts).length > 0 ? (
              <Box textAlign="center">
                <Typography variant="h5" gutterBottom>
                  Current Results
                </Typography>
                <PieChart
                  series={[
                    {
                      data: chartData,
                      innerRadius: 70, // donut effect
                      arcLabel: (item) => `${item.label}: ${item.value}`,
                    },
                  ]}
                  width={400}
                  height={400}
                />

                {/* Show total votes */}
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Total Votes: {totalVotes}
                </Typography>

                {/* Detailed breakdown with progress bars */}
                <Box sx={{ mt: 3, textAlign: "left", px: { xs: 2, sm: 8 } }}>
                  <Typography variant="h6" gutterBottom>
                    Detailed Breakdown
                  </Typography>
                  {chartData.map((item) => {
                    // Calculate percentage (avoid divide-by-zero)
                    const percentage =
                      totalVotes > 0
                        ? Math.round((item.value / totalVotes) * 100)
                        : 0;

                    return (
                      <Box key={item.id} sx={{ mb: 2 }}>
                        <Typography variant="body1">
                          {item.label}: {item.value} votes ({percentage}%)
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          sx={{ height: 10, borderRadius: 5, mt: 1 }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ) : (
              // If we have loaded the poll but no votes exist
              <Box mt={4}>
                <Typography variant="h6" align="center">
                  No votes recorded yet.
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PollDetailsPage;
