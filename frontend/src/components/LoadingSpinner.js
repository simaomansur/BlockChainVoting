// src/components/LoadingSpinner.js
import React from 'react';
import { ClipLoader } from 'react-spinners';
import styled from 'styled-components';

const SpinnerContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
`;

function LoadingSpinner() {
  return (
    <SpinnerContainer>
      <ClipLoader size={50} color="#78ffd6" />
    </SpinnerContainer>
  );
}

export default LoadingSpinner;
