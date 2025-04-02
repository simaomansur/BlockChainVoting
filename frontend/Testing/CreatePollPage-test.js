// src/components/__tests__/CreatePollPage.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoterContext } from '../../context/VoterContext';
import { createPoll } from '../../api/api';
import CreatePollPage from '../CreatePollPage';

// Mock the API module
jest.mock('../../api/api', () => ({
  createPoll: jest.fn(),
}));

describe('CreatePollPage', () => {
  // Mock voter context values
  const mockVoterWithId = {
    voter: { voterId: 'voter123', name: 'Test Voter' },
  };
  
  const mockVoterWithoutId = {
    voter: null,
  };

  // Reset mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders the create poll form', () => {
      render(
        <VoterContext.Provider value={mockVoterWithId}>
          <CreatePollPage />
        </VoterContext.Provider>
      );
      
      expect(screen.getByText('Create a New Poll')).toBeInTheDocument();
      expect(screen.getByLabelText('Poll ID')).toBeInTheDocument();
      expect(screen.getByLabelText('Poll Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Poll Question')).toBeInTheDocument();
      expect(screen.getByLabelText('Options (comma-separated)')).toBeInTheDocument();
      expect(screen.getByLabelText('Public Poll')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Poll' })).toBeInTheDocument();
    });

    test('displays voter ID when logged in', () => {
      render(
        <VoterContext.Provider value={mockVoterWithId}>
          <CreatePollPage />
        </VoterContext.Provider>
      );
      
      const voterIdField = screen.getByLabelText('Voter ID');
      expect(voterIdField).toBeInTheDocument();
      expect(voterIdField).toHaveValue('voter123');
      expect(voterIdField).toBeDisabled();
    });

    test('displays empty voter ID when not logged in', () => {
      render(
        <VoterContext.Provider value={mockVoterWithoutId}>
          <CreatePollPage />
        </VoterContext.Provider>
      );
      
      const voterIdField = screen.getByLabelText('Voter ID');
      expect(voterIdField).toBeInTheDocument();
      expect(voterIdField).toHaveValue('');
    });
  });

  describe('Form Interactions', () => {
    test('updates form fields when user types', async () => {
      render(
        <VoterContext.Provider value={mockVoterWithId}>
          <CreatePollPage />
        </VoterContext.Provider>
      );
      
      const pollIdField = screen.getByLabelText('Poll ID');
      const titleField = screen.getByLabelText('Poll Title');
      const questionField = screen.getByLabelText('Poll Question');
      const optionsField = screen.getByLabelText('Options (comma-separated)');
      
      await userEvent.type(pollIdField, 'poll123');
      await userEvent.type(titleField, 'My Test Poll');
      await userEvent.type(questionField, 'What is your favorite color?');
      await userEvent.type(optionsField, 'Red, Blue, Green');
      
      expect(pollIdField).toHaveValue('poll123');
      expect(titleField).toHaveValue('My Test Poll');
      expect(questionField).toHaveValue('What is your favorite color?');
      expect(optionsField).toHaveValue('Red, Blue, Green');
    });

    test('toggles public poll checkbox', async () => {
      render(
        <VoterContext.Provider value={mockVoterWithId}>
          <CreatePollPage />
        </VoterContext.Provider>
      );
      
      const publicCheckbox = screen.getByLabelText('Public Poll');
      
      // Should be checked by default
      expect(publicCheckbox).toBeChecked();
      
      // Click to uncheck
      await userEvent.click(publicCheckbox);
      expect(publicCheckbox).not.toBeChecked();
      
      // Click to check again
      await userEvent.click(publicCheckbox);
      expect(publicCheckbox).toBeChecked();
    });
  });

  describe('Form Validation', () => {
    test('shows error when fields are missing', async () => {
      render(
        <VoterContext.Provider value={mockVoterWithId}>
          <CreatePollPage />
        </VoterContext.Provider>
      );
      
      // Submit with empty fields
      const submitButton = screen.getByRole('button', { name: 'Create Poll' });
      fireEvent.click(submitButton);
      
      expect(screen.getByText('All fields are required.')).toBeInTheDocument();
      expect(createPoll).not.toHaveBeenCalled();
    });

    test('shows error when voter is not logged in', async () => {
      // Fill in all fields but no voter
      render(
        <VoterContext.Provider value={mockVoterWithoutId}>
          <CreatePollPage />
        </VoterContext.Provider>
      );
      
      await userEvent.type(screen.getByLabelText('Poll ID'), 'poll123');
      await userEvent.type(screen.getByLabelText('Poll Title'), 'My Test Poll');
      await userEvent.type(screen.getByLabelText('Poll Question'), 'What is your favorite color?');
      await userEvent.type(screen.getByLabelText('Options (comma-separated)'), 'Red, Blue, Green');
      
      fireEvent.click(screen.getByRole('button', { name: 'Create Poll' }));
      
      expect(screen.getByText('Voter ID is missing. Please log in.')).toBeInTheDocument();
      expect(createPoll).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    test('successfully submits form with valid data', async () => {
      createPoll.mockResolvedValueOnce({ success: true });
      
      render(
        <VoterContext.Provider value={mockVoterWithId}>
          <CreatePollPage />
        </VoterContext.Provider>
      );
      
      await userEvent.type(screen.getByLabelText('Poll ID'), 'poll123');
      await userEvent.type(screen.getByLabelText('Poll Title'), 'My Test Poll');
      await userEvent.type(screen.getByLabelText('Poll Question'), 'What is your favorite color?');
      await userEvent.type(screen.getByLabelText('Options (comma-separated)'), 'Red, Blue, Green');
      
      fireEvent.click(screen.getByRole('button', { name: 'Create Poll' }));
      
      // Button should show loading state
      expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument();
      
      await waitFor(() => {
        expect(createPoll).toHaveBeenCalledWith({
          poll_id: 'poll123',
          title: 'My Test Poll',
          question: 'What is your favorite color?',
          options: ['Red', 'Blue', 'Green'],
          is_public: true
        });
        expect(screen.getByText('Poll created successfully!')).toBeInTheDocument();
      });
      
      // Form should be reset
      expect(screen.getByLabelText('Poll ID')).toHaveValue('');
      expect(screen.getByLabelText('Poll Title')).toHaveValue('');
    });

    test('handles API errors during submission', async () => {
      createPoll.mockRejectedValueOnce(new Error('Network error'));
      
      render(
        <VoterContext.Provider value={mockVoterWithId}>
          <CreatePollPage />
        </VoterContext.Provider>
      );
      
      await userEvent.type(screen.getByLabelText('Poll ID'), 'poll123');
      await userEvent.type(screen.getByLabelText('Poll Title'), 'My Test Poll');
      await userEvent.type(screen.getByLabelText('Poll Question'), 'What is your favorite color?');
      await userEvent.type(screen.getByLabelText('Options (comma-separated)'), 'Red, Blue, Green');
      
      fireEvent.click(screen.getByRole('button', { name: 'Create Poll' }));
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create Poll' })).toBeInTheDocument();
      });
    });
  });

  describe('Options Formatting', () => {
    test('correctly formats comma-separated options into an array', async () => {
      createPoll.mockResolvedValueOnce({ success: true });
      
      render(
        <VoterContext.Provider value={mockVoterWithId}>
          <CreatePollPage />
        </VoterContext.Provider>
      );
      
      await userEvent.type(screen.getByLabelText('Poll ID'), 'poll123');
      await userEvent.type(screen.getByLabelText('Poll Title'), 'My Test Poll');
      await userEvent.type(screen.getByLabelText('Poll Question'), 'Question?');
      await userEvent.type(screen.getByLabelText('Options (comma-separated)'), ' Option 1,  Option 2 , Option 3');
      
      fireEvent.click(screen.getByRole('button', { name: 'Create Poll' }));
      
      await waitFor(() => {
        expect(createPoll).toHaveBeenCalledWith(
          expect.objectContaining({
            options: ['Option 1', 'Option 2', 'Option 3']
          })
        );
      });
    });
  });

  describe('UI States', () => {
    test('shows and hides error alerts appropriately', async () => {
      render(
        <VoterContext.Provider value={mockVoterWithId}>
          <CreatePollPage />
        </VoterContext.Provider>
      );
      
      // Initially no alert
      expect(screen.queryByText('All fields are required.')).not.toBeInTheDocument();
      
      // Submit to show error
      fireEvent.click(screen.getByRole('button', { name: 'Create Poll' }));
      expect(screen.getByText('All fields are required.')).toBeInTheDocument();
      
      // Fill a field - error should remain until resubmit
      await userEvent.type(screen.getByLabelText('Poll ID'), 'poll123');
      expect(screen.getByText('All fields are required.')).toBeInTheDocument();
    });

    test('success message clears on new form interaction', async () => {
      createPoll.mockResolvedValueOnce({ success: true });
      
      render(
        <VoterContext.Provider value={mockVoterWithId}>
          <CreatePollPage />
        </VoterContext.Provider>
      );
      
      // Fill and submit form
      await userEvent.type(screen.getByLabelText('Poll ID'), 'poll123');
      await userEvent.type(screen.getByLabelText('Poll Title'), 'My Test Poll');
      await userEvent.type(screen.getByLabelText('Poll Question'), 'Question?');
      await userEvent.type(screen.getByLabelText('Options (comma-separated)'), 'Option 1, Option 2');
      
      fireEvent.click(screen.getByRole('button', { name: 'Create Poll' }));
      
      await waitFor(() => {
        expect(screen.getByText('Poll created successfully!')).toBeInTheDocument();
      });
      
      // Try to submit empty form again - success should be replaced with error
      fireEvent.click(screen.getByRole('button', { name: 'Create Poll' }));
      
      expect(screen.queryByText('Poll created successfully!')).not.toBeInTheDocument();
      expect(screen.getByText('All fields are required.')).toBeInTheDocument();
    });
  });
});