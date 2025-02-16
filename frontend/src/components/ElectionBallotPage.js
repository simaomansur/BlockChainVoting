// src/components/ElectionBallotPage.js
import React, { useState, useEffect } from 'react';
import { getPollDetails, castVote, getPollBlockchain } from '../api/api';
import { Paper, Typography, Button, TextField } from '@mui/material';

const ElectionBallotPage = () => {
  const pollId = "election"; // Fixed poll ID for the election poll
  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState({});
  const [voterId, setVoterId] = useState('');
  const [message, setMessage] = useState('');
  const [blockchain, setBlockchain] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const response = await getPollDetails(pollId);
        // Since our PollInput.options is a Vec<String> but for elections we stored structured JSON,
        // we parse the first element as JSON:
        let pollData = response.data;
        if (pollData.error) {
          pollData = null;
        } else if (typeof pollData.options[0] === 'string') {
          try {
            pollData.options = JSON.parse(pollData.options[0]);
          } catch (err) {
            console.error("Error parsing poll options:", err);
          }
        }
        setPoll(pollData);
      } catch (error) {
        console.error("Error fetching poll details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [pollId]);

  const handleVoteChange = (contest, option) => {
    setSelectedOption(prev => ({ ...prev, [contest]: option }));
  };

  const handleSubmit = async () => {
    if (!voterId) {
      setMessage("Please enter your voter ID.");
      return;
    }
    // Validate that a vote is selected for each contest
    for (let contest in poll.options) {
      if (!selectedOption[contest]) {
        setMessage(`Please select an option for ${contest}.`);
        return;
      }
    }
    setMessage("");
    try {
      // Send a vote for each contest
      const votePromises = Object.entries(selectedOption).map(([contest, option]) => {
        return castVote({
          poll_id: pollId,
          voter_id: voterId,
          candidate: `${contest}: ${option}`
        });
      });
      await Promise.all(votePromises);
      setMessage("Votes cast successfully!");
      // Fetch and display updated blockchain data
      const chainResponse = await getPollBlockchain(pollId);
      setBlockchain(chainResponse.data);
    } catch (error) {
      console.error("Error casting votes:", error);
      setMessage("Error casting votes.");
    }
  };

  if (loading) return <div>Loading ballot...</div>;
  if (!poll || !poll.options) return <div>Ballot not found.</div>;

  return (
    <Paper sx={{ p: 4, m: 2, maxWidth: 800, margin: 'auto' }}>
      <Typography variant="h4" align="center" gutterBottom>
        Official Ballot
      </Typography>
      <Typography variant="h6" align="center" gutterBottom>
        {poll.title}
      </Typography>
      <Typography variant="body1" align="center" gutterBottom>
        {poll.question}
      </Typography>

      {Object.keys(poll.options).map((contest) => (
        <div key={contest} style={{ marginTop: 20 }}>
          <Typography variant="subtitle1">
            {contest.charAt(0).toUpperCase() + contest.slice(1)}
          </Typography>
          {poll.options[contest].map((option) => (
            <Button
              key={option}
              variant={selectedOption[contest] === option ? "contained" : "outlined"}
              onClick={() => handleVoteChange(contest, option)}
              sx={{ mr: 1, mt: 1 }}
            >
              {option}
            </Button>
          ))}
        </div>
      ))}

      <TextField
        label="Voter ID"
        variant="outlined"
        fullWidth
        sx={{ mt: 3, mb: 3 }}
        value={voterId}
        onChange={(e) => setVoterId(e.target.value)}
      />

      <Button variant="contained" color="primary" onClick={handleSubmit} fullWidth>
        Submit Votes
      </Button>

      {message && (
        <Typography variant="subtitle1" color="error" align="center" sx={{ mt: 2 }}>
          {message}
        </Typography>
      )}

      {blockchain && (
        <div style={{ marginTop: '20px' }}>
          <Typography variant="h5" align="center">
            Blockchain Data
          </Typography>
          <pre style={{ backgroundColor: '#f9f9f9', padding: '10px', overflowX: 'auto' }}>
            {JSON.stringify(blockchain, null, 2)}
          </pre>
        </div>
      )}
    </Paper>
  );
};

export default ElectionBallotPage;
