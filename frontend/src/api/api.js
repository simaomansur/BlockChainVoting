import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:3030";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// User Management APIs
export const registerUser = async (userData) =>
  api.post("/user/register", userData).then((res) => res.data);

export const loginUser = async (credentials) =>
  api.post("/user/login", credentials).then((res) => res.data);

export const getUserProfile = async (voterId) =>
  api.get(`/user/${voterId}/profile`).then((res) => res.data);

export const updateUserProfile = async (voterId, profileData) =>
  api.put(`/user/${voterId}/profile`, profileData).then((res) => res.data);

export const changePassword = async (voterId, passwordData) =>
  api.put(`/user/${voterId}/password`, passwordData).then((res) => res.data);

// Poll Management APIs
export const getExistingPolls = async () =>
  api.get("/polls").then((res) => res.data);

export const createPoll = async (pollData) =>
  api.post("/poll/create", pollData).then((res) => res.data);

export const getPollDetails = async (pollId) =>
  api.get(`/poll/${pollId}/details`).then((res) => res.data);

export const getBlockchain = async (pollId) =>
  api.get(`/poll/${pollId}/blockchain`).then((res) => res.data);

export const getVoteCounts = async (pollId) =>
  api.get(`/poll/${pollId}/vote_counts`).then((res) => res.data);

export const checkValidity = async (pollId) =>
  api.get(`/poll/${pollId}/validity`).then((res) => res.data);

// Vote Management APIs
export const castVote = async (voteData) =>
  api.post("/vote", voteData).then((res) => res.data);

export const verifyVote = async (pollId, voterId) =>
  api.get(`/vote/${pollId}/${voterId}/verify`).then((res) => res.data);

export const getPollResults = async (pollId) =>
  api.get(`/poll/${pollId}/results`).then((res) => res.data);

// Legacy verification method (maintained for backward compatibility)
export const getVoteVerification = async (pollId, voterId) =>
  api.get(`/poll/${pollId}/verify_vote/${voterId}`).then((res) => res.data);

export default api;
