// election_blockchain.rs

use chrono::Utc;
use sha2::{Digest, Sha256};
use serde::{Serialize, Deserialize};
use serde_json::{json, Value};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElectionBlock {
    pub index: u32,
    pub timestamp: i64,
    /// A single vote (or a complete ballot) stored as a JSON value.
    pub transaction: Value,
    pub previous_hash: String,
    pub hash: String,
}

impl ElectionBlock {
    /// Creates a new ElectionBlock given an index, a vote transaction, and the previous block’s hash.
    pub fn new(index: u32, transaction: Value, previous_hash: String) -> Self {
        let timestamp = Utc::now().timestamp();
        let hash = Self::calculate_hash(index, timestamp, &transaction, &previous_hash);
        ElectionBlock {
            index,
            timestamp,
            transaction,
            previous_hash,
            hash,
        }
    }

    /// Calculates a SHA-256 hash for the block.
    pub fn calculate_hash(index: u32, timestamp: i64, transaction: &Value, previous_hash: &str) -> String {
        let transaction_str = serde_json::to_string(transaction).unwrap_or_default();
        let input = format!("{}{}{}{}", index, timestamp, transaction_str, previous_hash);
        let mut hasher = Sha256::new();
        hasher.update(input);
        format!("{:x}", hasher.finalize())
    }

    /// Verifies that the stored hash matches the recalculated hash.
    pub fn verify_block_integrity(&self) -> bool {
        self.hash == Self::calculate_hash(self.index, self.timestamp, &self.transaction, &self.previous_hash)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElectionBlockchain {
    pub chain: Vec<ElectionBlock>,
}

impl ElectionBlockchain {
    /// Creates a new ElectionBlockchain with a genesis block.
    pub fn new() -> Self {
        let genesis_block = ElectionBlock::new(0, json!("Genesis Block"), "0".to_string());
        ElectionBlockchain {
            chain: vec![genesis_block],
        }
    }

    /// Adds a vote by creating a new block for each vote.
    pub fn add_vote(&mut self, vote: Value) -> Result<(), String> {
        if let Some(last_block) = self.chain.last() {
            let new_block = ElectionBlock::new(
                last_block.index + 1,
                vote,
                last_block.hash.clone(),
            );
            self.chain.push(new_block);
            Ok(())
        } else {
            Err("Blockchain is empty.".to_string())
        }
    }

    /// Validates the blockchain by checking each block's integrity and linkage.
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

    /// Retrieves vote counts by iterating over blocks (skipping the genesis block).
    /// Assumes each vote is stored as a JSON object with a "candidate" field.
    pub fn get_vote_counts(&self) -> HashMap<String, u32> {
        let mut vote_counts = HashMap::new();
        // Skip the genesis block.
        for block in self.chain.iter().skip(1) {
            if let Some(candidate) = block.transaction.get("candidate").and_then(|v| v.as_str()) {
                *vote_counts.entry(candidate.to_string()).or_insert(0) += 1;
            }
        }
        vote_counts
    }

    /// Searches the blockchain for a vote by a given voter ID.
    /// Returns the block index and block hash if found.
    pub fn find_vote(&self, voter_id: &str) -> Option<(u32, String)> {
        // Skip the genesis block.
        for block in self.chain.iter().skip(1) {
            if let Some(vote_obj) = block.transaction.as_object() {
                if let Some(voter_val) = vote_obj.get("voter_id") {
                    if voter_val.as_str() == Some(voter_id) {
                        return Some((block.index, block.hash.clone()));
                    }
                }
            }
        }
        None
    }
}
