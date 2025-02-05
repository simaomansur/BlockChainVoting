// src/components/Footer.js
import React from 'react';
import styled from 'styled-components';
import { FaFacebookF, FaTwitter, FaInstagram } from 'react-icons/fa';

const FooterContainer = styled.footer`
  background-color: #fff;
  border-top: 2px solid #a8ff78;
  padding: 20px;
  text-align: center;
  margin-top: 40px;
`;

const SocialIcons = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 10px;
  font-size: 1.2rem;
`;

const FooterText = styled.p`
  color: #555;
  font-size: 0.9rem;
`;

function Footer() {
  return (
    <FooterContainer>
      <SocialIcons>
        <a href="https://facebook.com" target="_blank" rel="noreferrer"><FaFacebookF /></a>
        <a href="https://twitter.com" target="_blank" rel="noreferrer"><FaTwitter /></a>
        <a href="https://instagram.com" target="_blank" rel="noreferrer"><FaInstagram /></a>
      </SocialIcons>
      <FooterText>© {new Date().getFullYear()} Polls Hub. All rights reserved.</FooterText>
    </FooterContainer>
  );
}

export default Footer;
