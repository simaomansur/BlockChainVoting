import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom"; // For dynamic pollId
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
  TextField
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

  // Toggle map
  const [showMap, setShowMap] = useState(false);

  // A "state" text, so user can pick what state they're voting from
  // (You must store "state" in each vote for the aggregator to do by-state breakdown)
  const [voterState, setVoterState] = useState("");

  // 2) Load the poll details dynamically
  useEffect(() => {
    const fetchElection = async () => {
      try {
        if (!pollId) {
          throw new Error("No pollId provided in URL.");
        }
        const pollData = await getPollDetails(pollId);
        if (!pollData || !pollData.options) {
          throw new Error("Poll data is invalid or missing options.");
        }

        // If pollData.options is an array, parse the first string as a JSON object of contests
        // e.g. { presidency: ["Candidate A", "Candidate B"], ... }
        if (Array.isArray(pollData.options) && pollData.options.length > 0) {
          const parsed = JSON.parse(pollData.options[0]);
          setElection({ ...pollData, options: parsed });
        } else {
          setElection(pollData);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingElection(false);
      }
    };

    fetchElection();
  }, [pollId]);

  // 3) Handle a user selecting a candidate in a given "contest"
  const handleVoteChange = (contest, choice) => {
    setSelectedVotes((prev) => ({ ...prev, [contest]: choice }));
  };

  // 4) Submit the vote
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
      // If you want to enforce selecting a state for the aggregator:
      setError("Please enter the state code (e.g. CA, NY).");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Combine the selected races with the "state"
      // e.g. { presidency: "Candidate A", congress: "Party X", state: "CA" }
      const finalVoteData = {
        ...selectedVotes,
        state: voterState.trim().toUpperCase() // e.g. "CA"
      };

      await castVote({
        poll_id: pollId,
        voter_id: voter.voterId,
        vote: finalVoteData
      });

      setSuccess("Election vote submitted successfully!");
      await fetchBlockchainData();
    } catch (err) {
      setError("Error submitting election vote: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5) Fetch the blockchain details and counts
  const fetchBlockchainData = async () => {
    try {
      const chainData = await getBlockchain(pollId);
      setBlockchain(chainData);

      const validityResp = await checkValidity(pollId);
      setValidity(validityResp.valid);

      const countsResp = await getVoteCounts(pollId);
      setVoteCounts(countsResp.vote_counts);
    } catch (err) {
      console.error("Error fetching blockchain data:", err);
    }
  };

  return (
    <Paper elevation={3} sx={{ maxWidth: 800, margin: "auto", padding: 4, mt: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Election Ballot (Poll ID: {pollId || "Unknown"})
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

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
            sx={{ mb: 2 }}
          />

          {/* Build a radio group for each contest in the poll's first "options" object */}
          {Object.keys(election.options).map((contest) => (
            <Box key={contest} sx={{ mb: 2, p: 2, border: "1px solid #ccc" }}>
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
            {loading ? "Submitting..." : "Submit Vote"}
          </Button>
        </form>
      ) : (
        <Typography>No election data available for poll {pollId}.</Typography>
      )}

      {/* A button to fetch the chain details & show them */}
      <Button
        variant="outlined"
        onClick={fetchBlockchainData}
        fullWidth
        sx={{ mb: 2 }}
      >
        View Blockchain Details
      </Button>

      {blockchain && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5">Blockchain Data</Typography>
          {blockchain.map((block, idx) => (
            <Box key={idx} sx={{ mb: 2, p: 2, border: "1px solid #ccc" }}>
              <Typography variant="subtitle1">Block Index: {block.index}</Typography>
              <Typography variant="body2">Timestamp: {block.timestamp}</Typography>
              <Typography variant="body2">Previous Hash: {block.previous_hash}</Typography>
              <Typography variant="body2">Hash: {block.hash}</Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                Transactions: {JSON.stringify(block.transactions, null, 2)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Show validity */}
      {validity !== null && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5">Blockchain Validity</Typography>
          <Alert severity={validity ? "success" : "error"}>
            {validity
              ? "Blockchain is valid"
              : "Blockchain is NOT valid"}
          </Alert>
        </Box>
      )}

      {/* Show aggregated vote counts */}
      {voteCounts && Object.keys(voteCounts).length > 0 ? (
        <Box mt={3}>
          <Typography variant="h5" align="center">
            Live Vote Counts
          </Typography>
          {Object.entries(voteCounts).map(([category, results]) => (
            <Box key={category} sx={{ mt: 2, borderTop: "1px solid #ccc", pt: 1 }}>
              <Typography variant="h6">{category}</Typography>
              <List>
                {Object.entries(results).map(([choice, count]) => (
                  <ListItem key={choice}>
                    <ListItemText primary={`${choice}: ${count} votes`} />
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}
        </Box>
      ) : (
        <Box mt={3}>
          <Typography variant="h6" align="center">
            No votes yet for poll {pollId}.
          </Typography>
        </Box>
      )}

      {/* Toggleable US Map showing state-level aggregator */}
      <Box sx={{ mt: 4 }}>
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
            {/* We pass pollId so <StateResultsMap /> can do GET /poll/:pollId/vote_counts_by_state */}
            <StateResultsMap pollId={pollId} />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default ElectionBallotPage;
