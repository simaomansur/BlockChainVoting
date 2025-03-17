// src/context/VoterContext.js
import React, { createContext, useState, useEffect } from "react";

export const VoterContext = createContext();

export const VoterProvider = ({ children }) => {
  const [voter, setVoter] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check for stored voter data in localStorage
  useEffect(() => {
    const storedVoter = localStorage.getItem("voter");
    if (storedVoter) {
      try {
        setVoter(JSON.parse(storedVoter));
      } catch (e) {
        console.error("Error parsing stored voter data:", e);
        localStorage.removeItem("voter");
      }
    }
    setLoading(false);
  }, []);

  // Update localStorage when voter changes
  useEffect(() => {
    if (voter) {
      localStorage.setItem("voter", JSON.stringify(voter));
    } else {
      localStorage.removeItem("voter");
    }
  }, [voter]);

  // Logout function
  const logout = () => {
    setVoter(null);
    localStorage.removeItem("voter");
  };

  return (
    <VoterContext.Provider value={{ voter, setVoter, logout, loading }}>
      {children}
    </VoterContext.Provider>
  );
};

export default VoterProvider;