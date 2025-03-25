use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use serde_json::Value;
use crate::blockchain::Blockchain;
use crate::election_blockchain::ElectionBlockchain;
use sqlx::{Pool, Postgres, Row};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PollInput {
    pub title: String,
    pub question: String,
    pub options: Vec<String>,
    pub is_public: bool,
    pub poll_type: Option<String>, // "normal" or "election"
}

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
    pub async fn create_poll(&mut self, poll: PollInput) -> Result<String, sqlx::Error> {
        use uuid::Uuid;
        let poll_id = Uuid::new_v4().to_string();
    
        let poll_type = poll.poll_type.clone().unwrap_or_else(|| "normal".to_string());
    
        // Enforce uniqueness for election polls.
        if poll_type == "election" {
            if self.polls.values().any(|p| matches!(p, Poll::Election { .. })) {
                return Err(sqlx::Error::Protocol("Election poll already exists".into()));
            }
        }
    
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
    
        if poll_type == "election" {
            let blockchain = crate::election_blockchain::ElectionBlockchain::new();
            let poll_instance = Poll::Election { metadata: poll, blockchain };
            self.polls.insert(poll_id.clone(), poll_instance);
        } else {
            let blockchain = {
                let rows = sqlx::query("SELECT block_index FROM blocks WHERE poll_id = $1 ORDER BY block_index ASC")
                    .bind(&poll_id)
                    .fetch_all(&self.pool)
                    .await?;
                if rows.is_empty() {
                    Blockchain::new()
                } else {
                    Blockchain { chain: Vec::new() }
                }
            };
            let poll_instance = Poll::Normal { metadata: poll, blockchain };
            self.polls.insert(poll_id.clone(), poll_instance);
        }
    
        Ok(poll_id)
    }
    
    /// Loads a poll from the database and reconstructs its in-memory blockchain.
    pub async fn load_poll(&mut self, poll_id: &str) -> Result<(), sqlx::Error> {
        let poll_row = sqlx::query(
            "SELECT poll_id, title, question, options, is_public, poll_type FROM polls WHERE poll_id = $1"
        )
        .bind(poll_id)
        .fetch_one(&self.pool)
        .await?;
        
        let title: String = poll_row.try_get("title")?;
        let question: String = poll_row.try_get("question")?;
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
            let mut blockchain = {
                let rows = sqlx::query("SELECT block_index FROM blocks WHERE poll_id = $1 ORDER BY block_index ASC")
                    .bind(poll_id)
                    .fetch_all(&self.pool)
                    .await?;
                if rows.is_empty() {
                    crate::election_blockchain::ElectionBlockchain::new()
                } else {
                    crate::election_blockchain::ElectionBlockchain { chain: Vec::new() }
                }
            };
            let rows = sqlx::query(
                "SELECT block_index, timestamp, previous_hash, hash, transactions FROM blocks WHERE poll_id = $1 ORDER BY block_index ASC"
            )
            .bind(poll_id)
            .fetch_all(&self.pool)
            .await?;
            
            for row in rows {
                let election_block = crate::election_block::ElectionBlock::from_db_row(&row)?;
                blockchain.chain.push(election_block);
            }
            if !blockchain.is_valid() {
                eprintln!("Loaded election blockchain for poll {} is not valid", poll_id);
            }
            let poll_instance = Poll::Election { metadata: poll_input, blockchain };
            self.polls.insert(poll_id.to_string(), poll_instance);
        } else {
            let mut blockchain = {
                let rows = sqlx::query("SELECT block_index FROM blocks WHERE poll_id = $1 ORDER BY block_index ASC")
                    .bind(poll_id)
                    .fetch_all(&self.pool)
                    .await?;
                if rows.is_empty() {
                    Blockchain::new()
                } else {
                    Blockchain { chain: Vec::new() }
                }
            };
            let rows = sqlx::query(
                "SELECT block_index, timestamp, previous_hash, hash, transactions FROM blocks WHERE poll_id = $1 ORDER BY block_index ASC"
            )
            .bind(poll_id)
            .fetch_all(&self.pool)
            .await?;
            
            for row in rows {
                let block = crate::block::Block::from_db_row(&row)?;
                blockchain.chain.push(block);
            }
            if !blockchain.is_valid() {
                eprintln!("Loaded blockchain for poll {} is not valid", poll_id);
            }
            let poll_instance = Poll::Normal { metadata: poll_input, blockchain };
            self.polls.insert(poll_id.to_string(), poll_instance);
        }
        
        Ok(())
    }

    /// Adds a vote to the specified poll.
    pub fn add_vote(&mut self, poll_id: &str, vote_data: Value) -> Result<(), String> {
        if let Some(poll) = self.polls.get_mut(poll_id) {
            match poll {
                Poll::Election { blockchain, .. } => {
                    blockchain.add_vote(vote_data)
                },
                Poll::Normal { blockchain, .. } => {
                    let vote_obj = if vote_data.is_object() {
                        vote_data
                    } else if let Some(vote_str) = vote_data.as_str() {
                        serde_json::json!({ "voter_id": "unknown", "candidate": vote_str })
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
    pub async fn persist_block(&self, poll_id: &str, block: &crate::block::Block) -> Result<(), sqlx::Error> {
        let transactions_json = serde_json::to_string(&block.transactions).unwrap_or_default();
        let merkle_root = block.merkle_root().map(|r| hex::encode(r));
        println!("Persisting block {} for poll {} with hash {}", block.index, poll_id, block.hash);
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
