// src/components/HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { FaArrowRight } from 'react-icons/fa';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const HeroSection = styled.div`
  text-align: center;
  padding: 60px 20px;
  animation: ${fadeIn} 1s ease-out;
`;

const Title = styled.h2`
  font-size: 2.5rem;
  margin-bottom: 20px;
  color: #333;
`;

const Tagline = styled.p`
  font-size: 1.2rem;
  margin-bottom: 30px;
  color: #555;
`;

const Button = styled.button`
  background: linear-gradient(45deg, #a8ff78, #78ffd6);
  border: none;
  padding: 12px 24px;
  border-radius: 30px;
  font-size: 1rem;
  color: #333;
  cursor: pointer;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  &:hover {
    transform: scale(1.05);
  }
`;

function HomePage() {
  return (
    <HeroSection>
      <Title>Welcome to Polls Hub</Title>
      <Tagline>
        Vote on engaging public polls or create your own private poll to share with friends via QR code.
      </Tagline>
      <div>
        <Link to="/public">
          <Button style={{ marginRight: '10px' }}>
            View Public Polls <FaArrowRight />
          </Button>
        </Link>
        <Link to="/create">
          <Button>Create Private Poll</Button>
        </Link>
      </div>
    </HeroSection>
  );
}

export default HomePage;
