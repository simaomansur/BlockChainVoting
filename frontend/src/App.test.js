// src/App.test.js
test('Example test', () => {
    expect(true).toBe(true);
  });
  // src/App.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import App from './App';
import { VoterProvider } from './context/VoterContext';
import { PollProvider } from './context/PollContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import HomePage from './components/HomePage';
import CreatePollPage from './components/CreatePollPage';
import ExistingPollsPage from './components/ExistingPollsPage';
import PollDetailsPage from './components/PollDetailsPage';
import ElectionBallotPage from './components/ElectionBallotPage';
import ProfilePage from './components/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';

// Mock API calls
jest.mock('./api/api', () => ({
  loginUser: jest.fn(),
  registerUser: jest.fn(),
  getUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
  getExistingPolls: jest.fn(),
  createPoll: jest.fn(),
  getPollDetails: jest.fn(),
  getTrendingPolls: jest.fn(),
  getVoteCounts: jest.fn(),
  castVote: jest.fn(),
  verifyVote: jest.fn(),
  getBlockchain: jest.fn(),
  checkValidity: jest.fn(),
  getVoteVerification: jest.fn()
}));

// Import mocked API
import * as api from './api/api';

// Helper to render components with required providers
const renderWithProviders = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  
  return render(
    <PollProvider>
      <VoterProvider>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </VoterProvider>
    </PollProvider>
  );
};

// Tests for App component
describe('App Component', () => {
  test('renders without crashing', () => {
    renderWithProviders(<App />);
    expect(screen.getByText(/Blockchain Voting/i)).toBeInTheDocument();
  });

  test('displays login and register links when not logged in', () => {
    renderWithProviders(<App />);
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
  });
});

// Tests for LoginPage component
describe('LoginPage Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('renders login form', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/Voter Login/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });

  test('handles login submission', async () => {
    // Mock successful login response
    api.loginUser.mockResolvedValueOnce({
      user: {
        voter_id: 'test123',
        name: 'Test User',
        zip_code: '12345',
        birth_date: '1990-01-01'
      }
    });

    renderWithProviders(<LoginPage />);
    
    // Fill in form
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' }
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));
    
    // Wait for API call
    await waitFor(() => {
      expect(api.loginUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  test('displays error on login failure', async () => {
    // Mock login failure
    api.loginUser.mockRejectedValueOnce({
      response: {
        data: {
          error: 'Invalid credentials'
        }
      }
    });

    renderWithProviders(<LoginPage />);
    
    // Fill in form
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'wrongpassword' }
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });
});

// Tests for RegisterPage component
describe('RegisterPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  test('handles registration submission', async () => {
    // Mock successful registration
    api.registerUser.mockResolvedValueOnce({
      voter_id: 'new123'
    });

    renderWithProviders(<RegisterPage />);
    
    // Fill in form
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'New User' }
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'new@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/Zip Code/i), {
      target: { value: '12345' }
    });
    fireEvent.change(screen.getByLabelText(/Birth Date/i), {
      target: { value: '1990-01-01' }
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));
    
    // Wait for API call
    await waitFor(() => {
      expect(api.registerUser).toHaveBeenCalledWith({
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
        zip_code: '12345',
        birth_date: '1990-01-01'
      });
    });
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/Registration successful/i)).toBeInTheDocument();
    });
  });

  test('validates passwords match', async () => {
    renderWithProviders(<RegisterPage />);
    
    // Fill in form with non-matching passwords
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'New User' }
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'new@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'differentpassword' }
    });
    fireEvent.change(screen.getByLabelText(/Zip Code/i), {
      target: { value: '12345' }
    });
    fireEvent.change(screen.getByLabelText(/Birth Date/i), {
      target: { value: '1990-01-01' }
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
    
    // API should not be called
    expect(api.registerUser).not.toHaveBeenCalled();
  });
});

// Tests for HomePage component
describe('HomePage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the welcome message', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Welcome to the Blockchain Voting System/i)).toBeInTheDocument();
  });

  test('displays login/register buttons when not logged in', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Please log in or register to continue/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
  });

  test('fetches trending polls on load', async () => {
    // Mock trending polls data
    const mockTrendingPolls = [
      { poll_id: '1', title: 'Test Poll 1', question: 'Question 1?', totalVotes: 10 },
      { poll_id: '2', title: 'Test Poll 2', question: 'Question 2?', totalVotes: 5 }
    ];
    
    api.getTrendingPolls.mockResolvedValueOnce(mockTrendingPolls);
    
    renderWithProviders(<HomePage />);
    
    // Check API was called
    expect(api.getTrendingPolls).toHaveBeenCalled();
    
    // Wait for trending polls to display
    await waitFor(() => {
      expect(screen.getByText(/Test Poll 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Poll 2/i)).toBeInTheDocument();
    });
  });
});

// Tests for CreatePollPage component
describe('CreatePollPage Component', () => {
  // Mock voter context
  const mockVoter = {
    voterId: 'voter123',
    name: 'Test Voter'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage for VoterContext
    Storage.prototype.getItem = jest.fn(() => JSON.stringify(mockVoter));
  });

  test('renders the create poll form', async () => {
    renderWithProviders(<CreatePollPage />);
    
    // Check form elements
    expect(screen.getByText(/Create a New Poll/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Poll Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Poll Question/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Options/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Public Poll/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Poll/i })).toBeInTheDocument();
  });

  test('handles poll creation submission', async () => {
    // Mock successful poll creation
    api.createPoll.mockResolvedValueOnce({
      poll_id: 'newpoll123'
    });

    renderWithProviders(<CreatePollPage />);
    
    // Fill in form
    fireEvent.change(screen.getByLabelText(/Poll Title/i), {
      target: { value: 'New Test Poll' }
    });
    fireEvent.change(screen.getByLabelText(/Poll Question/i), {
      target: { value: 'What is your favorite color?' }
    });
    fireEvent.change(screen.getByLabelText(/Options/i), {
      target: { value: 'Red, Blue, Green' }
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Create Poll/i }));
    
    // Wait for API call
    await waitFor(() => {
      expect(api.createPoll).toHaveBeenCalledWith({
        title: 'New Test Poll',
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green'],
        is_public: true
      });
    });
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/Poll created successfully/i)).toBeInTheDocument();
    });
  });

  test('validates required fields', async () => {
    renderWithProviders(<CreatePollPage />);
    
    // Submit empty form
    fireEvent.click(screen.getByRole('button', { name: /Create Poll/i }));
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/All fields are required/i)).toBeInTheDocument();
    });
    
    // API should not be called
    expect(api.createPoll).not.toHaveBeenCalled();
  });
});

// Tests for ExistingPollsPage component
describe('ExistingPollsPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches and displays existing polls', async () => {
    // Mock polls data
    const mockPolls = [
      { poll_id: '1', title: 'Test Poll 1', question: 'Question 1?' },
      { poll_id: '2', title: 'Test Poll 2', question: 'Question 2?' }
    ];
    
    api.getExistingPolls.mockResolvedValueOnce(mockPolls);
    
    renderWithProviders(<ExistingPollsPage />);
    
    // Check loading state
    expect(screen.getByText(/Existing Polls/i)).toBeInTheDocument();
    
    // Check API was called
    expect(api.getExistingPolls).toHaveBeenCalled();
    
    // Wait for polls to display
    await waitFor(() => {
      expect(screen.getByText(/Test Poll 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Poll 2/i)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /View/i })).toHaveLength(2);
    });
  });

  test('displays message when no polls are available', async () => {
    // Mock empty polls array
    api.getExistingPolls.mockResolvedValueOnce([]);
    
    renderWithProviders(<ExistingPollsPage />);
    
    // Wait for no polls message
    await waitFor(() => {
      expect(screen.getByText(/No polls available/i)).toBeInTheDocument();
    });
  });

  test('handles API error', async () => {
    // Mock API error
    api.getExistingPolls.mockRejectedValueOnce(new Error('Failed to fetch polls'));
    
    renderWithProviders(<ExistingPollsPage />);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch polls/i)).toBeInTheDocument();
    });
  });
});

// Tests for PollDetailsPage component
describe('PollDetailsPage Component', () => {
  // Mock useParams
  jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: () => ({ pollId: 'poll123' })
  }));

  // Mock voter context
  const mockVoter = {
    voterId: 'voter123',
    name: 'Test Voter'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage for VoterContext
    Storage.prototype.getItem = jest.fn(() => JSON.stringify(mockVoter));

    // Mock API responses
    api.getPollDetails.mockResolvedValue({
      poll_id: 'poll123',
      title: 'Test Poll',
      question: 'What is your favorite color?',
      options: ['Red', 'Blue', 'Green'],
      createdAt: '2023-04-01T10:00:00Z'
    });
    
    api.getVoteCounts.mockResolvedValue({
      vote_counts: {
        'Red': 5,
        'Blue': 3,
        'Green': 2
      }
    });
    
    api.getVoteVerification.mockResolvedValue({
      hasVoted: false
    });
    
    api.getBlockchain.mockResolvedValue([
      {
        index: 0,
        timestamp: '2023-04-01T10:00:00Z',
        transactions: [],
        hash: 'genesis-hash',
        previous_hash: '0',
        finalized: true
      }
    ]);
  });

  test('renders poll details and voting form', async () => {
    // Mock useParams implementation for this test
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ pollId: 'poll123' });
    
    renderWithProviders(<PollDetailsPage />);
    
    // Wait for poll details to load
    await waitFor(() => {
      expect(screen.getByText(/Test Poll/i)).toBeInTheDocument();
      expect(screen.getByText(/What is your favorite color?/i)).toBeInTheDocument();
      
      // Check for voting options
      expect(screen.getByLabelText(/Red/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Blue/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Green/i)).toBeInTheDocument();
      
      // Check for submit button
      expect(screen.getByRole('button', { name: /Submit Vote/i })).toBeInTheDocument();
    });
  });

  test('submits vote and updates results', async () => {
    // Mock useParams implementation for this test
    jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ pollId: 'poll123' });
    
    // Mock successful vote submission
    api.castVote.mockResolvedValueOnce({ success: true });
    
    // Updated vote counts after voting
    const updatedCounts = {
      vote_counts: {
        'Red': 6,  // Increased by 1
        'Blue': 3,
        'Green': 2
      }
    };
    
    // First call returns initial counts, second call returns updated counts
    api.getVoteCounts.mockResolvedValueOnce({
      vote_counts: {
        'Red': 5,
        'Blue': 3,
        'Green': 2
      }
    }).mockResolvedValueOnce(updatedCounts);
    
    renderWithProviders(<PollDetailsPage />);
    
    // Wait for poll to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Red/i)).toBeInTheDocument();
    });
    
    // Select an option and submit
    fireEvent.click(screen.getByLabelText(/Red/i));
    fireEvent.click(screen.getByRole('button', { name: /Submit Vote/i }));
    
    // Wait for vote submission and results update
    await waitFor(() => {
      expect(api.castVote).toHaveBeenCalledWith({
        poll_id: 'poll123',
        voter_id: 'voter123',
        vote: {
          choice: 'Red',
          state: 'Unknown'
        }
      });
      
      // Check for success message
      expect(screen.getByText(/Vote submitted successfully/i)).toBeInTheDocument();
    });
  });
});

// Tests for ElectionBallotPage component
describe('ElectionBallotPage Component', () => {
  // Mock voter context
  const mockVoter = {
    voterId: 'voter123',
    name: 'Test Voter'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage for VoterContext
    Storage.prototype.getItem = jest.fn(() => JSON.stringify(mockVoter));

    // Mock API responses
    api.getPollDetails.mockResolvedValue({
      poll_id: 'election',
      title: 'Presidential Election',
      options: [JSON.stringify({
        president: ['Candidate A', 'Candidate B', 'Candidate C'],
        senate: ['Senator X', 'Senator Y']
      })]
    });
    
    api.getVoteCounts.mockResolvedValue({
      vote_counts: {
        president: {
          'Candidate A': 10,
          'Candidate B': 8,
          'Candidate C': 5
        },
        senate: {
          'Senator X': 12,
          'Senator Y': 11
        }
      }
    });
  });

  test('renders election ballot with all contests', async () => {
    renderWithProviders(<ElectionBallotPage />);
    
    // Wait for election data to load
    await waitFor(() => {
      expect(screen.getByText(/Election Ballot/i)).toBeInTheDocument();
      
      // Check for contests
      expect(screen.getByText(/President/i)).toBeInTheDocument();
      expect(screen.getByText(/Senate/i)).toBeInTheDocument();
      
      // Check for candidates
      expect(screen.getByLabelText(/Candidate A/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Candidate B/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Senator X/i)).toBeInTheDocument();
    });
  });

  test('requires state information before submitting vote', async () => {
    renderWithProviders(<ElectionBallotPage />);
    
    // Wait for election data to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Candidate A/i)).toBeInTheDocument();
    });
    
    // Select options without entering state
    fireEvent.click(screen.getByLabelText(/Candidate A/i));
    fireEvent.click(screen.getByLabelText(/Senator X/i));
    
    // Try to submit without state
    fireEvent.click(screen.getByRole('button', { name: /Submit Vote/i }));
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Please enter the state code/i)).toBeInTheDocument();
    });
    
    // API should not be called
    expect(api.castVote).not.toHaveBeenCalled();
  });

  test('submits complete election ballot', async () => {
    // Mock successful vote submission
    api.castVote.mockResolvedValueOnce({ success: true });
    
    renderWithProviders(<ElectionBallotPage />);
    
    // Wait for election data to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Candidate A/i)).toBeInTheDocument();
    });
    
    // Fill in state and select options
    fireEvent.change(screen.getByLabelText(/Your State/i), {
      target: { value: 'CA' }
    });
    fireEvent.click(screen.getByLabelText(/Candidate A/i));
    fireEvent.click(screen.getByLabelText(/Senator X/i));
    
    // Submit vote
    fireEvent.click(screen.getByRole('button', { name: /Submit Vote/i }));
    
    // Wait for vote submission
    await waitFor(() => {
      expect(api.castVote).toHaveBeenCalledWith({
        poll_id: 'election',
        voter_id: 'voter123',
        vote: {
          president: 'Candidate A',
          senate: 'Senator X',
          state: 'CA'
        }
      });
      
      // Check for success message
      expect(screen.getByText(/Election vote submitted successfully/i)).toBeInTheDocument();
    });
  });
});

// Tests for ProfilePage component
describe('ProfilePage Component', () => {
  // Mock voter context
  const mockVoter = {
    voterId: 'voter123',
    name: 'Test Voter',
    zip: '12345'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage for VoterContext
    Storage.prototype.getItem = jest.fn(() => JSON.stringify(mockVoter));

    // Mock API responses
    api.getUserProfile.mockResolvedValue({
      name: 'Test Voter',
      zip_code: '12345'
    });
  });

  test('fetches and displays user profile', async () => {
    renderWithProviders(<ProfilePage />);
    
    // Check initial loading
    expect(screen.getByText(/My Profile/i)).toBeInTheDocument();
    
    // Wait for profile data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Voter')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12345')).toBeInTheDocument();
      expect(screen.getByDisplayValue('voter123')).toBeInTheDocument();
    });
  });

  test('handles profile update', async () => {
    // Mock successful profile update
    api.updateUserProfile.mockResolvedValueOnce({
      user: {
        name: 'Updated Name',
        zip_code: '54321'
      }
    });
    
    renderWithProviders(<ProfilePage />);
    
    // Wait for profile data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Voter')).toBeInTheDocument();
    });
    
    // Update profile fields
    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: 'Updated Name' }
    });
    fireEvent.change(screen.getByLabelText(/Zip Code/i), {
      target: { value: '54321' }
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Update Profile/i }));
    
    // Wait for API call and success message
    await waitFor(() => {
      expect(api.updateUserProfile).toHaveBeenCalledWith('voter123', {
        name: 'Updated Name',
        zip_code: '54321'
      });
      expect(screen.getByText(/Profile updated successfully/i)).toBeInTheDocument();
    });
  });

  test('opens password change dialog', async () => {
    renderWithProviders(<ProfilePage />);
    
    // Wait for profile data to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Change Password/i })).toBeInTheDocument();
    });
    
    // Click change password button
    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }));
    
    // Check dialog appears
    expect(screen.getByText(/Change Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
  });

  test('validates passwords match when changing password', async () => {
    renderWithProviders(<ProfilePage />);
    
    // Wait for profile data to load and open dialog
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Change Password/i })).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }));
    
    // Fill in non-matching passwords
    fireEvent.change(screen.getByLabelText(/Current Password/i), {
      target: { value: 'oldpassword' }
    });
    fireEvent.change(screen.getByLabelText(/New Password/i), {
      target: { value: 'newpassword' }
    });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: 'differentpassword' }
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/New passwords do not match/i)).toBeInTheDocument();
    });
    
    // API should not be called
    expect(api.changePassword).not.toHaveBeenCalled();
  });
});

// Tests for ProtectedRoute component
describe('ProtectedRoute Component', () => {
  test('redirects to login when not logged in', () => {
    // Mock useNavigate from react-router-dom
    const mockNavigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'Navigate').mockImplementation(({ to }) => {
      mockNavigate(to);
      return null;
    });
    
    // Mock empty voter context (not logged in)
    Storage.prototype.getItem = jest.fn(() => null);
    
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    
    // Should redirect to login
    expect(screen.queryByText(/Protected Content/i)).not.toBeInTheDocument();
  });

  test('renders children when logged in', () => {
    // Mock logged in voter
    Storage.prototype.getItem = jest.fn(() => JSON.stringify({
      voterId: 'voter123',
      name: 'Test Voter'
    }));
    
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    
    // Should render the protected content
    expect(screen.getByText(/Protected Content/i)).toBeInTheDocument();
  });
});
  