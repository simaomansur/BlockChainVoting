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
} from "@mui/material";
import {
  getPollDetails,
  castVote,
  getBlockchain,
  checkValidity,
  getVoteCounts,
} from "../api/api";
import { VoterContext } from "../context/VoterContext";

const ElectionBallotPage = () => {
  const { voter } = useContext(VoterContext);
  const [election, setElection] = useState(null);
  const [selectedVotes, setSelectedVotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingElection, setLoadingElection] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [blockchain, setBlockchain] = useState(null);
  const [validity, setValidity] = useState(null);
  const [voteCounts, setVoteCounts] = useState(null);

  useEffect(() => {
    const fetchElection = async () => {
      try {
        const electionData = await getPollDetails("election");
        if (!electionData || !electionData.options) {
          throw new Error("Election poll data is invalid or missing options.");
        }
        if (Array.isArray(electionData.options) && electionData.options.length > 0) {
          const parsed = JSON.parse(electionData.options[0]);
          setElection({ ...electionData, options: parsed });
        } else {
          setElection(electionData);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingElection(false);
      }
    };

    fetchElection();
  }, []);

  const handleVoteChange = (contest, choice) => {
    setSelectedVotes((prev) => ({ ...prev, [contest]: choice }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!voter || !voter.voterId || Object.keys(selectedVotes).length === 0) {
      setError("Your voter ID is missing or you have not selected any choices.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await castVote({
        poll_id: "election",
        voter_id: voter.voterId,
        vote: selectedVotes, // Changed from 'candidate' to 'vote'
      });
      setSuccess("Election vote submitted successfully!");
      await fetchBlockchainData();
    } catch (err) {
      setError("Error submitting election vote.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockchainData = async () => {
    try {
      const chainData = await getBlockchain("election");
      setBlockchain(chainData);
      const validityResp = await checkValidity("election");
      setValidity(validityResp.valid);
      const countsResp = await getVoteCounts("election");
      setVoteCounts(countsResp.vote_counts);
    } catch (err) {
      console.error("Error fetching blockchain data:", err);
    }
  };

  return (
    <Paper elevation={3} sx={{ maxWidth: 800, margin: "auto", padding: 4, mt: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Election Ballot
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loadingElection ? (
        <Box display="flex" justifyContent="center" my={2}>
          <CircularProgress />
        </Box>
      ) : election ? (
        <form onSubmit={handleSubmit}>
          {/* Display the voter ID */}
          <Typography variant="body1" sx={{ mb: 2 }}>
            Voter ID: {voter?.voterId || "Not assigned"}
          </Typography>
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
                <Typography color="error">Invalid options for {contest}</Typography>
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
        <Typography>No election data available.</Typography>
      )}

      <Button variant="outlined" onClick={fetchBlockchainData} fullWidth sx={{ mb: 2 }}>
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

      {validity !== null && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5">Blockchain Validity</Typography>
          <Alert severity={validity ? "success" : "error"}>
            {validity ? "Blockchain is valid" : "Blockchain is NOT valid"}
          </Alert>
        </Box>
      )}

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
            No votes yet.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default ElectionBallotPage;