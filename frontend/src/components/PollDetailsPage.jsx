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
} from "@mui/material";
import ReactApexChart from "react-apexcharts";
import Confetti from "react-confetti";
import { QRCodeCanvas } from "qrcode.react";

import {
  castVote,
  getPollDetails,
  getVoteCounts,
  getVoteVerification,
  getBlockchain,
} from "../api/api";

const truncateHash = (hash) => {
  if (!hash || hash.length < 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
};

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

  // Store the entire blockchain for this poll
  const [blockchain, setBlockchain] = useState([]);

  // Fetch poll details, counts, verification, and chain
  useEffect(() => {
    const fetchAllData = async () => {
      setLoadingPoll(true);
      setError(null);

      try {
        const userId = voter?.voterId;
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

        // Fetch chain for the Blockchain Explorer
        const chain = await getBlockchain(pollId);
        if (Array.isArray(chain)) {
          setBlockchain(chain);
        }
      } catch (err) {
        setError(err.message || "Error fetching poll data.");
      } finally {
        setLoadingPoll(false);
      }
    };

    fetchAllData();
  }, [pollId, voter]);

  // Re-fetch the chain after each vote
  const refreshChain = async () => {
    try {
      const chain = await getBlockchain(pollId);
      if (Array.isArray(chain)) {
        setBlockchain(chain);
      }
    } catch (err) {
      console.error("Failed to refresh blockchain:", err);
    }
  };

  // Submit vote
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

      // Refresh counts
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
      // Refresh chain to show the new block
      await refreshChain();
    } catch (err) {
      setError(err.message || "Error submitting vote.");
    } finally {
      setLoadingVote(false);
    }
  };

  const pollUrl = `${window.location.origin}/poll/${pollId}`;
  const showConfetti = !!success;

  // Donut chart with vibrant color palette, no center label
  const chartOptions = {
    chart: {
      type: "donut",
      background: "transparent",
      toolbar: { show: false },
    },
    // Label each slice by poll option
    labels: chartData.map((item) => item.label),
    legend: {
      position: "bottom",
      labels: { colors: "#FFFFFF" },
      fontSize: "12px",
    },
    dataLabels: { enabled: false },
    stroke: { show: false },
    tooltip: { theme: "dark" },
    fill: { type: "solid" },
    colors: [
      "#F44336", // Red
      "#E91E63", // Pink
      "#9C27B0", // Purple
      "#673AB7", // Deep Purple
      "#3F51B5", // Indigo
      "#2196F3", // Blue
      "#4CAF50", // Green
      "#FF9800", // Orange
    ],
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: false, // Hide center number
          },
        },
      },
    },
  };

  return (
    <Box sx={{ mt: 4, p: 2 }}>
      {showConfetti && (
        <Confetti
          recycle={false}
          numberOfPieces={300}
          colors={[
            "#F44336",
            "#E91E63",
            "#9C27B0",
            "#673AB7",
            "#3F51B5",
            "#2196F3",
            "#4CAF50",
            "#FF9800",
          ]}
        />
      )}

      {/* Page Title */}
      <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700 }}>
        {poll ? poll.title : "Loading Poll..."}
      </Typography>

      {/* Poll Sub-info */}
      {poll && (
        <Box textAlign="center" mb={3}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Poll ID: {poll.poll_id || pollId}
          </Typography>
          {voter?.voterId && (
            <Typography variant="caption" sx={{ ml: 1, color: "text.secondary" }}>
              | Voter ID: {voter.voterId}
            </Typography>
          )}
          {poll.createdAt && (
            <Typography variant="caption" sx={{ ml: 1, color: "text.secondary" }}>
              | Created on: {new Date(poll.createdAt).toLocaleDateString("en-US")}
            </Typography>
          )}
        </Box>
      )}

      {loadingPoll && (
        <Box display="flex" justifyContent="center" my={2}>
          <CircularProgress size={24} sx={{ color: "#FFFFFF" }} />
        </Box>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: 4,
            backgroundColor: "rgba(255,0,0,0.1)",
            color: "#FFFFFF",
          }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{
            mb: 2,
            borderRadius: 4,
            backgroundColor: "rgba(0,255,0,0.1)",
            color: "#FFFFFF",
          }}
        >
          {success}
        </Alert>
      )}

      {/* Two half-width sections (Vote form + Chart) */}
      <Grid container spacing={3}>
        {/* Left: Vote form + QR */}
        <Grid item xs={12} md={6}>
          <Card
            variant="outlined"
            sx={{
              backgroundColor: "background.paper",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
            }}
          >
            <CardContent>
              {poll && poll.options && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                    {poll.question}
                  </Typography>
                  {poll.description && (
                    <Typography
                      variant="body2"
                      sx={{ mb: 2, color: "text.secondary", lineHeight: 1.6 }}
                    >
                      {poll.description}
                    </Typography>
                  )}

                  {hasVoted && (
                    <Alert
                      severity="info"
                      sx={{
                        mb: 2,
                        borderRadius: 4,
                        backgroundColor: "rgba(255,255,255,0.1)",
                        color: "#FFFFFF",
                      }}
                    >
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
                              input: { color: "#FFFFFF" },
                              "& .Mui-disabled": { WebkitTextFillColor: "#BCCCDC" },
                              "& .MuiInputLabel-root": { color: "#BCCCDC" },
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
                                control={
                                  <Radio
                                    size="small"
                                    sx={{
                                      color: "#BCCCDC",
                                      "&.Mui-checked": { color: "#2196F3" },
                                    }}
                                  />
                                }
                                label={
                                  <Typography variant="body2" sx={{ color: "#FFFFFF" }}>
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
                            sx={{
                              backgroundColor: "#2196F3",
                              color: "#FFFFFF",
                              fontWeight: 600,
                              borderRadius: 4,
                              ":hover": {
                                backgroundColor: "#448AFF",
                                boxShadow: "0px 4px 12px rgba(0,0,0,0.2)",
                              },
                            }}
                          >
                            {loadingVote ? "Submitting..." : "Submit Vote"}
                          </Button>
                        </Grid>
                      </Grid>
                    </form>
                  )}

                  <Divider
                    sx={{
                      my: 3,
                      borderColor: "rgba(255,255,255,0.2)",
                    }}
                  />
                  <Box textAlign="center">
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Share This Poll
                    </Typography>
                    <QRCodeCanvas value={pollUrl} size={100} includeMargin={true} />
                    <Typography
                      variant="caption"
                      sx={{ mt: 1, display: "block", color: "text.secondary" }}
                    >
                      {pollUrl}
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Donut chart results */}
        <Grid item xs={12} md={6}>
          <Card
            variant="outlined"
            sx={{
              backgroundColor: "background.paper",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
              height: "100%",
            }}
          >
            <CardContent
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" align="center" gutterBottom sx={{ fontWeight: 600 }}>
                Current Results
              </Typography>

              {Object.keys(voteCounts).length > 0 ? (
                <>
                  <ReactApexChart
                    options={chartOptions}
                    series={chartData.map((item) => item.value)}
                    type="donut"
                    width={280}
                    height={280}
                  />

                  {/* A simple grid for the final vote breakdown */}
                  <Box sx={{ mt: 2 }}>
                    <Grid container spacing={1} sx={{ justifyContent: "center" }}>
                      {chartData.map((item) => (
                        <Grid item xs={12} sm={6} key={item.id}>
                          <Typography
                            variant="body1"
                            sx={{ color: "#FFFFFF", textAlign: "center" }}
                          >
                            {item.label}: {item.value}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </>
              ) : (
                <Box mt={3}>
                  <Typography variant="body1" align="center" sx={{ color: "text.secondary" }}>
                    No votes recorded yet.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* BLOCKCHAIN EXPLORER */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          Blockchain Explorer
        </Typography>
        <Box
          sx={{
            display: "flex",
            overflowX: "auto",
            gap: 2,
            p: 1,
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 4,
          }}
        >
          {blockchain.length === 0 && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No blocks to display.
            </Typography>
          )}
          {blockchain.map((block, idx) => {
            // Check if this block contains the user's transaction
            const userHasTransaction = block.transactions.some((tx) => {
              if (!tx || typeof tx !== "object") return false;
              return tx.voter_id === voter?.voterId;
            });

            return (
              <Card
                key={idx}
                variant="outlined"
                sx={{
                  minWidth: 200,
                  backgroundColor: "background.paper",
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  flexShrink: 0,
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Block #{block.index}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {new Date(block.timestamp).toLocaleString("en-US")}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Hash: {truncateHash(block.hash)}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Prev: {truncateHash(block.previous_hash)}
                  </Typography>
                  {userHasTransaction ? (
                    <Typography variant="body2" sx={{ color: "#4CAF50" }}>
                      Your Block
                    </Typography>
                  ) : block.finalized ? (
                    <Typography variant="body2" sx={{ color: "#4CAF50" }}>
                      Finalized
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Not Finalized
                    </Typography>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default PollDetailsPage;
