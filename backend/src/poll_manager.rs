use std::collections::HashMap;
use crate::blockchain::Blockchain;
use crate::election_blockchain::ElectionBlockchain;
use serde::{Serialize, Deserialize};
use serde_json::{json, Value};
use sqlx::{Pool, Postgres, Row};  // For try_get
use crate::block::Block;
use hex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PollInput {
    pub title: String,
    pub question: String,
    pub options: Vec<String>,
    pub is_public: bool,
    pub poll_type: Option<String>, // "normal" or "election"
}

/// Represents a poll, which can be a Normal poll or an Election poll.
#[derive(Debug, Clone, Serialize, Deserialize)]
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
    pub pool: Pool<Postgres>,
}

impl PollManager {
    pub fn new(pool: Pool<Postgres>) -> Self {
        PollManager {
            polls: HashMap::new(),
            pool,
        }
    }

    /// Creates a new poll, auto-generates a poll ID, and persists it.
    /// For normal polls, the blockchain starts with a genesis block.
    /// For election polls, each vote will be recorded in its own block.
    pub async fn create_poll(&mut self, poll: PollInput) -> Result<String, sqlx::Error> {
        use uuid::Uuid;
        // Generate a unique poll_id.
        let poll_id = Uuid::new_v4().to_string();
    
        // Use the provided poll_type, or default to "normal".
        let poll_type = poll.poll_type.clone().unwrap_or_else(|| "normal".to_string());
    
        // Persist poll metadata to the database.
        sqlx::query(
            "INSERT INTO polls (poll_id, title, question, options, is_public, poll_type)
             VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(&poll_id)
        .bind(&poll.title)
        .bind(&poll.question)
        .bind(serde_json::to_value(&poll.options).unwrap())
        .bind(poll.is_public)
        .bind(&poll_type)
        .execute(&self.pool)
        .await?;
    
        // Create in-memory poll instance based on poll_type.
        if poll_type == "election" {
            let blockchain = ElectionBlockchain::new();
            let poll_instance = Poll::Election { metadata: poll, blockchain };
            self.polls.insert(poll_id.clone(), poll_instance);
        } else {
            let blockchain = Blockchain::new();
            let poll_instance = Poll::Normal { metadata: poll, blockchain };
            self.polls.insert(poll_id.clone(), poll_instance);
        }
    
        Ok(poll_id)
    }
    
    /// Loads a poll from the database and reconstructs its in-memory blockchain.
    /// For normal polls, it uses Block::from_db_row.
    /// For election polls, it uses ElectionBlock::from_db_row.
    pub async fn load_poll(&mut self, poll_id: &str) -> Result<(), sqlx::Error> {
        // Query poll metadata.
        let poll_row = sqlx::query(
            "SELECT poll_id, title, question, options, is_public, poll_type FROM polls WHERE poll_id = $1"
        )
        .bind(poll_id)
        .fetch_one(&self.pool)
        .await?;
        
        let title: String = poll_row.try_get("title")?;
        let question: String = poll_row.try_get("question")?;
        // Assume the options column is stored as a JSON array string.
        let options_value: Value = poll_row.try_get("options")?;
        let options: Vec<String> = serde_json::from_value(options_value).unwrap_or_default();
        let is_public: bool = poll_row.try_get("is_public")?;
        let poll_type: String = poll_row.try_get("poll_type")?;
        
        let poll_input = PollInput {
            title,
            question,
            options,
            is_public,
            poll_type: Some(poll_type.clone()),
        };
        
        if poll_type == "election" {
            let mut blockchain = ElectionBlockchain::new();
            let rows = sqlx::query(
                "SELECT block_index, timestamp, previous_hash, hash, transactions FROM blocks WHERE poll_id = $1 ORDER BY block_index ASC"
            )
            .bind(poll_id)
            .fetch_all(&self.pool)
            .await?;
            
            for row in rows {
                // Reconstruct an ElectionBlock using its from_db_row method.
                let election_block = crate::election_block::ElectionBlock::from_db_row(&row)?;
                blockchain.chain.push(election_block);
            }
            let poll_instance = Poll::Election { metadata: poll_input, blockchain };
            self.polls.insert(poll_id.to_string(), poll_instance);
        } else {
            let mut blockchain = Blockchain::new();
            let rows = sqlx::query(
                "SELECT block_index, timestamp, previous_hash, hash, transactions FROM blocks WHERE poll_id = $1 ORDER BY block_index ASC"
            )
            .bind(poll_id)
            .fetch_all(&self.pool)
            .await?;
            
            for row in rows {
                let block = Block::from_db_row(&row)?;
                blockchain.chain.push(block);
            }
            let poll_instance = Poll::Normal { metadata: poll_input, blockchain };
            self.polls.insert(poll_id.to_string(), poll_instance);
        }
        
        Ok(())
    }

    /// Adds a vote to the specified poll.
    /// For normal polls, expects a JSON object vote; for election polls, passes vote data directly.
    pub fn add_vote(&mut self, poll_id: &str, vote_data: Value) -> Result<(), String> {
        if let Some(poll) = self.polls.get_mut(poll_id) {
            match poll {
                Poll::Election { blockchain, .. } => {
                    blockchain.add_vote(vote_data)
                },
                Poll::Normal { blockchain, .. } => {
                    // For normal polls, ensure the vote is a JSON object.
                    let vote_obj = if vote_data.is_object() {
                        vote_data
                    } else if let Some(vote_str) = vote_data.as_str() {
                        json!({ "vote": vote_str })
                    } else {
                        return Err("Normal poll expects a plain string or JSON object vote".to_string());
                    };
                    blockchain.add_block(vote_obj);
                    Ok(())
                }
            }
        } else {
            Err(format!("Poll '{}' does not exist", poll_id))
        }
    }
    
    /// Persists a block to the database.
    /// Serializes the block's transactions as a JSON string.
    pub async fn persist_block(&self, poll_id: &str, block: &Block) -> Result<(), sqlx::Error> {
        // Serialize transactions as a JSON string.
        let transactions_json = serde_json::to_string(&block.transactions).unwrap_or_default();
        // Get the Merkle root as a hex string, if available.
        let merkle_root = block.merkle_root().map(|r| hex::encode(r));
        
        sqlx::query(
            "INSERT INTO blocks (poll_id, block_index, timestamp, previous_hash, hash, transactions, merkle_root)
             VALUES ($1, $2, $3, $4, $5, $6, $7)"
        )
        .bind(poll_id)
        .bind(block.index)
        .bind(block.timestamp)
        .bind(&block.previous_hash)
        .bind(&block.hash)
        .bind(transactions_json)
        .bind(merkle_root)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Retrieves a poll by poll_id.
    pub fn get_poll(&self, poll_id: &str) -> Option<&Poll> {
        self.polls.get(poll_id)
    }
}
