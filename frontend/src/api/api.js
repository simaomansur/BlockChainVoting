// src/api/api.js
import axios from 'axios';

// Set the base URL for your backend API
const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:3030',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const createPoll = (pollData) => {
  return apiClient.post('/poll/create', pollData);
};

export const getExistingPolls = () => {
  return apiClient.get('/polls');
};


export const castVote = (voteData) => {
  return apiClient.post('/poll/vote', voteData);
};

export const getPollBlockchain = (pollId) => {
  return apiClient.get(`/poll/${pollId}/blockchain`);
};
