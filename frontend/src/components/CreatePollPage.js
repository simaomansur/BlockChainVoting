// src/components/CreatePollPage.js
import React, { useState } from 'react';
import { createPoll } from '../api/api'; // your API helper

const CreatePollPage = () => {
  const [pollId, setPollId] = useState('');
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState('');

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    // Convert comma-separated options into an array
    const optionsArray = options.split(',').map((opt) => opt.trim());
    const pollData = {
      poll_id: pollId,
      title,
      question,
      options: optionsArray,
      is_public: true,
    };
    try {
      const response = await createPoll(pollData);
      console.log('Poll created:', response.data);
      alert('Poll created successfully');
    } catch (error) {
      console.error('Error creating poll:', error);
      alert('Error creating poll');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Create a New Poll</h2>
      <form onSubmit={handleCreatePoll}>
        <div>
          <label>
            Poll ID:
            <input
              type="text"
              value={pollId}
              onChange={(e) => setPollId(e.target.value)}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Title:
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Question:
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Options (comma-separated):
            <input
              type="text"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              required
            />
          </label>
        </div>
        <button type="submit">Create Poll</button>
      </form>
    </div>
  );
};

export default CreatePollPage;
