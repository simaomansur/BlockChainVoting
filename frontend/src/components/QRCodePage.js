// src/components/QRCodePage.js
import React from 'react';
import QRCodeDisplay from './QRCodeDisplay';

const QRCodePage = () => {
  // Change this value to encode the correct URL or text
  const qrValue = "https://your-voting-app.example.com";

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h2>Scan this QR Code to visit our voting app</h2>
      <QRCodeDisplay value={qrValue} size={256} />
    </div>
  );
};

export default QRCodePage;
