// src/App.js
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './App.css';

// Lazy load pages for performance
const HomePage = lazy(() => import('./components/HomePage'));
const PublicPolls = lazy(() => import('./components/PublicPolls'));
const CreatePoll = lazy(() => import('./components/CreatePoll'));
const PrivatePoll = lazy(() => import('./components/PrivatePoll'));

function App() {
  return (
    <Router>
      <Navbar />
      <div className="container">
        <Suspense fallback={<div className="loading">Loading...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/public" element={<PublicPolls />} />
            <Route path="/create" element={<CreatePoll />} />
            <Route path="/private/:pollId" element={<PrivatePoll />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </Router>
  );
}

export default App;
