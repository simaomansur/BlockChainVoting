// src/components/HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Welcome to the Blockchain Voting App</h1>
      <p>Please choose an option:</p>
      <div>
        <Link to="/create">
          <button>Create a Poll</button>
        </Link>
      </div>
      <div>
        <Link to="/existing">
          <button>Vote on an Existing Poll</button>
        </Link>
      </div>
      <div>
        <Link to="/vote">
          <button>Vote Results</button>
        </Link>
      </div>
      <div>
        <Link to="/ballot/election">
          <button>Unofficial Ballot</button>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
