// src/context/VoterContext.js
import React, { createContext, useState } from "react";

export const VoterContext = createContext();

export const VoterProvider = ({ children }) => {
  const [voter, setVoter] = useState(null);

  return (
    <VoterContext.Provider value={{ voter, setVoter }}>
      {children}
    </VoterContext.Provider>
  );
};
