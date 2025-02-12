// src/components/QRCodeDisplay.js
import React from 'react';
import QRCode from 'react-qr-code';

const QRCodeDisplay = ({ value, size = 128 }) => {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#fff',
        display: 'inline-block'
      }}
    >
      <QRCode value={value} size={size} />
    </div>
  );
};

export default QRCodeDisplay;
