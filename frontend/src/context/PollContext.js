// src/context/PollContext.js
import React, { createContext, useState } from 'react';

export const PollContext = createContext();

export const PollProvider = ({ children }) => {
  // Global state for poll data and error messages.
  const [polls, setPolls] = useState([]);
  const [error, setError] = useState(null);

  const value = {
    polls,
    setPolls,
    error,
    setError,
  };

  return <PollContext.Provider value={value}>{children}</PollContext.Provider>;
};
