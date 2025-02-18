import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:3030";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Retrieve the list of existing polls.
export const getExistingPolls = async () =>
  api.get("/polls").then(res => res.data);

// Create a new poll with the provided pollData.
export const createPoll = async (pollData) =>
  api.post("/poll/create", pollData).then(res => res.data);

// Submit a vote. If voteData.candidate is an object, it is stringified.
export const submitVote = async (voteData) => {
  const candidateValue =
    typeof voteData.candidate === "object"
      ? JSON.stringify(voteData.candidate)
      : voteData.candidate;
  return api
    .post("/poll/vote", {
      ...voteData,
      candidate: candidateValue,
    })
    .then(res => res.data);
};

// Retrieve the blockchain for a specific poll.
export const getBlockchain = async (pollId) =>
  api.get(`/poll/${pollId}/blockchain`).then(res => res.data);

// Retrieve vote counts for a specific poll.
export const getVoteCounts = async (pollId) =>
  api.get(`/poll/${pollId}/vote_counts`).then(res => res.data);

// Verify a vote for a specific poll and voter.
export const getVoteVerification = async (pollId, voterId) =>
  api.get(`/poll/${pollId}/verify_vote/${voterId}`).then(res => res.data);

// Retrieve poll details (metadata) for a specific poll.
export const getPollDetails = async (pollId) =>
  api.get(`/poll/${pollId}`).then(res => res.data);

// Validate the blockchain for a specific poll.
export const checkValidity = async (pollId) =>
  api.get(`/poll/${pollId}/validity`).then(res => res.data);

export default api;
