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

    /// Creates a new poll and stores it in memory and the database.
    pub async fn create_poll(&mut self, poll: PollInput) -> Result<String, sqlx::Error> {
        use uuid::Uuid;
        // If poll_type is "election", force the poll_id to "election".
        let poll_type = poll.poll_type.clone().unwrap_or_else(|| "normal".to_string());
        let poll_id = if poll_type == "election" {
            "election".to_string()
        } else {
            Uuid::new_v4().to_string()
        };
        self.insert_poll_in_db(&poll_id, &poll, &poll_type).await?;
        self.build_in_memory_poll(&poll_id, poll, &poll_type).await?;
        Ok(poll_id)
    }

    /// Creates a poll with a *fixed* poll ID (e.g. "election") so you can force exactly one official election.
    pub async fn create_named_poll(&mut self, poll_id: &str, poll: PollInput) -> Result<(), sqlx::Error> {
        if self.polls.contains_key(poll_id) {
            return Err(sqlx::Error::Protocol(
                format!("Poll ID '{}' already exists in memory", poll_id).into(),
            ));
        }

        let poll_type = poll.poll_type.clone().unwrap_or_else(|| "normal".to_string());
        self.insert_poll_in_db(poll_id, &poll, &poll_type).await?;
        self.build_in_memory_poll(poll_id, poll, &poll_type).await?;
        Ok(())
    }

    /// A helper to insert the poll row into the DB.
    async fn insert_poll_in_db(
        &self,
        poll_id: &str,
        poll: &PollInput,
        poll_type: &str
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO polls (poll_id, title, question, options, is_public, poll_type)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#
        )
        .bind(poll_id)
        .bind(&poll.title)
        .bind(&poll.question)
        .bind(serde_json::to_value(&poll.options).unwrap())
        .bind(poll.is_public)
        .bind(poll_type)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Builds and stores the poll in memory, re-checking the DB for any existing blocks.
    async fn build_in_memory_poll(
        &mut self,
        poll_id: &str,
        poll: PollInput,
        poll_type: &str
    ) -> Result<(), sqlx::Error> {
        if poll_type == "election" {
            // Create an election blockchain
            let chain_rows = sqlx::query("SELECT block_index FROM blocks WHERE poll_id = $1 ORDER BY block_index ASC")
                .bind(poll_id)
                .fetch_all(&self.pool)
                .await?;

            let blockchain = if chain_rows.is_empty() {
                ElectionBlockchain::new()
            } else {
                // Rebuild from existing blocks in DB
                let mut chain = ElectionBlockchain { chain: Vec::new() };
                let block_rows = sqlx::query(
                    r#"
                    SELECT block_index, timestamp, previous_hash, hash, transactions
                    FROM blocks
                    WHERE poll_id = $1
                    ORDER BY block_index ASC
                    "#
                )
                .bind(poll_id)
                .fetch_all(&self.pool)
                .await?;

                for row in block_rows {
                    let election_block = crate::election_block::ElectionBlock::from_db_row(&row)?;
                    chain.chain.push(election_block);
                }
                if !chain.is_valid() {
                    eprintln!("Warning: loaded election chain for poll {} is not valid!", poll_id);
                }
                chain
            };

            let poll_instance = Poll::Election {
                metadata: poll,
                blockchain: blockchain,
            };
            self.polls.insert(poll_id.to_string(), poll_instance);

        } else {
            // Normal poll => normal blockchain
            let chain_rows = sqlx::query("SELECT block_index FROM blocks WHERE poll_id = $1 ORDER BY block_index ASC")
                .bind(poll_id)
                .fetch_all(&self.pool)
                .await?;

            let blockchain = if chain_rows.is_empty() {
                Blockchain::new()
            } else {
                // Reconstruct
                let mut chain = Blockchain { chain: Vec::new() };
                let block_rows = sqlx::query(
                    r#"
                    SELECT block_index, timestamp, previous_hash, hash, transactions
                    FROM blocks
                    WHERE poll_id = $1
                    ORDER BY block_index ASC
                    "#
                )
                .bind(poll_id)
                .fetch_all(&self.pool)
                .await?;

                for row in block_rows {
                    let block = crate::block::Block::from_db_row(&row)?;
                    chain.chain.push(block);
                }
                if !chain.is_valid() {
                    eprintln!("Warning: loaded normal chain for poll {} is not valid!", poll_id);
                }
                chain
            };

            let poll_instance = Poll::Normal {
                metadata: poll,
                blockchain: blockchain,
            };
            self.polls.insert(poll_id.to_string(), poll_instance);
        }

        Ok(())
    }

    /// Loads a poll from the database into memory, reconstructing the chain if needed.
    pub async fn load_poll(&mut self, poll_id: &str) -> Result<(), sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT poll_id, title, question, options, is_public, poll_type
            FROM polls
            WHERE poll_id = $1
            "#
        )
        .bind(poll_id)
        .fetch_one(&self.pool)
        .await?;

        let title: String = row.try_get("title")?;
        let question: String = row.try_get("question")?;
        let options_value: Value = row.try_get("options")?;
        let options: Vec<String> = serde_json::from_value(options_value).unwrap_or_default();
        let is_public: bool = row.try_get("is_public")?;
        let poll_type: String = row.try_get("poll_type")?;

        let poll_input = PollInput {
            title,
            question,
            options,
            is_public,
            poll_type: Some(poll_type.clone()),
        };

        // Use build_in_memory_poll logic to unify approach
        self.build_in_memory_poll(poll_id, poll_input, &poll_type).await?;
        Ok(())
    }

    /// Adds a vote to the specified poll in memory. This does NOT persist the block to DB.
    pub fn add_vote(&mut self, poll_id: &str, vote_data: Value) -> Result<(), String> {
        if let Some(poll) = self.polls.get_mut(poll_id) {
            match poll {
                Poll::Election { blockchain, .. } => blockchain.add_vote(vote_data),
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

    /// Persists a newly added block to the database (once you have it).
    pub async fn persist_block(&self, poll_id: &str, block: &crate::block::Block) -> Result<(), sqlx::Error> {
        let transactions_json = serde_json::to_string(&block.transactions).unwrap_or_default();
        println!("Persisting block {} for poll {} with hash {}", block.index, poll_id, block.hash);

        sqlx::query(
            r#"
            INSERT INTO blocks (poll_id, block_index, timestamp, previous_hash, hash, transactions)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#
        )
        .bind(poll_id)
        .bind(block.index)
        .bind(block.timestamp)
        .bind(&block.previous_hash)
        .bind(&block.hash)
        .bind(transactions_json)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Gets a poll from memory by poll_id, if it exists.
    pub fn get_poll(&self, poll_id: &str) -> Option<&Poll> {
        self.polls.get(poll_id)
    }
}
