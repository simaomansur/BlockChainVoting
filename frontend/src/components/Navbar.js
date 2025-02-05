// src/components/Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FaPollH, FaPlusCircle, FaHome } from 'react-icons/fa';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <FaPollH size={32} style={{ marginRight: '8px' }} />
        <span>Polls Hub</span>
      </div>
      <ul className="navbar-links">
        <li>
          <Link to="/"><FaHome /> Home</Link>
        </li>
        <li>
          <Link to="/public">Public Polls</Link>
        </li>
        <li>
          <Link to="/create"><FaPlusCircle /> Create Poll</Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
