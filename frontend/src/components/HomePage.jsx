// src/components/HomePage.jsx
import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  Button,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CircularProgress,
  Divider,
} from "@mui/material";
import { VoterContext } from "../context/VoterContext";
import { getTrendingPolls } from "../api/api";

const HomePage = () => {
  const navigate = useNavigate();
  const { voter, logout } = useContext(VoterContext);

  // State for trending polls
  const [trendingPolls, setTrendingPolls] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  // Fetch trending polls on component mount
  useEffect(() => {
    const fetchTrending = async () => {
      setLoadingTrending(true);
      try {
        // Expected shape: [{ poll_id, title, question, totalVotes }, ...]
        const polls = await getTrendingPolls();
        setTrendingPolls(polls);
      } catch (err) {
        console.error("Error fetching trending polls:", err);
      } finally {
        setLoadingTrending(false);
      }
    };
    fetchTrending();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Main Introduction */}
      <Box sx={{ textAlign: "center", mb: 5 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Welcome to the Blockchain Voting System
        </Typography>
        <Typography variant="subtitle1" sx={{ color: "text.secondary" }}>
          A secure, transparent, and decentralized platform for conducting polls and elections.
        </Typography>
      </Box>

      {/* User Session Info */}
      {voter ? (
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 4,
            backgroundColor: "background.paper",
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            Logged in as: <strong>{voter.name}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Voter ID: {voter.voterId}
          </Typography>
          <Button
            variant="outlined"
            color="secondary"
            onClick={logout}
            sx={{ mr: 1 }}
          >
            Logout
          </Button>
          <Button variant="outlined" onClick={() => navigate("/profile")}>
            My Profile
          </Button>
        </Paper>
      ) : (
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 4,
            backgroundColor: "background.paper",
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.2)",
            textAlign: "center",
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Please log in or register to continue
          </Typography>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                onClick={() => navigate("/login")}
              >
                Login
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                size="large"
                onClick={() => navigate("/register")}
              >
                Register
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Informational Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* About This System */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={2}
            sx={{
              backgroundColor: "background.paper",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <CardContent>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                About This System
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Our blockchain-based voting system ensures every vote is recorded on a distributed ledger.
                Once a block is finalized, its transactions become immutable—guaranteeing transparency and integrity.
              </Typography>
              <Grid item xs={12}>
                <Box sx={{ textAlign: "center", mt: 4 }}>
                  <img
                    src="/assets/blockchain-diagram.png"
                    alt="Blockchain Infographic"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary", mt: 1 }}>
                    Blockchain: Each vote becomes a block in a secure chain.
                  </Typography>

                </Box>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        {/* How It Works */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={2}
            sx={{
              backgroundColor: "background.paper",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <CardContent>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                How It Works
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                1. <strong>Create a Poll</strong> and set your options.<br />
                2. <strong>Vote</strong> securely using your unique voter ID.<br />
                3. Votes are grouped into <strong>Blocks</strong> on the blockchain.<br />
                4. Each block is verified and finalized, ensuring no tampering.<br />
                5. Real-time results provide complete transparency.
              </Typography>

            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Quick Actions for Logged In Users */}
      {voter && (
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Ready to get started?
          </Typography>
          <Grid container spacing={3} justifyContent="center">
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                onClick={() => navigate("/create")}
              >
                Create a Poll
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                size="large"
                onClick={() => navigate("/polls")}
              >
                View Polls
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                color="info"
                fullWidth
                size="large"
                onClick={() => navigate("/election")}
              >
                Election
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Trending Polls Section */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          backgroundColor: "background.paper",
          borderRadius: 4,
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          Trending Polls
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
          Check out the polls receiving the most votes right now.
        </Typography>
        {loadingTrending ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        ) : trendingPolls.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No trending polls found.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {trendingPolls.map((pollItem) => (
              <Grid item xs={12} sm={6} md={4} key={pollItem.poll_id}>
                <Card
                  variant="outlined"
                  sx={{
                    backgroundColor: "background.paper",
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      {pollItem.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                      {pollItem.question}
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <CircularProgress
                        variant="determinate"
                        value={
                          pollItem.totalVotes > 100
                            ? 100
                            : pollItem.totalVotes
                        }
                      />
                      <Typography variant="body2">
                        {pollItem.totalVotes} votes
                      </Typography>
                    </Box>
                    <Button
                      variant="text"
                      sx={{ mt: 2 }}
                      onClick={() => navigate(`/poll/${pollItem.poll_id}`)}
                    >
                      View Poll
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Container>
  );
};

export default HomePage;
