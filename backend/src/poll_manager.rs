use std::collections::HashMap;
use crate::blockchain::Blockchain;
use crate::election_blockchain::ElectionBlockchain;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PollInput {
    pub poll_id: String,
    pub title: String,
    pub question: String,
    pub options: Vec<String>,
    pub is_public: bool,
}

/// Represents a poll, which can be a Normal poll or an Election poll.
#[derive(Debug, Clone)]
pub enum Poll {
    Normal {
        metadata: PollInput,
        blockchain: Blockchain,
    },
    Election {
        metadata: PollInput,
        blockchain: ElectionBlockchain,
    },
}

/// Manages polls by mapping poll IDs to Poll objects.
pub struct PollManager {
    pub polls: HashMap<String, Poll>,
}

impl PollManager {
    pub fn new() -> Self {
        PollManager {
            polls: HashMap::new(),
        }
    }

    /// Creates a new poll.
    pub fn create_poll(&mut self, poll: PollInput) {
        if poll.poll_id == "election" {
            let blockchain = ElectionBlockchain::new();
            let poll_instance = Poll::Election { metadata: poll.clone(), blockchain };
            self.polls.insert(poll.poll_id.clone(), poll_instance);
        } else {
            let blockchain = Blockchain::new();
            let poll_instance = Poll::Normal { metadata: poll.clone(), blockchain };
            self.polls.insert(poll.poll_id.clone(), poll_instance);
        }
    }

    /// Adds a vote to the specified poll.
    pub fn add_vote(
        &mut self,
        poll_id: &str,
        vote_data: serde_json::Value,
    ) -> Result<(), String> {
        if let Some(poll) = self.polls.get_mut(poll_id) {
            match poll {
                Poll::Election { blockchain, .. } => {
                    blockchain.add_vote(vote_data)
                },
                Poll::Normal { blockchain, .. } => {
                    if let Some(vote_str) = vote_data.as_str() {
                        blockchain.add_block(vote_str.to_owned());
                        Ok(())
                    } else {
                        Err("Normal poll expects a plain string vote".to_string())
                    }
                }
            }
        } else {
            Err(format!("Poll '{}' does not exist", poll_id))
        }
    }
    
      

    /// Retrieves a poll by poll_id.
    pub fn get_poll(&self, poll_id: &str) -> Option<&Poll> {
        self.polls.get(poll_id)
    }
}
