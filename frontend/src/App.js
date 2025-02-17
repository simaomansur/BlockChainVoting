import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import HomePage from "./components/HomePage";
import CreatePollPage from "./components/CreatePollPage";
import ExistingPollsPage from "./components/ExistingPollsPage";
import VotePage from "./components/VotePage";
import ElectionBallotPage from "./components/ElectionBallotPage";

const App = () => {
  return (
    <Router>
      <div>
        {/* Navigation Bar using Material UI */}
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Blockchain Voting
            </Typography>
            <Button color="inherit" component={Link} to="/">Home</Button>
            <Button color="inherit" component={Link} to="/create">Create Poll</Button>
            <Button color="inherit" component={Link} to="/polls">View Polls</Button>
            <Button color="inherit" component={Link} to="/election">Election Ballot</Button>
          </Toolbar>
        </AppBar>

        {/* Page Routes */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreatePollPage />} />
          <Route path="/polls" element={<ExistingPollsPage />} />
          <Route path="/vote/:poll_id" element={<VotePage />} />
          <Route path="/election" element={<ElectionBallotPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
