// src/components/CreatePollPage.js
import React, { useState, useContext } from 'react';
import { createPoll } from '../api/api';
import { TextField, Button, Typography, Paper, Grid } from '@mui/material';
import ErrorSnackbar from './ErrorSnackbar';
import { PollContext } from '../context/PollContext';

const CreatePollPage = () => {
  const [pollId, setPollId] = useState('');
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState('');
  const { error, setError } = useContext(PollContext);

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
      // Optionally clear the form
      setPollId('');
      setTitle('');
      setQuestion('');
      setOptions('');
    } catch (err) {
      console.error('Error creating poll:', err);
      setError('Error creating poll');
    }
  };

  const handleCloseSnackbar = () => {
    setError(null);
  };

  return (
    <Paper elevation={3} sx={{ padding: 4 }}>
      <Typography variant="h5" gutterBottom>
        Create a New Poll
      </Typography>
      <form onSubmit={handleCreatePoll}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Poll ID"
              fullWidth
              value={pollId}
              onChange={(e) => setPollId(e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Title"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Question"
              fullWidth
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Options (comma-separated)"
              fullWidth
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <Button type="submit" variant="contained" color="primary">
              Create Poll
            </Button>
          </Grid>
        </Grid>
      </form>
      <ErrorSnackbar error={error} onClose={handleCloseSnackbar} />
    </Paper>
  );
};

export default CreatePollPage;
