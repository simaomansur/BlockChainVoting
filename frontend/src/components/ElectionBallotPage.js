import React, { useState, useEffect, useContext } from "react";
import {
  Paper,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Alert,
  CircularProgress,
  Box,
  List,
  ListItem,
  ListItemText,
  TextField,
  Divider,
  Card,
  CardContent
} from "@mui/material";
import {
  getPollDetails,
  castVote,
  getBlockchain,
  checkValidity,
  getVoteCounts
} from "../api/api";
import { VoterContext } from "../context/VoterContext";
import StateResultsMap from "./StateResultsMap";

const ElectionBallotPage = ({ pollId = "election" }) => {
  const { voter } = useContext(VoterContext);

  const [election, setElection] = useState(null);
  const [selectedVotes, setSelectedVotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingElection, setLoadingElection] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Blockchain display
  const [blockchain, setBlockchain] = useState(null);
  const [validity, setValidity] = useState(null);
  const [voteCounts, setVoteCounts] = useState(null);
  const [fetchingCounts, setFetchingCounts] = useState(false);

  // Toggle sections
  const [showMap, setShowMap] = useState(false);
  const [showBlockchain, setShowBlockchain] = useState(false);

  // A "state" text, so user can pick what state they're voting from
  const [voterState, setVoterState] = useState("");

  // Handle a user selecting a candidate in a given "contest"
  const handleVoteChange = (contest, choice) => {
    setSelectedVotes((prev) => ({ ...prev, [contest]: choice }));
  };

  // Fetch the latest vote counts
  const fetchVoteCounts = async () => {
    try {
      setFetchingCounts(true);
      const countsResp = await getVoteCounts(pollId);
      
      // Check if we got valid vote counts data
      if (countsResp && countsResp.vote_counts) {
        setVoteCounts(countsResp.vote_counts);
        console.log("Loaded vote counts:", countsResp.vote_counts);
      } else {
        console.warn("Received empty or invalid vote counts data:", countsResp);
      }
    } catch (err) {
      console.error("Error fetching vote counts:", err);
      // Don't set an error message for the user, just log it
    } finally {
      setFetchingCounts(false);
    }
  };

  // Fetch the blockchain details and counts
  const fetchBlockchainData = async () => {
    try {
      const chainData = await getBlockchain(pollId);
      setBlockchain(chainData);

      const validityResp = await checkValidity(pollId);
      setValidity(validityResp.valid);
    } catch (err) {
      console.error("Error fetching blockchain data:", err);
    }
  };

  // Submit the vote
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pollId) {
      setError("No poll ID found in URL; cannot cast vote.");
      return;
    }
    if (!voter || !voter.voterId) {
      setError("Your voter ID is missing; please log in.");
      return;
    }
    if (Object.keys(selectedVotes).length === 0) {
      setError("You have not selected any choices.");
      return;
    }
    if (!voterState.trim()) {
      setError("Please enter the state code (e.g. CA, NY).");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Simply combine the selected votes with the state information
      // NO redundant "candidate" field is added
      const finalVoteData = {
        // Include all contest-specific votes
        ...selectedVotes,
        
        // Add the state information
        state: voterState.trim().toUpperCase()
      };

      await castVote({
        poll_id: pollId,
        voter_id: voter.voterId,
        vote: finalVoteData
      });

      setSuccess("Election vote submitted successfully!");
      
      // Reset the form
      setSelectedVotes({});
      
      // Refresh the data
      await fetchVoteCounts();
      await fetchBlockchainData();
    } catch (err) {
      // Better error handling to extract the actual message from the response
      if (err.response && err.response.data && err.response.data.error) {
        // Extract the specific error message from the response
        setError(err.response.data.error);
      } else {
        // Fallback to generic error or raw error message
        setError("Error submitting election vote: " + (err.message || "Unknown error"));
      }
      
      console.error("Vote submission error:", err);
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

  // Load the poll details dynamically
  useEffect(() => {
    const fetchElection = async () => {
      try {
        if (!pollId) {
          throw new Error("No pollId provided in URL.");
        }
        
        setLoadingElection(true);
        const pollData = await getPollDetails(pollId);
        
        if (!pollData || !pollData.options) {
          throw new Error("Poll data is invalid or missing options.");
        }

        // If pollData.options is an array, parse the first string as a JSON object of contests
        if (Array.isArray(pollData.options) && pollData.options.length > 0) {
          try {
            const parsed = JSON.parse(pollData.options[0]);
            setElection({ ...pollData, options: parsed });
          } catch (e) {
            console.error("Error parsing poll options:", e);
            setElection(pollData);
          }
        } else {
          setElection(pollData);
        }
        
        // Always fetch vote counts on initial load
        await fetchVoteCounts();
        
      } catch (err) {
        console.error("Error loading election data:", err);
        setError(err.message);
      } finally {
        setLoadingElection(false);
      }
    };

    fetchElection();
  }, [pollId]);

  return (
    <Paper elevation={3} sx={{ maxWidth: 800, margin: "auto", padding: 4, mt: 4, mb: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Election Ballot
      </Typography>
      <Typography variant="subtitle1" align="center" gutterBottom>
        Poll ID: {pollId || "Unknown"}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

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
            ))}
          </Box>
        ) : (
          <Alert severity="info">
            No votes have been recorded yet for this election.
          </Alert>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Voting Form */}
      <Typography variant="h5" align="center" gutterBottom>
        Cast Your Vote
      </Typography>

      {loadingElection ? (
        <Box display="flex" justifyContent="center" my={2}>
          <CircularProgress />
        </Box>
      ) : election ? (
        <form onSubmit={handleSubmit}>
          {/* Show the voter ID */}
          <Typography variant="body1" sx={{ mb: 2 }}>
            Voter ID: {voter?.voterId || "Not logged in"}
          </Typography>

          {/* Let the user type in their state code for by-state aggregator */}
          <TextField
            label="Your State (e.g. CA, NY)"
            value={voterState}
            onChange={(e) => setVoterState(e.target.value)}
            fullWidth
            required
            sx={{ mb: 3 }}
          />

          {/* Build a radio group for each contest in the poll's options object */}
          {Object.keys(election.options).map((contest) => (
            <Box key={contest} sx={{ mb: 3, p: 2, border: "1px solid #ccc", borderRadius: 2 }}>
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
                <Typography color="error">
                  Invalid options for "{contest}"
                </Typography>
              )}
            </Box>
          ))}

          <Button
            variant="contained"
            color="primary"
            type="submit"
            fullWidth
            disabled={loading}
            sx={{ mb: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : "Submit Vote"}
          </Button>
        </form>
      ) : (
        <Typography>No election data available for poll {pollId}.</Typography>
      )}

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
    </Paper>
  );
};

export default ElectionBallotPage;