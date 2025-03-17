use std::sync::Arc;
use tokio::sync::Mutex; // Use Tokio's async mutex
use serde_json::{Value, json};
use crate::vote_service::{VoteService, VoteRequest, VoteServiceError};
use crate::poll_manager::{PollManager, Poll};

pub struct VotingIntegration {
    poll_manager: Arc<Mutex<PollManager>>,
    vote_service: Arc<VoteService>,
}

#[derive(Debug)]
pub enum VotingError {
    PollManagerError(String),
    DatabaseError(String),
    ValidationError(String),
    AlreadyVoted(String),
}

impl From<VoteServiceError> for VotingError {
    fn from(err: VoteServiceError) -> Self {
        match err {
            VoteServiceError::DatabaseError(msg) => VotingError::DatabaseError(msg),
            VoteServiceError::ValidationError(msg) => VotingError::ValidationError(msg),
            VoteServiceError::AlreadyVoted(msg) => VotingError::AlreadyVoted(msg),
        }
    }
}

impl std::fmt::Display for VotingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VotingError::PollManagerError(msg) => write!(f, "Poll manager error: {}", msg),
            VotingError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            VotingError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            VotingError::AlreadyVoted(msg) => write!(f, "Already voted: {}", msg),
        }
    }
}

impl std::error::Error for VotingError {}

impl VotingIntegration {
    pub fn new(
        poll_manager: Arc<Mutex<PollManager>>,
        vote_service: Arc<VoteService>,
    ) -> Self {
        Self { poll_manager, vote_service }
    }

    // Cast a vote that is recorded both in the blockchain and database
    pub async fn cast_vote(&self, poll_id: &str, voter_id: &str, vote_data: Value) -> Result<(), VotingError> {
        // Check if the poll exists (async lock)
        let poll_exists = {
            let pm = self.poll_manager.lock().await;
            pm.get_poll(poll_id).is_some()
        };

        if !poll_exists {
            return Err(VotingError::ValidationError(format!("Poll {} does not exist", poll_id)));
        }

        // Check if the voter has already voted in the database
        let already_voted = self.vote_service.has_voted(poll_id, voter_id).await?;
        if already_voted {
            return Err(VotingError::AlreadyVoted(
                format!("Voter {} has already voted in poll {}", voter_id, poll_id)
            ));
        }

        // Prepare vote transaction for blockchain
        let vote_transaction = if poll_id == "election" {
            // Special handling for election poll
            let mut vote_obj = serde_json::Map::new();
            vote_obj.insert("voter_id".to_string(), Value::String(voter_id.to_string()));
            
            if let Value::Object(map) = &vote_data {
                for (k, v) in map {
                    vote_obj.insert(k.clone(), v.clone());
                }
            }
            
            Value::Object(vote_obj)
        } else {
            // For normal polls
            match &vote_data {
                Value::String(s) => Value::String(format!("Voter: {} -> Candidate: {}", voter_id, s)),
                _ => {
                    let mut vote_obj = serde_json::Map::new();
                    vote_obj.insert("voter_id".to_string(), Value::String(voter_id.to_string()));
                    
                    if let Value::Object(map) = &vote_data {
                        for (k, v) in map {
                            vote_obj.insert(k.clone(), v.clone());
                        }
                    }
                    
                    Value::Object(vote_obj)
                }
            }
        };

        // Add vote to blockchain
        {
            let mut pm = self.poll_manager.lock().await;
            pm.add_vote(poll_id, vote_transaction.clone())
                .map_err(|e| VotingError::PollManagerError(e.to_string()))?;
        }

        // Record vote in database
        let vote_request = VoteRequest {
            poll_id: poll_id.to_string(),
            voter_id: voter_id.to_string(),
            vote_data,
        };
        
        self.vote_service.record_vote(vote_request).await?;

        Ok(())
    }

    // Verify a vote in both blockchain and database
    pub async fn verify_vote(&self, poll_id: &str, voter_id: &str) -> Result<Value, VotingError> {
        // Check in blockchain
        let blockchain_result = {
            let pm = self.poll_manager.lock().await;
            match pm.get_poll(poll_id) {
                Some(Poll::Election { blockchain, .. }) => {
                    blockchain.find_vote(voter_id).map(|(block_index, vote_hash)| {
                        json!({
                            "verified": true,
                            "block_index": block_index,
                            "vote_hash": vote_hash,
                            "timestamp": blockchain.chain[block_index as usize].timestamp
                        })
                    })
                },
                Some(Poll::Normal { blockchain, .. }) => {
                    blockchain.find_vote(voter_id).map(|(block_index, vote_hash)| {
                        json!({
                            "verified": true,
                            "block_index": block_index,
                            "vote_hash": vote_hash,
                            "timestamp": blockchain.chain[block_index as usize].timestamp
                        })
                    })
                },
                None => None,
            }
        };

        // Check in database
        let db_vote = self.vote_service.get_vote(poll_id, voter_id).await?;
        
        // Combine results
        match (blockchain_result, db_vote) {
            (Some(blockchain_data), Some(db_record)) => {
                Ok(json!({
                    "verified": true,
                    "blockchain": blockchain_data,
                    "database": {
                        "id": db_record.id,
                        "created_at": db_record.created_at,
                        "vote": db_record.vote
                    }
                }))
            },
            (Some(blockchain_data), None) => {
                Ok(json!({
                    "verified": true,
                    "blockchain": blockchain_data,
                    "database": null,
                    "warning": "Vote found in blockchain but not in database"
                }))
            },
            (None, Some(db_record)) => {
                Ok(json!({
                    "verified": true,
                    "blockchain": null,
                    "database": {
                        "id": db_record.id,
                        "created_at": db_record.created_at,
                        "vote": db_record.vote
                    },
                    "warning": "Vote found in database but not in blockchain"
                }))
            },
            (None, None) => {
                Ok(json!({
                    "verified": false,
                    "error": "Vote not found in either blockchain or database"
                }))
            }
        }
    }

    // Get poll results from both blockchain and database
    pub async fn get_poll_results(&self, poll_id: &str) -> Result<Value, VotingError> {
        // Get blockchain counts - using JSON Value to handle different return types
        let blockchain_counts_json = {
            let pm = self.poll_manager.lock().await;
            match pm.get_poll(poll_id) {
                Some(Poll::Election { blockchain, .. }) => {
                    json!(blockchain.get_vote_counts())
                },
                Some(Poll::Normal { blockchain, .. }) => {
                    json!(blockchain.get_vote_counts())
                },
                None => return Err(VotingError::ValidationError(format!("Poll {} does not exist", poll_id))),
            }
        };
    
        // Get database counts
        let database_counts = self.vote_service.get_vote_counts(poll_id).await?;
    
        // Return combined results
        Ok(json!({
            "blockchain_results": blockchain_counts_json,
            "database_results": database_counts,
            "blockchain_data_type": match &blockchain_counts_json {
                Value::Object(map) => {
                    if map.values().any(|v| v.is_object()) {
                        "nested"
                    } else {
                        "flat"
                    }
                },
                _ => "unknown"
            }
        }))
    }
}
