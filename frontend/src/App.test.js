// src/App.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { VoterContext } from './context/VoterContext';
import CreatePollPage from './components/CreatePollPage';
import ElectionBallotPage from './components/ElectionBallotPage';
import ExistingPollsPage from './components/ExistingPollsPage';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import PollDetailsPage from './components/PollDetailsPage';
import ProfilePage from './components/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import RegisterPage from './components/RegisterPage';
import StateResultsMap from './components/StateResultsMap';
import VotePage from './components/VotePage';
import * as api from './api/api';

// Mock the API functions
jest.mock('./api/api', () => ({
  createPoll: jest.fn(),
  getPollDetails: jest.fn(),
  castVote: jest.fn(),
  getBlockchain: jest.fn(),
  checkValidity: jest.fn(),
  getVoteCounts: jest.fn(),
  getExistingPolls: jest.fn(),
  getTrendingPolls: jest.fn(),
  loginUser: jest.fn(),
  getUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
  changePassword: jest.fn(),
  registerUser: jest.fn(),
  getVoteVerification: jest.fn()
}));

// Mock fetch for state results map
global.fetch = jest.fn();

// Mock react-router-dom navigate function
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({ poll_id: 'test-poll-id', pollId: 'test-poll-id' })
}));

// Mock chart components
jest.mock('react-apexcharts', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-chart" />
}));

jest.mock('react-simple-maps', () => ({
  ComposableMap: ({ children }) => <div data-testid="mock-map">{children}</div>,
  ZoomableGroup: ({ children }) => <div>{children}</div>,
  Geographies: ({ children, geography }) => children({ geographies: [{ rsmKey: '1', properties: { STUSPS: 'CA' } }] }),
  Geography: () => <div data-testid="mock-geography" />
}));

jest.mock('qrcode.react', () => ({
  QRCodeCanvas: () => <div data-testid="mock-qrcode" />
}));

jest.mock('react-confetti', () => () => <div data-testid="mock-confetti" />);

// Create a custom render function that wraps components with providers
const renderWithProviders = (ui, { voterValue = null } = {}) => {
  const defaultVoterContext = {
    voter: voterValue,
    setVoter: jest.fn(),
    logout: jest.fn(),
    loading: false
  };

  return render(
    <BrowserRouter>
      <VoterContext.Provider value={defaultVoterContext}>
        {ui}
      </VoterContext.Provider>
    </BrowserRouter>
  );
};

// Tests for HomePage
describe('HomePage', () => {
  beforeEach(() => {
    api.getTrendingPolls.mockResolvedValue([
      { poll_id: '1', title: 'Poll 1', question: 'Question 1', totalVotes: 10 },
    ]);
  });

  test('displays welcome message', async () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Welcome to the Blockchain Voting System/i)).toBeInTheDocument();
  });

  test('shows login/register buttons when not logged in', async () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Please log in or register to continue/i)).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  test('shows user info when logged in', async () => {
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<HomePage />, { voterValue: mockVoter });
    await waitFor(() => {
      expect(screen.getByText(/Logged in as:/i)).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  test('displays trending polls when loaded', async () => {
    renderWithProviders(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText(/Trending Polls/i)).toBeInTheDocument();
      expect(screen.getByText('Poll 1')).toBeInTheDocument();
    });
  });
});

// Tests for LoginPage
describe('LoginPage', () => {
  test('renders login form', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/Voter Login/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });

  test('handles login form submission', async () => {
    api.loginUser.mockResolvedValue({
      user: { voter_id: '123', name: 'Test User', zip_code: '12345', birth_date: '1990-01-01' }
    });

    renderWithProviders(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(api.loginUser).toHaveBeenCalledWith({ 
        email: 'test@example.com', 
        password: 'password' 
      });
    });
  });

  test('displays error message on login failure', async () => {
    api.loginUser.mockRejectedValue({ 
      response: { data: { error: 'Invalid credentials' } }
    });

    renderWithProviders(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});

// Tests for RegisterPage
describe('RegisterPage', () => {
  test('renders registration form', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByText(/Voter Registration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Zip Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Birth Date/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
  });

  test('handles registration form submission', async () => {
    api.registerUser.mockResolvedValue({ voter_id: '123' });

    renderWithProviders(<RegisterPage />);
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'password' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password' } });
    fireEvent.change(screen.getByLabelText(/Zip Code/i), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText(/Birth Date/i), { target: { value: '1990-01-01' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(api.registerUser).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        zip_code: '12345',
        birth_date: '1990-01-01'
      });
      expect(screen.getByText(/Registration successful/i)).toBeInTheDocument();
    });
  });

  test('displays error for password mismatch', async () => {
    renderWithProviders(<RegisterPage />);
    
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'password1' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password2' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });
});

// Tests for CreatePollPage
describe('CreatePollPage', () => {
  test('renders create poll form', () => {
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<CreatePollPage />, { voterValue: mockVoter });
    
    expect(screen.getByText(/Create a New Poll/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Poll Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Poll Question/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Options/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Public Poll/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Poll/i })).toBeInTheDocument();
  });

  test('handles poll creation submission', async () => {
    api.createPoll.mockResolvedValue({ poll_id: 'new-poll-123' });
    
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<CreatePollPage />, { voterValue: mockVoter });
    
    fireEvent.change(screen.getByLabelText(/Poll Title/i), { target: { value: 'Test Poll' } });
    fireEvent.change(screen.getByLabelText(/Poll Question/i), { target: { value: 'Test Question?' } });
    fireEvent.change(screen.getByLabelText(/Options/i), { target: { value: 'Option 1, Option 2, Option 3' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Create Poll/i }));

    await waitFor(() => {
      expect(api.createPoll).toHaveBeenCalledWith({
        title: 'Test Poll',
        question: 'Test Question?',
        options: ['Option 1', 'Option 2', 'Option 3'],
        is_public: true
      });
      expect(screen.getByText(/Poll created successfully/i)).toBeInTheDocument();
    });
  });

  test('validates required fields', async () => {
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<CreatePollPage />, { voterValue: mockVoter });
    
    fireEvent.click(screen.getByRole('button', { name: /Create Poll/i }));

    await waitFor(() => {
      expect(screen.getByText(/All fields are required/i)).toBeInTheDocument();
    });
  });
});

// Tests for ExistingPollsPage
describe('ExistingPollsPage', () => {
  beforeEach(() => {
    api.getExistingPolls.mockResolvedValue([
      { poll_id: '1', title: 'Poll 1', question: 'Question 1' },
      { poll_id: '2', title: 'Poll 2', question: 'Question 2' }
    ]);
  });

  test('renders list of polls', async () => {
    renderWithProviders(<ExistingPollsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Existing Polls/i)).toBeInTheDocument();
      expect(screen.getByText('Poll 1')).toBeInTheDocument();
      expect(screen.getByText('Poll 2')).toBeInTheDocument();
      expect(screen.getAllByText('View').length).toBe(2);
    });
  });

  test('handles empty poll list', async () => {
    api.getExistingPolls.mockResolvedValue([]);
    
    renderWithProviders(<ExistingPollsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/No polls available/i)).toBeInTheDocument();
    });
  });

  test('handles API error', async () => {
    api.getExistingPolls.mockRejectedValue(new Error('Failed to fetch polls'));
    
    renderWithProviders(<ExistingPollsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch polls/i)).toBeInTheDocument();
    });
  });
});

// Tests for PollDetailsPage
describe('PollDetailsPage', () => {
  beforeEach(() => {
    api.getPollDetails.mockResolvedValue({
      poll_id: 'test-poll-id',
      title: 'Test Poll',
      question: 'Test Question?',
      options: ['Option 1', 'Option 2']
    });
    
    api.getVoteCounts.mockResolvedValue({
      vote_counts: { 'Option 1': 5, 'Option 2': 3 }
    });
    
    api.getVoteVerification.mockResolvedValue({ hasVoted: false });
    
    api.getBlockchain.mockResolvedValue([
      { index: 0, hash: 'hash1', previous_hash: null, transactions: [], timestamp: new Date().toISOString() },
      { index: 1, hash: 'hash2', previous_hash: 'hash1', transactions: [{ voter_id: '123', vote: 'Option 1' }], timestamp: new Date().toISOString() }
    ]);
  });

  test('renders poll details and voting form', async () => {
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<PollDetailsPage />, { voterValue: mockVoter });
    
    await waitFor(() => {
      expect(screen.getByText('Test Poll')).toBeInTheDocument();
      expect(screen.getByText('Test Question?')).toBeInTheDocument();
      expect(screen.getByLabelText('Option 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Current Results')).toBeInTheDocument();
      expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
      expect(screen.getByText('Blockchain Explorer')).toBeInTheDocument();
    });
  });

  test('handles vote submission', async () => {
    api.castVote.mockResolvedValue({});
    
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<PollDetailsPage />, { voterValue: mockVoter });
    
    await waitFor(() => {
      expect(screen.getByLabelText('Option 1')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByLabelText('Option 1'));
    fireEvent.click(screen.getByRole('button', { name: /Submit Vote/i }));

    await waitFor(() => {
      expect(api.castVote).toHaveBeenCalledWith({
        poll_id: 'test-poll-id',
        voter_id: '123',
        vote: {
          choice: 'Option 1',
          state: 'Unknown'
        }
      });
      expect(screen.getByText(/Vote submitted successfully/i)).toBeInTheDocument();
      expect(screen.getByTestId('mock-confetti')).toBeInTheDocument();
    });
  });

  test('shows already voted message when user has voted', async () => {
    api.getVoteVerification.mockResolvedValue({ hasVoted: true });
    
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<PollDetailsPage />, { voterValue: mockVoter });
    
    await waitFor(() => {
      expect(screen.getByText(/You have already voted in this poll/i)).toBeInTheDocument();
    });
  });
});

// Tests for ElectionBallotPage
describe('ElectionBallotPage', () => {
  beforeEach(() => {
    api.getPollDetails.mockResolvedValue({
      poll_id: 'election',
      title: 'Election Ballot',
      options: {
        president: ['Candidate A', 'Candidate B'],
        senate: ['Candidate C', 'Candidate D']
      }
    });
    
    api.getVoteCounts.mockResolvedValue({
      vote_counts: {
        president: { 'Candidate A': 10, 'Candidate B': 5 },
        senate: { 'Candidate C': 8, 'Candidate D': 7 }
      }
    });
    
    api.getBlockchain.mockResolvedValue([
      { index: 0, hash: 'hash1', previous_hash: null, transactions: [], timestamp: new Date().toISOString() }
    ]);
    
    api.checkValidity.mockResolvedValue({ valid: true });
  });

  test('renders election ballot with contests', async () => {
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<ElectionBallotPage pollId="election" />, { voterValue: mockVoter });
    
    await waitFor(() => {
      expect(screen.getByText(/Election Ballot/i)).toBeInTheDocument();
      expect(screen.getByText(/Live Election Results/i)).toBeInTheDocument();
      expect(screen.getByText(/Cast Your Vote/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Your State/i)).toBeInTheDocument();
      expect(screen.getByText('President')).toBeInTheDocument();
      expect(screen.getByText('Senate')).toBeInTheDocument();
    });
  });

  test('handles vote submission for multiple contests', async () => {
    api.castVote.mockResolvedValue({});
    
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<ElectionBallotPage pollId="election" />, { voterValue: mockVoter });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Your State/i)).toBeInTheDocument();
    });
    
    // Fill state field
    fireEvent.change(screen.getByLabelText(/Your State/i), { target: { value: 'CA' } });
    
    // Make selections for each contest
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[0]); // Select first option for president
    fireEvent.click(radios[2]); // Select first option for senate
    
    // Submit vote
    fireEvent.click(screen.getByRole('button', { name: /Submit Vote/i }));

    await waitFor(() => {
      expect(api.castVote).toHaveBeenCalledWith({
        poll_id: 'election',
        voter_id: '123',
        vote: {
          president: 'Candidate A',
          senate: 'Candidate C',
          state: 'CA'
        }
      });
      expect(screen.getByText(/Election vote submitted successfully/i)).toBeInTheDocument();
    });
  });

  test('shows blockchain details when toggled', async () => {
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<ElectionBallotPage pollId="election" />, { voterValue: mockVoter });
    
    await waitFor(() => {
      expect(screen.getByText(/View Blockchain Details/i)).toBeInTheDocument();
    });
    
    // Click to show blockchain details
    fireEvent.click(screen.getByText(/View Blockchain Details/i));
    
    await waitFor(() => {
      expect(screen.getByText(/Blockchain is valid and secure/i)).toBeInTheDocument();
      expect(screen.getByText(/Block #0/i)).toBeInTheDocument();
    });
  });
});

// Tests for ProfilePage
describe('ProfilePage', () => {
  beforeEach(() => {
    api.getUserProfile.mockResolvedValue({
      name: 'Test User',
      zip_code: '12345'
    });
  });

  test('renders profile page with user data', async () => {
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<ProfilePage />, { voterValue: mockVoter });
    
    await waitFor(() => {
      expect(screen.getByText(/My Profile/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('123')).toBeInTheDocument(); // Voter ID field
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument(); // Name field
      expect(screen.getByDisplayValue('12345')).toBeInTheDocument(); // Zip code field
      expect(screen.getByText(/Change Password/i)).toBeInTheDocument();
    });
  });

  test('handles profile update', async () => {
    api.updateUserProfile.mockResolvedValue({
      user: {
        name: 'Updated User',
        zip_code: '54321'
      }
    });
    
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<ProfilePage />, { voterValue: mockVoter });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    });
    
    // Update name field
    fireEvent.change(screen.getByDisplayValue('Test User'), { target: { value: 'Updated User' } });
    
    // Update zip code field
    fireEvent.change(screen.getByDisplayValue('12345'), { target: { value: '54321' } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Update Profile/i }));

    await waitFor(() => {
      expect(api.updateUserProfile).toHaveBeenCalledWith('123', {
        name: 'Updated User',
        zip_code: '54321'
      });
      expect(screen.getByText(/Profile updated successfully/i)).toBeInTheDocument();
    });
  });

  test('shows password change dialog and handles password update', async () => {
    api.changePassword.mockResolvedValue({});
    
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<ProfilePage />, { voterValue: mockVoter });
    
    await waitFor(() => {
      expect(screen.getByText(/Change Password/i)).toBeInTheDocument();
    });
    
    // Open password dialog
    fireEvent.click(screen.getByText(/Change Password/i));
    
    await waitFor(() => {
      expect(screen.getByText(/Please enter your current password/i)).toBeInTheDocument();
    });
    
    // Fill password fields
    fireEvent.change(screen.getByLabelText(/Current Password/i), { target: { value: 'oldpass' } });
    fireEvent.change(screen.getByLabelText(/New Password/i), { target: { value: 'newpass' } });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), { target: { value: 'newpass' } });
    
    // Submit password change
    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    await waitFor(() => {
      expect(api.changePassword).toHaveBeenCalledWith('123', {
        old_password: 'oldpass',
        new_password: 'newpass'
      });
      expect(screen.getByText(/Password changed successfully/i)).toBeInTheDocument();
    });
  });
});

// Tests for VotePage
describe('VotePage', () => {
  beforeEach(() => {
    api.getPollDetails.mockResolvedValue({
      poll_id: 'test-poll-id',
      title: 'Test Poll',
      question: 'Test Question?',
      options: ['Option 1', 'Option 2']
    });
    
    api.getVoteVerification.mockResolvedValue({ hasVoted: false });
    
    api.getVoteCounts.mockResolvedValue({
      vote_counts: { 'Option 1': 5, 'Option 2': 3 }
    });
  });

  test('renders vote page with poll options', async () => {
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<VotePage />, { voterValue: mockVoter });
    
    await waitFor(() => {
      expect(screen.getByText(/Vote in Poll:/i)).toBeInTheDocument();
      expect(screen.getByText('Test Poll')).toBeInTheDocument();
      expect(screen.getByText('Test Question?')).toBeInTheDocument();
      expect(screen.getByLabelText('Option 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Option 2')).toBeInTheDocument();
    });
  });

  test('handles vote submission', async () => {
    api.castVote.mockResolvedValue({});
    
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<VotePage />, { voterValue: mockVoter });
    
    await waitFor(() => {
      expect(screen.getByLabelText('Option 1')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByLabelText('Option 1'));
    fireEvent.click(screen.getByRole('button', { name: /Submit Vote/i }));

    await waitFor(() => {
      expect(api.castVote).toHaveBeenCalledWith({
        poll_id: 'test-poll-id',
        voter_id: '123',
        vote: 'Option 1'
      });
      expect(screen.getByText(/Vote submitted successfully/i)).toBeInTheDocument();
    });
  });

  test('shows already voted message when user has voted', async () => {
    api.getVoteVerification.mockResolvedValue({ hasVoted: true });
    
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<VotePage />, { voterValue: mockVoter });
    
    await waitFor(() => {
      expect(screen.getByText(/You have already voted in this poll/i)).toBeInTheDocument();
    });
  });

  test('displays vote results after voting', async () => {
    api.castVote.mockResolvedValue({});
    
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(<VotePage />, { voterValue: mockVoter });
    
    await waitFor(() => {
      expect(screen.getByLabelText('Option 1')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByLabelText('Option 1'));
    fireEvent.click(screen.getByRole('button', { name: /Submit Vote/i }));

    await waitFor(() => {
      expect(screen.getByText(/Live Vote Results/i)).toBeInTheDocument();
      expect(screen.getByText(/Option 1: 5 votes/i)).toBeInTheDocument();
      expect(screen.getByText(/Option 2: 3 votes/i)).toBeInTheDocument();
    });
  });
});

// Tests for StateResultsMap
describe('StateResultsMap', () => {
  beforeEach(() => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/map/us_states')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ type: 'Topology', objects: { states: {} } })
        });
      } else if (url.includes('/vote_counts_by_state')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            by_state: {
              CA: { 'Candidate A': 10, 'Candidate B': 5 },
              NY: { 'Candidate B': 12, 'Candidate A': 8 }
            }
          })
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  test('renders state map component', async () => {
    renderWithProviders(<StateResultsMap pollId="election" />);
    
    await waitFor(() => {
      expect(screen.getByText(/State-Level Results/i)).toBeInTheDocument();
      expect(screen.getByText(/Legend/i)).toBeInTheDocument();
      expect(screen.getByText(/Candidate A = Red/i)).toBeInTheDocument();
      expect(screen.getByTestId('mock-map')).toBeInTheDocument();
      expect(screen.getByTestId('mock-geography')).toBeInTheDocument();
    });
  });

  test('handles refresh button click', async () => {
    renderWithProviders(<StateResultsMap pollId="election" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Refresh/i)).toBeInTheDocument();
    });
    
    // Reset mock counters
    global.fetch.mockClear();
    
    // Click refresh button
    fireEvent.click(screen.getByText(/Refresh/i));
    
    await waitFor(() => {
      // Verify both API calls were made again
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/map/us_states'));
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/vote_counts_by_state'));
    });
  });

  test('handles API errors gracefully', async () => {
    // Mock fetch to return error for map data
    global.fetch.mockImplementation((url) => {
      if (url.includes('/map/us_states')) {
        return Promise.reject(new Error('Failed to load map'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
    
    renderWithProviders(<StateResultsMap pollId="election" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error loading map data/i)).toBeInTheDocument();
    });
  });
});

// Tests for ProtectedRoute
describe('ProtectedRoute', () => {
  test('renders children when user is logged in', () => {
    const mockVoter = { voterId: '123', name: 'Test User' };
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      { voterValue: mockVoter }
    );
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  test('redirects to login when user is not logged in', () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'Navigate').mockImplementation(({ to }) => {
      mockNavigate(to);
      return null;
    });
    
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      { voterValue: null }
    );
    
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(require('react-router-dom').Navigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/login' }), {});
  });

  test('shows loading spinner when auth state is loading', () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      { 
        voterValue: null,
        voterContextOverrides: { loading: true }
      }
    );
    
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});