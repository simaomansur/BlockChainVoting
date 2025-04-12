// src/components/ElectionVoteDetails.jsx
import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Button
} from "@mui/material";
import ReactApexChart from "react-apexcharts";
import { VoterContext } from "../context/VoterContext";
import {
  getVoteCounts,
  getPollDetails
} from "../api/api";

const ElectionVoteDetails = ({ pollId = "election" }) => {
  const params = useParams();
  // Use the pollId from props or from URL params
  const electionId = params.pollId || pollId;
  const { voter } = useContext(VoterContext);

  // State management
  const [loading, setLoading] = useState(true);
  const [election, setElection] = useState(null);
  const [voteCounts, setVoteCounts] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [electionId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch poll details and vote counts in parallel
      const [pollData, countsData] = await Promise.all([
        getPollDetails(electionId),
        getVoteCounts(electionId)
      ]);

      // Set data to state
      setElection(pollData);
      
      if (countsData && countsData.vote_counts) {
        setVoteCounts(countsData.vote_counts);
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching election data:", err);
      setError("Failed to load election data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Format contest name for display
  const formatContestName = (contest) => {
    return contest === "default_choice" 
      ? "General Vote" 
      : contest.charAt(0).toUpperCase() + contest.slice(1);
  };

  // Prepare chart data for a single contest
  const prepareChartData = (contest, candidates) => {
    if (!candidates) return { series: [], labels: [] };
    
    const entries = Object.entries(candidates);
    const series = entries.map(([_, count]) => count);
    const labels = entries.map(([candidate, _]) => candidate);
    
    return { series, labels };
  };

  // Donut chart options
  const getChartOptions = (labels) => ({
    chart: {
      type: "donut",
      background: "transparent",
    },
    labels,
    legend: {
      position: "bottom",
      labels: { colors: "#FFFFFF" },
    },
    dataLabels: { 
      enabled: true,
      formatter: (val) => `${Math.round(val)}%`
    },
    tooltip: { theme: "dark" },
    colors: [
      "#F44336", // Red
      "#2196F3", // Blue
      "#4CAF50", // Green
      "#FF9800", // Orange
      "#9C27B0", // Purple
      "#00BCD4", // Cyan
    ],
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
        },
      },
    },
  });

  return (
    <Paper elevation={3} sx={{ maxWidth: 900, margin: "auto", padding: 4, mt: 4, mb: 4 }}>
      <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700 }}>
        Election Vote Details
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Refresh Button */}
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Button 
          variant="contained" 
          onClick={fetchData}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </Button>
        {lastUpdated && (
          <Typography variant="caption" display="block" sx={{ mt: 1, color: "text.secondary" }}>
            Last updated: {lastUpdated.toLocaleString()}
          </Typography>
        )}
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Vote Charts Section */}
          <Box>
            <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
              Vote Distribution
            </Typography>
            
            {voteCounts && Object.keys(voteCounts).length > 0 ? (
              <Grid container spacing={3}>
                {Object.entries(voteCounts).map(([contest, candidates]) => {
                  const { series, labels } = prepareChartData(contest, candidates);
                  return (
                    <Grid item xs={12} md={6} key={contest}>
                      <Card sx={{ backgroundColor: "#1B2E44" }}>
                        <CardContent>
                          <Typography variant="h6" align="center" gutterBottom>
                            {formatContestName(contest)}
                          </Typography>
                          
                          {series.length > 0 ? (
                            <ReactApexChart 
                              options={getChartOptions(labels)}
                              series={series}
                              type="donut"
                              height={300}
                            />
                          ) : (
                            <Typography align="center" sx={{ py: 4, color: "text.secondary" }}>
                              No votes recorded
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Alert severity="info">
                No votes have been recorded for this election yet.
              </Alert>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
};

export default ElectionVoteDetails;