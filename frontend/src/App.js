// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './components/HomePage';
import CreatePollPage from './components/CreatePollPage';
import ExistingPollsPage from './components/ExistingPollsPage';
import VotePage from './components/VotePage'
import ElectionBallotPage from './components/ElectionBallotPage';

function App() {
  return (
    <BrowserRouter>
      <div>
        {/* Optionally, a simple navigation bar */}
        <nav>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/create">Create Poll</Link>
            </li>
            <li>
              <Link to="/existing">Existing Polls</Link>
            </li>
          </ul>
        </nav>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreatePollPage />} />
          <Route path="/existing" element={<ExistingPollsPage />} />
          <Route path="/ballot/:pollId" element={<ElectionBallotPage />} />
          <Route path="/vote/:pollId" element={<VotePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
