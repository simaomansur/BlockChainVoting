// src/components/PublicPolls.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { FaVoteYea } from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';
import { toast } from 'react-toastify';

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const PollCard = styled.div`
  border: 1px solid #a8ff78;
  border-radius: 10px;
  padding: 20px;
  background-color: #fff;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  }
`;

const PollTitle = styled.h3`
  margin-bottom: 10px;
  color: #333;
`;

const PollQuestion = styled.p`
  margin-bottom: 15px;
  color: #555;
`;

const OptionList = styled.ul`
  list-style: none;
  padding: 0;
`;

const OptionItem = styled.li`
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const VoteButton = styled.button`
  background: linear-gradient(45deg, #a8ff78, #78ffd6);
  border: none;
  padding: 6px 12px;
  border-radius: 5px;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  &:hover {
    transform: scale(1.05);
  }
`;

const SearchBar = styled.input`
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 100%;
  margin-bottom: 20px;
`;

function PublicPolls() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchPublicPolls = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/public-polls`);
      setPolls(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching public polls:", error);
      toast.error("Failed to load polls.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicPolls();
  }, []);

  const handleVote = async (pollId, optionId) => {
    try {
      const voteData = { poll_id: pollId, voter_id: "user123", option_id: optionId };
      await axios.post(`${process.env.REACT_APP_API_URL}/polls/${pollId}/vote`, voteData);
      toast.success("Vote recorded!");
      fetchPublicPolls();
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Voting failed.");
    }
  };

  const filteredPolls = polls.filter(poll =>
    poll.title.toLowerCase().includes(search.toLowerCase()) ||
    poll.question.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h2>Public Polls</h2>
      <SearchBar
        type="text"
        placeholder="Search polls..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <GridContainer>
        {filteredPolls.map(poll => (
          <PollCard key={poll.id}>
            <PollTitle>{poll.title}</PollTitle>
            <PollQuestion>{poll.question}</PollQuestion>
            <OptionList>
              {poll.options.map(option => (
                <OptionItem key={option.id}>
                  <span>{option.text} ({option.votes} votes)</span>
                  <VoteButton onClick={() => handleVote(poll.id, option.id)}>
                    <FaVoteYea /> Vote
                  </VoteButton>
                </OptionItem>
              ))}
            </OptionList>
          </PollCard>
        ))}
      </GridContainer>
    </div>
  );
}

export default PublicPolls;
