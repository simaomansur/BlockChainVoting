// poll_manager.rs

use std::collections::HashMap;
use crate::blockchain::Blockchain;
use serde::{Serialize, Deserialize};

/// Represents the input data for creating a poll.
/// Contains metadata such as poll_id, title, question, allowed options, and visibility.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PollInput {
    pub poll_id: String,
    pub title: String,
    pub question: String,
    /// Allowed vote options (e.g., ["Dog", "Cat", "Rabbit"]).
    pub options: Vec<String>,
    pub is_public: bool,
}

/// Represents a single poll with its metadata and associated blockchain.
#[derive(Debug, Clone)]
pub struct Poll {
    /// Metadata for the poll.
    pub metadata: PollInput,
    /// The blockchain that stores votes (and optionally poll creation data).
    pub blockchain: Blockchain,
}

/// Manages multiple polls, each represented by a `Poll` instance.
pub struct PollManager {
    /// A hash map linking a poll ID to its corresponding poll.
    pub polls: HashMap<String, Poll>,
}

impl PollManager {
    /// Creates a new `PollManager` with no polls.
    pub fn new() -> Self {
        PollManager {
            polls: HashMap::new(),
        }
    }

    /// Creates a new poll using the provided poll metadata.
    ///
    /// # Arguments
    ///
    /// * `poll` - A `PollInput` instance containing poll details (including allowed options).
    pub fn create_poll(&mut self, poll: PollInput) {
        // Initialize a new blockchain for the poll.
        let blockchain = Blockchain::new();
        // Create a new Poll instance that includes its metadata and blockchain.
        let poll_instance = Poll {
            metadata: poll.clone(),
            blockchain,
        };
        // Insert the poll into the manager using poll_id as the key.
        self.polls.insert(poll.poll_id.clone(), poll_instance);
    }

    /// Adds a vote to the poll's blockchain.
    ///
    /// # Arguments
    ///
    /// * `poll_id` - The identifier for the poll.
    /// * `vote_data` - A string representing the vote (e.g., "Voter: John -> Candidate: Dog").
    ///
    /// # Returns
    ///
    /// * `Ok(())` if the vote was added successfully.
    /// * `Err(String)` if the poll does not exist.
    pub fn add_vote(&mut self, poll_id: &str, vote_data: String) -> Result<(), String> {
        if let Some(poll) = self.polls.get_mut(poll_id) {
            poll.blockchain.add_block(vote_data);
            Ok(())
        } else {
            Err(format!("Poll '{}' does not exist", poll_id))
        }
    }

    /// Retrieves a poll (including its metadata and blockchain) for a given poll ID.
    pub fn get_poll(&self, poll_id: &str) -> Option<&Poll> {
        self.polls.get(poll_id)
    }
}
