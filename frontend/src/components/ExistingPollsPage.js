// src/components/ExistingPollsPage.js
import React, { useEffect, useState } from 'react';
import { getExistingPolls } from '../api/api';
import { Link } from 'react-router-dom';

const ExistingPollsPage = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const response = await getExistingPolls();
        setPolls(response.data);
      } catch (error) {
        console.error('Error fetching polls:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  if (loading) {
    return <div>Loading polls...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Existing Polls</h2>
      {polls.length === 0 ? (
        <p>No polls found.</p>
      ) : (
        <ul>
          {polls.map((poll) => (
            <li key={poll.poll_id}>
              <h3>{poll.title}</h3>
              <Link to={`/vote/${poll.poll_id}`}>Vote</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ExistingPollsPage;
