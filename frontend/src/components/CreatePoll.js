// src/components/CreatePoll.js
import React, { useState } from 'react';
import axios from 'axios';
import QRCode from 'qrcode.react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { Button} from 'react-bootstrap';


const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalContent = styled.div`
  background: #fff;
  border-radius: 10px;
  padding: 30px;
  text-align: center;
  width: 90%;
  max-width: 400px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const InputField = styled.input`
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
`;

function CreatePoll() {
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [pollUrl, setPollUrl] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOptionField = () => {
    setOptions([...options, '']);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !question || options.some(opt => !opt)) {
      toast.error("Please fill in all fields.");
      return;
    }
    const pollData = { title, question, options, is_public: false };
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/private-polls`, pollData);
      const pollId = response.data.id;
      const url = `${window.location.origin}/private/${pollId}`;
      setPollUrl(url);
      setShowModal(true);
      toast.success("Poll created successfully!");
    } catch (error) {
      console.error("Error creating poll:", error);
      toast.error("Failed to create poll.");
    }
  };

  return (
    <div>
      <h2>Create a Private Poll</h2>
      <Form onSubmit={handleSubmit}>
        <label>Title:</label>
        <InputField type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <label>Question:</label>
        <InputField type="text" value={question} onChange={(e) => setQuestion(e.target.value)} required />
        <label>Options:</label>
        {options.map((option, index) => (
          <InputField
            key={index}
            type="text"
            value={option}
            placeholder={`Option ${index + 1}`}
            onChange={(e) => handleOptionChange(index, e.target.value)}
            required
          />
        ))}
        <Button type="button" onClick={addOptionField}>Add Option</Button>
        <Button type="submit">Create Poll</Button>
      </Form>
      {showModal && (
        <ModalOverlay>
          <ModalContent>
            <h3>Your poll is ready!</h3>
            <p>Share the QR code below so others can vote:</p>
            <QRCode value={pollUrl} size={200} />
            <p style={{ wordBreak: 'break-all', marginTop: '10px' }}>{pollUrl}</p>
            <Button onClick={() => setShowModal(false)}>Close</Button>
          </ModalContent>
        </ModalOverlay>
      )}
    </div>
  );
}

export default CreatePoll;
