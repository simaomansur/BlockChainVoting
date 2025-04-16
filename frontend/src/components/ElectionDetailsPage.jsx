// src/components/ElectionDetailsPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Paper,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  Divider,
  Tab,
  Tabs
} from "@mui/material";
import ReactApexChart from "react-apexcharts";
import { VoterContext } from "../context/VoterContext";
import {
  getPollDetails,
  getVoteCounts,
  getVoteVerification,
  getBlockchain
} from "../api/api";

const ElectionDetailsPage = () => {
  const { pollId } = useParams();
  const { voter } = useContext(VoterContext);
  const navigate = useNavigate();

  // State variables
  const [election, setElection] = useState(null);
  const [voteCounts, setVoteCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blockchain, setBlockchain] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [chartData, setChartData] = useState({
    categories: [],
    series: []
  });

  // Fetch all data about the election
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [pollData, countsData, verifyData, chainData] = await Promise.all([
          getPollDetails(pollId),
          getVoteCounts(pollId),
          voter?.voterId ? getVoteVerification(pollId, voter.voterId) : Promise.resolve(null),
          getBlockchain(pollId)
        ]);

        setElection(pollData);
        setBlockchain(chainData);

        if (countsData && countsData.vote_counts) {
          setVoteCounts(countsData.vote_counts);
          processChartData(countsData.vote_counts);
        }
      } catch (err) {
        console.error("Error fetching election data:", err);
        setError("Failed to load election data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pollId, voter]);

  // Process vote counts into chart-friendly format
  const processChartData = (counts) => {
    // For bar chart data
    const contests = Object.keys(counts);
    const seriesData = [];

    contests.forEach(contest => {
      const candidates = Object.keys(counts[contest]);
      const candidateData = {};

      candidates.forEach(candidate => {
        if (!candidateData[candidate]) {
          candidateData[candidate] = [];
        }

        // Fill array with zeros for all contests
        contests.forEach(() => {
          candidateData[candidate].push(0);
        });

        // Set the actual value for this contest
        const contestIndex = contests.indexOf(contest);
        candidateData[candidate][contestIndex] = counts[contest][candidate];
      });

      // Create series data for ApexCharts
      Object.keys(candidateData).forEach(candidate => {
        seriesData.push({
          name: candidate,
          data: candidateData[candidate]
        });
      });
    });

    setChartData({
      categories: contests,
      series: seriesData
    });
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  // ApexCharts options for Bar Chart
  const barChartOptions = {
    chart: {
      type: 'bar',
      height: 350,
      stacked: true,
      background: 'transparent',
      toolbar: {
        show: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%'
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: chartData.categories,
      labels: {
        style: {
          colors: '#FFFFFF'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Number of Votes',
        style: {
          color: '#FFFFFF'
        }
      },
      labels: {
        style: {
          colors: '#FFFFFF'
        }
      }
    },
    legend: {
      position: 'bottom',
      labels: {
        colors: '#FFFFFF'
      }
    },
    theme: {
      mode: 'dark'
    },
    colors: ['#2196F3', '#F44336', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4']
  };

  // ApexCharts options for Pie Chart
  const getPieChartOptions = (contest) => ({
    chart: {
      type: 'pie',
      background: 'transparent',
      toolbar: {
        show: false
      }
    },
    labels: Object.keys(voteCounts[contest] || {}),
    legend: {
      position: 'bottom',
      labels: {
        colors: '#FFFFFF'
      }
    },
    dataLabels: {
      style: {
        colors: ['#000000']
      }
    },
    colors: ['#2196F3', '#F44336', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4'],
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 250
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  });

  // Format contest name for display
  const formatContestName = (contest) => {
    return contest.charAt(0).toUpperCase() + contest.slice(1).replace(/_/g, ' ');
  };

  // Navigate to ballot page
  const goToBallot = () => {
    navigate(`/election`);
  };

  return (
    <Paper elevation={3} sx={{ maxWidth: 800, margin: "auto", padding: 4, mt: 4, mb: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Election Results
      </Typography>
      <Typography variant="subtitle1" align="center" gutterBottom>
        Poll ID: {pollId || "Unknown"}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Election Summary */}
          <Box sx={{ mb: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {election?.title || "Election Results"}
                </Typography>
                <Typography variant="body2">
                  {election?.question || "Voting results for all contests"}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Total blocks: {blockchain.length} | 
                  Total contests: {Object.keys(voteCounts).length}
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  sx={{ mt: 2 }}
                  onClick={goToBallot}
                >
                  Cast Your Vote
                </Button>
              </CardContent>
            </Card>
          </Box>

          {/* Tabs for different chart views */}
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            centered
            sx={{ mb: 3 }}
          >
            <Tab label="Overall Results" />
            <Tab label="By Contest" />
          </Tabs>

          {/* Tab Content */}
          {tabIndex === 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                All Contests Overview
              </Typography>
              {chartData.series.length > 0 ? (
                <ReactApexChart
                  options={barChartOptions}
                  series={chartData.series}
                  type="bar"
                  height={350}
                />
              ) : (
                <Alert severity="info">No voting data available yet.</Alert>
              )}
            </Box>
          )}

          {tabIndex === 1 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Results by Individual Contest
              </Typography>
              <Grid container spacing={3}>
                {Object.keys(voteCounts).map((contest) => (
                  <Grid item xs={12} md={6} key={contest}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          {formatContestName(contest)}
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        {Object.keys(voteCounts[contest]).length > 0 ? (
                          <ReactApexChart
                            options={getPieChartOptions(contest)}
                            series={Object.values(voteCounts[contest])}
                            type="pie"
                            height={250}
                          />
                        ) : (
                          <Typography variant="body2">No votes recorded</Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Blockchain Summary */}
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            Blockchain Transactions
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              Latest Block: {blockchain.length > 0 ? 
                `#${blockchain[blockchain.length - 1]?.index || "N/A"} - 
                ${new Date(blockchain[blockchain.length - 1]?.timestamp || 0).toLocaleString()}` : 
                "No blocks"}
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              sx={{ mt: 2 }}
              onClick={() => navigate(`/poll/${pollId}`)}
            >
              View Blockchain Details
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default ElectionDetailsPage;