use std::sync::Arc;
use tokio::sync::Mutex;
use serde_json::{Value, json};
use crate::vote_service::{VoteService, VoteRequest, VoteServiceError};
use crate::poll_manager::{PollManager, Poll};

#[derive(Debug)]
pub enum VotingError {
    PollManagerError(String),
    DatabaseError(String),
    ValidationError(String),
    AlreadyVoted(String),
    PollNotFound(String),
    BlockchainError(String),
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
            VotingError::PollNotFound(msg) => write!(f, "Poll not found: {}", msg),
            VotingError::BlockchainError(msg) => write!(f, "Blockchain error: {}", msg),
        }
    }
}

impl std::error::Error for VotingError {}

pub struct VotingIntegration {
    pub poll_manager: Arc<Mutex<PollManager>>,
    pub vote_service: Arc<VoteService>,
}

impl VotingIntegration {
    pub fn new(
        poll_manager: Arc<Mutex<PollManager>>,
        vote_service: Arc<VoteService>,
    ) -> Self {
        Self { poll_manager, vote_service }
    }

    /// Cast a vote that is recorded both in the blockchain and database.
    pub async fn cast_vote(&self, poll_id: &str, voter_id: &str, vote_data: Value) -> Result<(), VotingError> {
        // Determine poll type using poll manager
        let poll_type = {
            let pm = self.poll_manager.lock().await;
            match pm.get_poll(poll_id) {
                Some(Poll::Election { .. }) => "election",
                Some(Poll::Normal { .. }) => "normal",
                None => {
                    return Err(VotingError::ValidationError(format!(
                        "Poll {} does not exist", poll_id
                    )))
                }
            }
        };
    
        // Check if the voter has already voted in the database
        let already_voted = self.vote_service.has_voted(poll_id, voter_id).await?;
        if already_voted {
            return Err(VotingError::AlreadyVoted(
                format!("Voter {} has already voted in poll {}", voter_id, poll_id)
            ));
        }
    
        // Process vote data into a structured JSON object WITHOUT adding a redundant "candidate" field
        let processed_vote = if vote_data.is_string() {
            // For simple string votes, create a default contest field instead of a candidate field
            json!({
                "voter_id": voter_id,
                "default_choice": vote_data.as_str().unwrap(),
                "poll_type": poll_type
            })
        } else if vote_data.is_object() {
            let mut vote_obj = vote_data.as_object().unwrap().clone();
            
            // Add voter_id and poll_type to the vote data
            vote_obj.insert("voter_id".to_string(), Value::String(voter_id.to_string()));
            vote_obj.insert("poll_type".to_string(), Value::String(poll_type.to_string()));
            
            // IMPORTANT: Remove the redundant "candidate" field if it exists
            vote_obj.remove("candidate");
            
            Value::Object(vote_obj)
        } else {
            // For other types, convert to a default field
            json!({
                "voter_id": voter_id,
                "default_choice": serde_json::to_string(&vote_data).unwrap_or("unknown".to_string()),
                "poll_type": poll_type
            })
        };
    
        // Add vote to blockchain using the processed vote
        {
            let mut pm = self.poll_manager.lock().await;
            pm.add_vote(poll_id, processed_vote.clone())
                .map_err(|e| VotingError::PollManagerError(e.to_string()))?;
        }
    
        // Record vote in database using the same processed vote
        let vote_request = VoteRequest {
            poll_id: poll_id.to_string(),
            voter_id: voter_id.to_string(),
            vote_data: processed_vote,
        };
        self.vote_service.record_vote(vote_request).await?;
    
        Ok(())
    }

    /// Verify a vote in both blockchain and database.
    pub async fn verify_vote(&self, poll_id: &str, voter_id: &str) -> Result<Value, VotingError> {
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

        let db_vote = self.vote_service.get_vote(poll_id, voter_id).await?;
        
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

    /// Get poll results from both blockchain and database.
    pub async fn get_poll_results(&self, poll_id: &str) -> Result<Value, VotingError> {
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
    
        let database_counts = self.vote_service.get_vote_counts(poll_id).await?;
    
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