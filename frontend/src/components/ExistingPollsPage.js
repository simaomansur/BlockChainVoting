import React, { useState, useEffect } from "react";
import { getExistingPolls } from "../api/api";
import { useNavigate } from "react-router-dom";
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  CircularProgress,
  Box,
} from "@mui/material";

const ExistingPollsPage = () => {
  const [polls, setPolls] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const data = await getExistingPolls();
        setPolls(data);
      } catch (err) {
        setError(err.message || "Error fetching polls");
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  return (
    <Paper elevation={3} sx={{ maxWidth: 800, margin: "auto", padding: 4, mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Existing Polls
      </Typography>

      {loading && (
        <Box display="flex" justifyContent="center" my={2}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography variant="body1" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {!loading && polls.length === 0 && (
        <Typography variant="body1">No polls available.</Typography>
      )}

      {polls.length > 0 && (
        <List>
          {polls.map((poll) => (
            <ListItem key={poll.poll_id} divider>
              <ListItemText
                primary={poll.title}
                secondary={poll.question}
              />
              <Button variant="outlined" onClick={() => navigate(`/vote/${poll.poll_id}`)}>
                Vote
              </Button>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default ExistingPollsPage;
