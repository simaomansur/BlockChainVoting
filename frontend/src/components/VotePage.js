// src/components/VotePage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPollDetails, castVote, getVoteCounts } from '../api/api';
import { 
  Paper, Typography, Button, TextField, FormControl, 
  FormLabel, RadioGroup, FormControlLabel, Radio 
} from '@mui/material';

const VotePage = () => {
  const { pollId } = useParams();
  console.log("VotePage pollId:", pollId);

  const [poll, setPoll] = useState(null);
  // parsedContests: for structured polls it will be an object with keys (e.g. presidency, congress),
  // for a regular poll it will be { default: [...] }
  const [parsedContests, setParsedContests] = useState({});
  // For storing the user's selected candidate for each contest.
  const [selectedOptions, setSelectedOptions] = useState({});
  const [voterId, setVoterId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const fetchPollDetails = async () => {
      try {
        const response = await getPollDetails(pollId);
        console.log("Fetched poll details:", response.data);
        setPoll(response.data);

        // Check if poll.options exists and has elements.
        if (response.data.options && response.data.options.length > 0) {
          // Attempt to parse the first element as JSON.
          try {
            const parsed = JSON.parse(response.data.options[0]);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              // It's an object with multiple contests.
              setParsedContests(parsed);
            } else if (Array.isArray(parsed)) {
              // It's an array; treat it as a single contest under the "default" key.
              setParsedContests({ default: parsed });
            } else {
              // Fallback: use the raw options array.
              setParsedContests({ default: response.data.options });
            }
          } catch (err) {
            console.warn("Could not parse poll.options[0] as JSON, using raw options:", err);
            // If parsing fails, assume poll.options is already a plain array.
            setParsedContests({ default: response.data.options });
          }
        } else {
          setParsedContests({ default: [] });
        }
      } catch (error) {
        console.error("Error fetching poll details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (pollId) {
      fetchPollDetails();
    }
  }, [pollId]);

  const handleOptionChange = (contest, candidate) => {
    setSelectedOptions(prev => ({
      ...prev,
      [contest]: candidate
    }));
  };

  const handleSubmit = async () => {
    if (!voterId) {
      setMessage("Please enter your voter ID.");
      return;
    }
    for (let contest of Object.keys(parsedContests)) {
      if (!selectedOptions[contest]) {
        setMessage(`Please select an option for ${contest}.`);
        return;
      }
    }
    setMessage("");
    try {
      const votePromises = Object.entries(selectedOptions).map(([contest, candidate]) => {
        // If it's a plain poll (only "default" exists), prepend "default: " if not already.
        let voteCandidate = candidate;
        if (Object.keys(parsedContests).length === 1 && Object.keys(parsedContests)[0] === "default") {
          if (!candidate.startsWith("default: ")) {
            voteCandidate = `default: ${candidate}`;
          }
        } else {
          voteCandidate = `${contest}: ${candidate}`;
        }
        const voteData = {
          poll_id: poll.poll_id,
          voter_id: voterId,
          candidate: voteCandidate
        };
        console.log("Sending vote data:", voteData);
        return castVote(voteData);
      });
      await Promise.all(votePromises);
      setMessage("Votes cast successfully!");
      const resultsResponse = await getVoteCounts(poll.poll_id);
      console.log("Fetched vote counts:", resultsResponse.data);
      setResults(resultsResponse.data);
    } catch (error) {
      console.error("Error casting votes:", error);
      setMessage("Error casting votes.");
    }
  };
  

  if (loading) return <div>Loading poll details...</div>;
  if (!poll || Object.keys(parsedContests).length === 0)
    return <div>Poll not found or no contest data available.</div>;

  // For regular polls, if only one contest exists under "default", we use that.
  const contestKeys = Object.keys(parsedContests);
  return (
    <Paper sx={{ p: 4, m: 2, maxWidth: 800, margin: 'auto' }}>
      <Typography variant="h4" align="center" gutterBottom>
        Vote Now
      </Typography>
      <Typography variant="h6" align="center" gutterBottom>
        {poll.title}
      </Typography>
      <Typography variant="body1" align="center" gutterBottom>
        {poll.question}
      </Typography>

      {contestKeys.map((contest) => (
        <FormControl key={contest} component="fieldset" sx={{ mt: 3, width: '100%' }}>
          <FormLabel component="legend" sx={{ mb: 1 }}>
            {contest.charAt(0).toUpperCase() + contest.slice(1)}
          </FormLabel>
          <RadioGroup
            row
            name={contest}
            value={selectedOptions[contest] || ''}
            onChange={(e) => handleOptionChange(contest, e.target.value)}
          >
            {parsedContests[contest].map((option, index) => (
              <FormControlLabel
                key={index}
                value={option}
                control={<Radio />}
                label={option}
              />
            ))}
          </RadioGroup>
        </FormControl>
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
        Submit Vote
      </Button>

      {message && (
        <Typography variant="subtitle1" color="error" align="center" sx={{ mt: 2 }}>
          {message}
        </Typography>
      )}

      {results && results.vote_counts && (
        <div style={{ marginTop: '20px' }}>
          <Typography variant="h5" align="center">
            Voting Results
          </Typography>
          <ul>
            {Object.entries(results.vote_counts).map(([candidate, count]) => (
              <li key={candidate}>
                {candidate}: {count}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Paper>
  );
};

export default VotePage;
