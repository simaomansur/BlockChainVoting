use serde::{Serialize, Deserialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::block::Block;
use sqlx::postgres::PgRow;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Blockchain {
    pub chain: Vec<Block>,
}

impl Blockchain {
    /// Creates a new blockchain with a genesis block.
    pub fn new() -> Self {
        let genesis_block = Block::new(0, json!("Genesis Block"), "0".to_string());
        Blockchain {
            chain: vec![genesis_block],
        }
    }

    /// Reconstructs a blockchain from a vector of database rows.
    /// Assumes each row corresponds to a block in the "blocks" table.
    pub fn from_db_rows(rows: Vec<PgRow>) -> Result<Self, sqlx::Error> {
        let mut chain = Vec::new();
        for row in rows {
            let block = Block::from_db_row(&row)?;
            chain.push(block);
        }
        Ok(Blockchain { chain })
    }

    /// Adds a new block with a single transaction to the chain.
    pub fn add_block(&mut self, transaction: Value) {
        let previous_block = self.chain.last().unwrap();
        let new_block = Block::new(previous_block.index as u32 + 1, transaction, previous_block.hash.clone());
        self.chain.push(new_block);
    }

    /// Checks if the blockchain is valid by verifying each block’s integrity and linking.
    pub fn is_valid(&self) -> bool {
        for i in 1..self.chain.len() {
            let current = &self.chain[i];
            let previous = &self.chain[i - 1];
            if !current.verify_block_integrity() || current.previous_hash != previous.hash {
                return false;
            }
        }
        true
    }

    /// Searches for a vote by a given voter ID by scanning through the transactions of each block.
    pub fn find_vote(&self, voter_id: &str) -> Option<(u32, String)> {
        for block in self.chain.iter().skip(1) {
            for transaction in &block.transactions {
                if let Some(obj) = transaction.as_object() {
                    if let Some(val) = obj.get("voter_id") {
                        if val.as_str() == Some(voter_id) {
                            return Some((block.index as u32, block.hash.clone()));
                        }
                    }
                }
            }
        }
        None
    }

    /// Aggregates vote counts by iterating over transactions in each block.
    /// Assumes each transaction has a "candidate" field.
    pub fn get_vote_counts(&self) -> HashMap<String, u32> {
        let mut vote_counts: HashMap<String, u32> = HashMap::new();
        for block in self.chain.iter().skip(1) {
            for transaction in &block.transactions {
                if let Some(obj) = transaction.as_object() {
                    if let Some(candidate_val) = obj.get("candidate") {
                        if let Some(candidate) = candidate_val.as_str() {
                            *vote_counts.entry(candidate.to_string()).or_insert(0) += 1;
                        }
                    }
                }
            }
        }
        vote_counts
    }
}
