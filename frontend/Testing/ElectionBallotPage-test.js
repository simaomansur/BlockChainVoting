import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import ElectionBallotPage from './ElectionBallotPage';
import { VoterContext } from '../context/VoterContext';
import {
  getPollDetails,
  castVote,
  getBlockchain,
  checkValidity,
  getVoteCounts
} from '../api/api';

// Mock the API functions
jest.mock('../api/api', () => ({
  getPollDetails: jest.fn(),
  castVote: jest.fn(),
  getBlockchain: jest.fn(),
  checkValidity: jest.fn(),
  getVoteCounts: jest.fn()
}));

// Mock the StateResultsMap component
jest.mock('./StateResultsMap', () => ({
  __esModule: true,
  default: () => <div data-testid="state-results-map">State Results Map</div>
}));

describe('ElectionBallotPage', () => {
  const mockVoter = {
    voterId: 'test-voter-123',
    name: 'Test Voter'
  };

  const mockPollDetails = {
    id: 'election',
    title: 'Test Election',
    options: [JSON.stringify({
      presidency: ['Candidate A', 'Candidate B'],
      congress: ['Party X', 'Party Y']
    })]
  };

  const mockBlockchain = [
    {
      index: 1,
      timestamp: '2025-04-01T12:00:00Z',
      previous_hash: '0000000000000',
      hash: 'abcdef123456',
      transactions: [{ voter_id: 'test-voter-123', vote: { presidency: 'Candidate A', state: 'CA' } }]
    }
  ];

  const mockValidity = { valid: true };

  const mockVoteCounts = {
    vote_counts: {
      presidency: { 'Candidate A': 10, 'Candidate B': 5 },
      congress: { 'Party X': 8, 'Party Y': 7 }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getPollDetails.mockResolvedValue(mockPollDetails);
    castVote.mockResolvedValue({ success: true });
    getBlockchain.mockResolvedValue(mockBlockchain);
    checkValidity.mockResolvedValue(mockValidity);
    getVoteCounts.mockResolvedValue(mockVoteCounts);
  });

  const renderComponent = (voterContextValue = { voter: mockVoter }) => {
    return render(
      <VoterContext.Provider value={voterContextValue}>
        <ElectionBallotPage pollId="election" />
      </VoterContext.Provider>
    );
  };

  test('renders loading state initially', () => {
    renderComponent();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('loads and displays election data', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(getPollDetails).toHaveBeenCalledWith('election');
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/Election Ballot/i)).toBeInTheDocument();
    expect(screen.getByText(/Presidency/i)).toBeInTheDocument();
    expect(screen.getByText(/Congress/i)).toBeInTheDocument();
    expect(screen.getByText('Candidate A')).toBeInTheDocument();
    expect(screen.getByText('Party X')).toBeInTheDocument();
  });

  test('displays error when loading election fails', async () => {
    getPollDetails.mockRejectedValue(new Error('Failed to load election'));
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load election/i)).toBeInTheDocument();
    });
  });

  test('handles vote selection', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Candidate A')).toBeInTheDocument();
    });
    
    // Select votes
    fireEvent.click(screen.getByLabelText('Candidate A'));
    fireEvent.click(screen.getByLabelText('Party X'));
    
    // Set voter state
    fireEvent.change(screen.getByLabelText(/Your State/i), {
      target: { value: 'CA' }
    });
    
    // The form should have updated selections
    const presidencyRadio = screen.getByLabelText('Candidate A');
    const congressRadio = screen.getByLabelText('Party X');
    
    expect(presidencyRadio).toBeChecked();
    expect(congressRadio).toBeChecked();
  });

  test('submits vote successfully', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Candidate A')).toBeInTheDocument();
    });
    
    // Select votes
    fireEvent.click(screen.getByLabelText('Candidate A'));
    fireEvent.click(screen.getByLabelText('Party X'));
    
    // Set voter state
    fireEvent.change(screen.getByLabelText(/Your State/i), {
      target: { value: 'CA' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit Vote'));
    
    await waitFor(() => {
      expect(castVote).toHaveBeenCalledWith({
        poll_id: 'election',
        voter_id: 'test-voter-123',
        vote: {
          presidency: 'Candidate A',
          congress: 'Party X',
          state: 'CA'
        }
      });
      
      expect(screen.getByText(/Election vote submitted successfully/i)).toBeInTheDocument();
    });
    
    // Should also fetch blockchain data after successful vote
    expect(getBlockchain).toHaveBeenCalledWith('election');
    expect(checkValidity).toHaveBeenCalledWith('election');
    expect(getVoteCounts).toHaveBeenCalledWith('election');
  });

  test('shows error on vote submission without state', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Candidate A')).toBeInTheDocument();
    });
    
    // Select votes but don't set state
    fireEvent.click(screen.getByLabelText('Candidate A'));
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit Vote'));
    
    await waitFor(() => {
      expect(screen.getByText(/Please enter the state code/i)).toBeInTheDocument();
    });
    
    // CastVote should not have been called
    expect(castVote).not.toHaveBeenCalled();
  });

  test('shows error on vote submission without selections', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Candidate A')).toBeInTheDocument();
    });
    
    // Set state but don't select any votes
    fireEvent.change(screen.getByLabelText(/Your State/i), {
      target: { value: 'CA' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit Vote'));
    
    await waitFor(() => {
      expect(screen.getByText(/You have not selected any choices/i)).toBeInTheDocument();
    });
    
    // CastVote should not have been called
    expect(castVote).not.toHaveBeenCalled();
  });

  test('shows error when vote submission fails', async () => {
    castVote.mockRejectedValue(new Error('Network error'));
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Candidate A')).toBeInTheDocument();
    });
    
    // Select votes
    fireEvent.click(screen.getByLabelText('Candidate A'));
    
    // Set voter state
    fireEvent.change(screen.getByLabelText(/Your State/i), {
      target: { value: 'CA' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit Vote'));
    
    await waitFor(() => {
      expect(screen.getByText(/Error submitting election vote: Network error/i)).toBeInTheDocument();
    });
  });

  test('shows error when voter is not logged in', async () => {
    renderComponent({ voter: null });
    
    await waitFor(() => {
      expect(screen.getByText('Candidate A')).toBeInTheDocument();
    });
    
    // Form should show not logged in
    expect(screen.getByText(/Not logged in/i)).toBeInTheDocument();
    
    // Select votes
    fireEvent.click(screen.getByLabelText('Candidate A'));
    
    // Set voter state
    fireEvent.change(screen.getByLabelText(/Your State/i), {
      target: { value: 'CA' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit Vote'));
    
    await waitFor(() => {
      expect(screen.getByText(/Your voter ID is missing; please log in/i)).toBeInTheDocument();
    });
    
    // CastVote should not have been called
    expect(castVote).not.toHaveBeenCalled();
  });

  test('fetches and displays blockchain data when requested', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Candidate A')).toBeInTheDocument();
    });
    
    // Click the button to fetch blockchain data
    fireEvent.click(screen.getByText('View Blockchain Details'));
    
    await waitFor(() => {
      expect(getBlockchain).toHaveBeenCalledWith('election');
      expect(checkValidity).toHaveBeenCalledWith('election');
      expect(getVoteCounts).toHaveBeenCalledWith('election');
    });
    
    // Should display blockchain data
    expect(screen.getByText(/Blockchain Data/i)).toBeInTheDocument();
    expect(screen.getByText(/Block Index: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Blockchain Validity/i)).toBeInTheDocument();
    expect(screen.getByText(/Blockchain is valid/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Vote Counts/i)).toBeInTheDocument();
    expect(screen.getByText(/Candidate A: 10 votes/i)).toBeInTheDocument();
  });

  test('toggles state map visibility', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Candidate A')).toBeInTheDocument();
    });
    
    // Initially, map should not be visible
    expect(screen.queryByTestId('state-results-map')).not.toBeInTheDocument();
    
    // Click to show map
    fireEvent.click(screen.getByText('Show State Map'));
    
    // Map should now be visible
    expect(screen.getByTestId('state-results-map')).toBeInTheDocument();
    expect(screen.getByText('Hide State Map')).toBeInTheDocument();
    
    // Click to hide map
    fireEvent.click(screen.getByText('Hide State Map'));
    
    // Map should be hidden again
    expect(screen.queryByTestId('state-results-map')).not.toBeInTheDocument();
    expect(screen.getByText('Show State Map')).toBeInTheDocument();
  });

  test('handles empty vote counts', async () => {
    getVoteCounts.mockResolvedValue({ vote_counts: {} });
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Candidate A')).toBeInTheDocument();
    });
    
    // Click the button to fetch blockchain data
    fireEvent.click(screen.getByText('View Blockchain Details'));
    
    await waitFor(() => {
      expect(getVoteCounts).toHaveBeenCalledWith('election');
      expect(screen.getByText(/No votes yet for poll election/i)).toBeInTheDocument();
    });
  });
});