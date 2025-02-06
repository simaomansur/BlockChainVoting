// src/components/PrivatePoll.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { FaVoteYea } from 'react-icons/fa';
import { ProgressBar } from 'react-bootstrap'; // Optional


const OptionItem = styled.div`
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
`;

const VoteButton = styled.button`
  background: linear-gradient(45deg, #a8ff78, #78ffd6);
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  color: #333;
  cursor: pointer;
  align-self: flex-start;
  margin-top: 5px;
  &:hover {
    transform: scale(1.05);
  }
`;

function PrivatePoll() {
  const { pollId } = useParams();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPoll = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/private-polls/${pollId}`);
      setPoll(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching poll:", error);
      toast.error("Failed to load poll.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoll();
  }, [pollId]);

  const handleVote = async (optionId) => {
    try {
      const voteData = { poll_id: pollId, voter_id: "user123", option_id: optionId };
      await axios.post(`${process.env.REACT_APP_API_URL}/polls/${pollId}/vote`, voteData);
      toast.success("Vote recorded!");
      fetchPoll();
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Voting failed.");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h2>{poll.title}</h2>
      <p>{poll.question}</p>
      {poll.options.map(option => (
        <OptionItem key={option.id}>
          <span>{option.text} ({option.votes} votes)</span>
          <ProgressBar now={option.votes} label={`${option.votes}`} style={{ marginTop: '5px', height: '20px' }} />
          <VoteButton onClick={() => handleVote(option.id)}>
            <FaVoteYea /> Vote
          </VoteButton>
        </OptionItem>
      ))}
    </div>
  );
}

export default PrivatePoll;
