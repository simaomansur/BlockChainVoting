import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPollDetails, castVote, getVoteCounts } from '../api/api';

const VotePage = () => {
  const { pollId } = useParams();
  console.log("VotePage pollId:", pollId);
  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [voterId, setVoterId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null); // state to hold vote results

  useEffect(() => {
    const fetchPollDetails = async () => {
      try {
        const response = await getPollDetails(pollId);
        setPoll(response.data);
      } catch (error) {
        console.error('Error fetching poll details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (pollId) {
      fetchPollDetails();
    }
  }, [pollId]);

  const handleVote = async () => {
    if (!selectedOption) {
      setMessage('Please select an option.');
      return;
    }
    if (!voterId) {
      setMessage('Please enter your voter ID.');
      return;
    }
    try {
      const voteData = { poll_id: pollId, voter_id: voterId, candidate: selectedOption };
      await castVote(voteData);
      setMessage('Vote cast successfully!');
      // Fetch and display updated results after a successful vote
      const resultsResponse = await getVoteCounts(pollId);
      setResults(resultsResponse.data);
    } catch (error) {
      console.error('Error casting vote:', error);
      setMessage('Error casting vote.');
    }
  };

  if (loading) return <div>Loading poll details...</div>;
  if (!poll) return <div>Poll not found.</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>{poll.title}</h2>
      <p>{poll.question}</p>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {poll.options.map((option, index) => (
          <button
            key={index}
            style={{
              borderRadius: '50%',
              padding: '10px 20px',
              backgroundColor: selectedOption === option ? '#007bff' : '#f0f0f0',
              color: selectedOption === option ? 'white' : 'black',
              border: 'none',
              cursor: 'pointer',
              minWidth: '80px'
            }}
            onClick={() => setSelectedOption(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Enter your voter ID"
          value={voterId}
          onChange={(e) => setVoterId(e.target.value)}
          style={{ padding: '8px', width: '200px' }}
        />
      </div>
      <button onClick={handleVote} style={{ padding: '10px 20px', cursor: 'pointer' }}>
        Submit Vote
      </button>
      {message && <p>{message}</p>}
      {results && results.vote_counts && (
        <div style={{ marginTop: '20px' }}>
          <h3>Voting Results</h3>
          <ul>
            {Object.entries(results.vote_counts).map(([candidate, count]) => (
              <li key={candidate}>
                  {candidate}: {count}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default VotePage;
