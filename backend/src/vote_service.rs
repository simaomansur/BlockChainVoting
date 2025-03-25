use sqlx::{Pool, Postgres};
use serde::{Serialize, Deserialize};
use serde_json::{Value, json};
use chrono::{DateTime, Utc};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct VoteRecord {
    pub id: i32,
    pub poll_id: String,
    pub voter_id: String,
    pub vote: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteRequest {
    pub poll_id: String,
    pub voter_id: String,
    pub vote_data: Value,
}

#[derive(Debug)]
pub enum VoteServiceError {
    DatabaseError(String),
    ValidationError(String),
    AlreadyVoted(String),
}

impl std::fmt::Display for VoteServiceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VoteServiceError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            VoteServiceError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            VoteServiceError::AlreadyVoted(msg) => write!(f, "Already voted: {}", msg),
        }
    }
}

impl std::error::Error for VoteServiceError {}

pub struct VoteService {
    pool: Pool<Postgres>,
}

impl VoteService {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    /// Record a vote in the database.
    pub async fn record_vote(&self, vote_request: VoteRequest) -> Result<VoteRecord, VoteServiceError> {
        let existing_vote = sqlx::query_scalar::<_, i32>("SELECT id FROM votes WHERE poll_id = $1 AND voter_id = $2")
            .bind(&vote_request.poll_id)
            .bind(&vote_request.voter_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| VoteServiceError::DatabaseError(e.to_string()))?;

        if existing_vote.is_some() {
            return Err(VoteServiceError::AlreadyVoted(
                format!("Voter {} has already voted in poll {}", vote_request.voter_id, vote_request.poll_id)
            ));
        }

        let vote_record = sqlx::query_as::<_, VoteRecord>(
            r#"
            INSERT INTO votes (poll_id, voter_id, vote)
            VALUES ($1, $2, $3)
            RETURNING id, poll_id, voter_id, vote, created_at
            "#
        )
        .bind(&vote_request.poll_id)
        .bind(&vote_request.voter_id)
        .bind(&vote_request.vote_data)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| VoteServiceError::DatabaseError(e.to_string()))?;

        Ok(vote_record)
    }

    /// Get votes for a specific poll.
    pub async fn get_poll_votes(&self, poll_id: &str) -> Result<Vec<VoteRecord>, VoteServiceError> {
        let votes = sqlx::query_as::<_, VoteRecord>(
            "SELECT id, poll_id, voter_id, vote, created_at FROM votes WHERE poll_id = $1"
        )
        .bind(poll_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| VoteServiceError::DatabaseError(e.to_string()))?;

        Ok(votes)
    }

    /// Get a vote by voter_id and poll_id.
    pub async fn get_vote(&self, poll_id: &str, voter_id: &str) -> Result<Option<VoteRecord>, VoteServiceError> {
        let vote = sqlx::query_as::<_, VoteRecord>(
            "SELECT id, poll_id, voter_id, vote, created_at FROM votes WHERE poll_id = $1 AND voter_id = $2"
        )
        .bind(poll_id)
        .bind(voter_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| VoteServiceError::DatabaseError(e.to_string()))?;

        Ok(vote)
    }

    /// Get vote counts for a poll.
    pub async fn get_vote_counts(&self, poll_id: &str) -> Result<Value, VoteServiceError> {
        let votes = self.get_poll_votes(poll_id).await?;
        let mut counts = HashMap::new();
        for vote in votes {
            let key = match vote.vote {
                Value::String(s) => s,
                Value::Object(ref obj) => {
                    if let Some(Value::String(candidate)) = obj.get("candidate") {
                        candidate.clone()
                    } else if let Some(Value::String(choice)) = obj.get("choice") {
                        choice.clone()
                    } else {
                        serde_json::to_string(&vote.vote).unwrap_or_else(|_| "unknown".to_string())
                    }
                },
                _ => serde_json::to_string(&vote.vote).unwrap_or_else(|_| "unknown".to_string()),
            };
            *counts.entry(key).or_insert(0) += 1;
        }
        Ok(json!(counts))
    }

    /// Check if a voter has already voted in a specific poll.
    pub async fn has_voted(&self, poll_id: &str, voter_id: &str) -> Result<bool, VoteServiceError> {
        let exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM votes WHERE poll_id = $1 AND voter_id = $2)"
        )
        .bind(poll_id)
        .bind(voter_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| VoteServiceError::DatabaseError(e.to_string()))?;
    
        Ok(exists)
    }

    /// Get all polls that have votes.
    pub async fn get_active_polls(&self) -> Result<Vec<String>, VoteServiceError> {
        let poll_ids = sqlx::query_scalar::<_, String>("SELECT DISTINCT poll_id FROM votes")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| VoteServiceError::DatabaseError(e.to_string()))?;
    
        Ok(poll_ids)
    }
}
