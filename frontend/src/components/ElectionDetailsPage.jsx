// src/components/ElectionDetailsPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Paper, 
  Typography, 
  Box, 
  Alert, 
  CircularProgress, 
  Grid, 
  Card, 
  CardContent, 
  Divider,
  Button
} from "@mui/material";
import { VoterContext } from "../context/VoterContext";
import StateResultsMap from "./StateResultsMap";
import { getVoteCounts, getBlockchain, checkValidity } from "../api/api";

const ElectionDetailsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { voter } = useContext(VoterContext);
  
  // Get the data passed from ElectionBallotPage
  const electionData = location.state?.electionData || null;
  const pollId = location.state?.pollId || "election";
  
  // State for the details page
  const [voteCounts, setVoteCounts] = useState(null);
  const [blockchain, setBlockchain] = useState(null);
  const [validity, setValidity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [showBlockchain, setShowBlockchain] = useState(false);
  const [fetchingCounts, setFetchingCounts] = useState(false);

  // Format contest name for display
  const formatContestName = (contest) => {
    return contest === "default_choice" 
      ? "General Vote" 
      : contest.charAt(0).toUpperCase() + contest.slice(1);
  };

  // Fetch vote counts
  const fetchVoteCounts = async () => {
    try {
      setFetchingCounts(true);
      const countsResp = await getVoteCounts(pollId);
  
      if (countsResp && countsResp.vote_counts) {
        setVoteCounts(countsResp.vote_counts);
      } else {
        console.warn("Received empty or invalid vote counts data:", countsResp);
      }
    } catch (err) {
      console.error("Error fetching vote counts:", err);
      setError("Failed to load vote counts. Please try again.");
    } finally {
      setFetchingCounts(false);
    }
  };

  // Fetch blockchain data
  const fetchBlockchainData = async () => {
    try {
      const chainData = await getBlockchain(pollId);
      setBlockchain(chainData);

      const validityResp = await checkValidity(pollId);
      setValidity(validityResp.valid);
    } catch (err) {
      console.error("Error fetching blockchain data:", err);
      setError("Failed to load blockchain data. Please try again.");
    }
  };

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchVoteCounts(), fetchBlockchainData()]);
      } catch (err) {
        console.error("Error loading election details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!electionData) {
      navigate("/election", { replace: true });
      return;
    }

    loadData();
  }, [electionData, navigate, pollId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ maxWidth: 800, margin: "auto", padding: 4, mt: 4, mb: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Election Results
      </Typography>
      <Typography variant="subtitle1" align="center" gutterBottom>
        Poll ID: {pollId || "Unknown"}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Vote Counts Section */}
      <Box sx={{ mt: 3, mb: 4 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Live Election Results
        </Typography>
        
        <Box display="flex" justifyContent="center" mb={2}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={fetchVoteCounts} 
            disabled={fetchingCounts}
            startIcon={fetchingCounts ? <CircularProgress size={20} /> : null}
          >
            {fetchingCounts ? "Refreshing..." : "Refresh Results"}
          </Button>
        </Box>
        
        {fetchingCounts ? (
          <Box display="flex" justifyContent="center" my={2}>
            <CircularProgress />
          </Box>
        ) : voteCounts && Object.keys(voteCounts).length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(voteCounts).map(([contest, candidates]) => (
              <Card key={contest} variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {formatContestName(contest)}
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <Grid container spacing={2}>
                    {Object.entries(candidates)
                      .sort(([, a], [, b]) => b - a) // Sort by vote count (descending)
                      .map(([candidate, count]) => (
                        <Grid item xs={12} sm={6} key={candidate}>
                          <Typography variant="body1">
                            <strong>{candidate}</strong>: {count} vote{count !== 1 ? 's' : ''}
                          </Typography>
                        </Grid>
                      ))
                    }
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Alert severity="info">
            No votes have been recorded yet for this election.
          </Alert>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Toggleable Map */}
      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          color="secondary"
          fullWidth
          onClick={() => setShowMap(!showMap)}
        >
          {showMap ? "Hide State Map" : "Show State Map"}
        </Button>

        {showMap && (
          <Box sx={{ mt: 3 }}>
            <StateResultsMap pollId={pollId} />
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Toggleable Blockchain Details */}
      <Box sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          fullWidth
          onClick={() => {
            setShowBlockchain(!showBlockchain);
            if (!blockchain && !showBlockchain) {
              fetchBlockchainData();
            }
          }}
        >
          {showBlockchain ? "Hide Blockchain Details" : "View Blockchain Details"}
        </Button>

        {showBlockchain && (
          <Box sx={{ mt: 3 }}>
            {validity !== null && (
              <Alert severity={validity ? "success" : "error"} sx={{ mb: 2 }}>
                {validity
                  ? "✓ Blockchain is valid and secure"
                  : "⚠️ Blockchain integrity issue detected"}
              </Alert>
            )}

            {blockchain ? (
              <Box sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #eee', borderRadius: 2 }}>
                {blockchain.map((block, idx) => (
                  <Box key={idx} sx={{ p: 2, borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <Typography variant="subtitle1">Block #{block.index}</Typography>
                    <Typography variant="caption" display="block">
                      Time: {new Date(block.timestamp).toLocaleString()}
                    </Typography>
                    {idx > 0 && (
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 1 }}>
                        Vote: {JSON.stringify(block.transactions, null, 2)}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" my={2}>
                <CircularProgress />
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Box mt={3}>
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth
          onClick={() => navigate("/election")}
        >
          Back to Ballot
        </Button>
      </Box>
    </Paper>
  );
};
export default ElectionDetailsPage;