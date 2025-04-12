// src/components/ElectionVoteDetails.jsx
import React, { useState, useEffect, useContext } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Grid
} from "@mui/material";
import { getVoteCounts } from "../api/api";
import { VoterContext } from "../context/VoterContext";

const ElectionVoteDetails = () => {
  const { pollId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { voter } = useContext(VoterContext);
  
  // Get voteData from location state or create empty object
  const voteData = location.state?.voteData || {};
  
  const [voteCounts, setVoteCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // For debugging - log data
  useEffect(() => {
    console.log("ElectionVoteDetails - Poll ID:", pollId);
    console.log("ElectionVoteDetails - Vote Data:", voteData);
    console.log("ElectionVoteDetails - Location State:", location.state);
  }, [pollId, voteData, location.state]);

  // Fetch vote counts on component mount
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        if (!pollId) {
          throw new Error("No poll ID available");
        }
        
        const response = await getVoteCounts(pollId);
        console.log("Vote counts response:", response);
        
        if (response && response.vote_counts) {
          setVoteCounts(response.vote_counts);
        } else {
          console.warn("No vote counts returned from API");
          setVoteCounts({});
        }
      } catch (err) {
        console.error("Error fetching vote counts:", err);
        setError("Failed to load election results: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [pollId]);

  // Format contest name for display
  const formatContestName = (contest) => {
    if (contest === "state") return "Voting State";
    return contest === "default_choice" 
      ? "General Vote" 
      : contest.charAt(0).toUpperCase() + contest.slice(1);
  };

  // Handle if no data is passed - show fallback content
  const hasVoteData = Object.keys(voteData).length > 0;

  return (
    <Paper elevation={3} sx={{ maxWidth: 800, margin: "auto", padding: 4, mt: 4, mb: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Vote Confirmation
      </Typography>
      <Typography variant="subtitle1" align="center" gutterBottom>
        Poll ID: {pollId || "Unknown"}
      </Typography>

      {/* Vote Confirmation Section */}
      <Box sx={{ mb: 4, mt: 2 }}>
        {hasVoteData ? (
          <>
            <Alert severity="success" sx={{ mb: 3 }}>
              Your vote has been successfully recorded on the blockchain!
            </Alert>
            
            <Card variant="outlined" sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Your Vote Summary
                </Typography>
                <List>
                  {Object.entries(voteData).map(([key, value]) => (
                    <ListItem key={key} divider>
                      <ListItemText 
                        primary={formatContestName(key)}
                        secondary={value}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </>
        ) : (
          <Alert severity="info" sx={{ mb: 3 }}>
            No vote data available. You may have refreshed the page or accessed it directly.
          </Alert>
        )}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Current Results Section */}
      <Typography variant="h5" align="center" gutterBottom>
        Current Election Results
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : voteCounts && Object.keys(voteCounts).length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Object.entries(voteCounts).map(([contest, candidates]) => {
            // Skip displaying the state counts in the results
            if (contest === "state") return null;
            
            return (
              <Card key={contest} variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {formatContestName(contest)}
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <List dense>
                    {Object.entries(candidates)
                      .sort(([, a], [, b]) => b - a) // Sort by vote count (descending)
                      .map(([candidate, count]) => (
                        <ListItem key={candidate}>
                          <ListItemText 
                            primary={
                              <Typography variant="body1">
                                <strong>{candidate}</strong>: {count} vote{count !== 1 ? 's' : ''}
                              </Typography>
                            } 
                          />
                        </ListItem>
                      ))
                    }
                  </List>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      ) : (
        <Alert severity="info">
          No votes have been recorded yet for this election.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mt: 4, justifyContent: 'center' }}>
        <Grid item>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate("/")}
          >
            Return to Home
          </Button>
        </Grid>
        <Grid item>
          <Button 
            variant="outlined" 
            color="secondary"
            onClick={() => navigate("/election/detail")}
          >
            Back to Election
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ElectionVoteDetails;