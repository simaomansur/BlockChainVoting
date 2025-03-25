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

// New libraries for effects
import Confetti from "react-confetti";
import { QRCodeCanvas } from "qrcode.react";

// API calls
import {
  castVote,
  getPollDetails,
  getVoteCounts,
  getVoteVerification,
} from "../api/api";

const PollDetailsPage = () => {
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
  const [hasVoted, setHasVoted] = useState(false);

  // Fetch poll details and vote counts (and optionally verify vote)
  useEffect(() => {
    const fetchAllData = async () => {
      setLoadingPoll(true);
      setError(null);
      try {
        const userId = voter?.voterId;
        // Fetch poll details and vote counts; if user is logged in, also check if they've voted
        const [pollData, countsData, verifyData] = await Promise.all([
          getPollDetails(pollId),
          getVoteCounts(pollId),
          userId ? getVoteVerification(pollId, userId) : Promise.resolve(null),
        ]);

        if (!pollData || !pollData.options) {
          throw new Error("Poll not found or missing options.");
        }
        setPoll(pollData);

        if (countsData && countsData.vote_counts) {
          setVoteCounts(countsData.vote_counts);
          const formatted = Object.entries(countsData.vote_counts).map(
            ([option, count], idx) => ({
              id: idx,
              label: option,
              value: count,
            })
          );
          setChartData(formatted);
        }

        if (verifyData && verifyData.hasVoted) {
          setHasVoted(true);
        }
      } catch (err) {
        setError(err.message || "Error fetching poll data.");
      } finally {
        setLoadingPoll(false);
      }
    };

    fetchAllData();
  }, [pollId, voter]);

  // Handle vote submission
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
      await castVote({
        poll_id: pollId,
        voter_id: voter.voterId,
        vote: selectedChoice,
      });
      setSuccess("Vote submitted successfully!");
      const countsData = await getVoteCounts(pollId);
      if (countsData && countsData.vote_counts) {
        setVoteCounts(countsData.vote_counts);
        const formatted = Object.entries(countsData.vote_counts).map(
          ([option, count], idx) => ({
            id: idx,
            label: option,
            value: count,
          })
        );
        setChartData(formatted);
      }
      setHasVoted(true);
    } catch (err) {
      setError(err.message || "Error submitting vote.");
    } finally {
      setLoadingVote(false);
    }
  };

  const totalVotes = chartData.reduce((acc, item) => acc + item.value, 0);
  const pollUrl = `${window.location.origin}/poll/${pollId}`;
  const showConfetti = success !== null && success !== undefined;

  return (
    <Card
      elevation={10}
      sx={{
        maxWidth: 650,
        margin: "auto",
        mt: 3,
        borderRadius: 3,
        overflow: "hidden",
        background:
          "linear-gradient(135deg, rgba(13,71,161,0.7) 0%, rgba(21,101,192,0.7) 100%)",
        color: "#fff",
        position: "relative",
      }}
    >
      {showConfetti && <Confetti recycle={false} numberOfPieces={300} />}
      <CardContent sx={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.3)", p: 3 }}>
        <Typography variant="h4" align="center" gutterBottom>
          {poll ? poll.title : "Loading Poll..."}
        </Typography>
        {poll && (
          <Box textAlign="center" mb={2}>
            <Typography variant="caption" sx={{ color: "#ddd" }}>
              Poll ID: {poll.poll_id || pollId}
            </Typography>
            {poll.createdAt && (
              <Typography variant="caption" sx={{ ml: 1, color: "#ddd" }}>
                | Created on: {new Date(poll.createdAt).toLocaleDateString("en-US")}
              </Typography>
            )}
          </Box>
        )}
        {loadingPoll && (
          <Box display="flex" justifyContent="center" my={2}>
            <CircularProgress size={24} sx={{ color: "#fff" }} />
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {poll && poll.options && !loadingPoll && (
          <>
            <Typography variant="h6" gutterBottom>
              {poll.question}
            </Typography>
            {poll.description && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                {poll.description}
              </Typography>
            )}
            <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.2)" }} />
            {hasVoted && (
              <Alert severity="info" sx={{ mb: 2 }}>
                You have already voted in this poll.
              </Alert>
            )}
            {!hasVoted && (
              <form onSubmit={handleVoteSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Voter ID"
                      value={voter?.voterId || ""}
                      disabled
                      sx={{
                        input: { color: "#fff" },
                        "& .Mui-disabled": { WebkitTextFillColor: "#ccc" },
                        "& .MuiInputLabel-root": { color: "#ccc" },
                      }}
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
                          control={<Radio size="small" sx={{ color: "#fff" }} />}
                          label={
                            <Typography variant="body2" sx={{ color: "#fff" }}>
                              {option}
                            </Typography>
                          }
                        />
                      ))}
                    </RadioGroup>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      disabled={loadingVote}
                      size="medium"
                      sx={{
                        background: "linear-gradient(90deg, #0D47A1, #1565C0)",
                        ":hover": {
                          boxShadow: "0px 4px 12px rgba(255,255,255,0.3)",
                          background: "linear-gradient(90deg, #0D47A1, #1565C0)",
                        },
                      }}
                    >
                      {loadingVote ? "Submitting..." : "Submit Vote"}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            )}
            <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.2)" }} />
            {Object.keys(voteCounts).length > 0 ? (
              <Box textAlign="center">
                <Typography variant="h6" gutterBottom>
                  Current Results
                </Typography>
                <PieChart
                  series={[
                    {
                      data: chartData,
                      innerRadius: 60,
                      arcLabel: (item) => `${item.label}: ${item.value}`,
                    },
                  ]}
                  width={320}
                  height={320}
                  sx={{ margin: "0 auto" }}
                />
                <Typography variant="body1" sx={{ mt: 1 }}>
                  Total Votes: {totalVotes}
                </Typography>
                <Box sx={{ mt: 2, textAlign: "left", px: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Detailed Breakdown
                  </Typography>
                  {chartData.map((item) => {
                    const percentage =
                      totalVotes > 0 ? Math.round((item.value / totalVotes) * 100) : 0;
                    return (
                      <Box key={item.id} sx={{ mb: 1 }}>
                        <Typography variant="caption" sx={{ color: "#eee" }}>
                          {item.label}: {item.value} votes ({percentage}%)
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            mt: 0.5,
                            backgroundColor: "rgba(255,255,255,0.1)",
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: "#FFD700",
                            },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ) : (
              <Box mt={2}>
                <Typography variant="body1" align="center">
                  No votes recorded yet.
                </Typography>
              </Box>
            )}
            <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.2)" }} />
            <Box mt={1} textAlign="center">
              <Typography variant="subtitle2" gutterBottom>
                Share This Poll
              </Typography>
              <QRCodeCanvas value={pollUrl} size={100} includeMargin={true} />
              <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                {pollUrl}
              </Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PollDetailsPage;
