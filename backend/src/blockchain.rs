// blockchain.rs
use crate::block::Block;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use serde_json::Value;

#[derive(Debug, Clone)]
pub struct Blockchain {
    pub chain: Vec<Block>,
}

impl Blockchain {
    pub fn new() -> Self {
        let genesis_block = Block::new(0, "Genesis Block".to_string(), "0".to_string());
        Blockchain {
            chain: vec![genesis_block],
        }
    }

    /// Adds a new block to the blockchain with the provided transaction string.
    pub fn add_block(&mut self, transactions: String) {
        let previous_block = self.chain.last().unwrap();
        let new_block = Block::new(
            previous_block.index + 1,
            transactions,
            previous_block.hash.clone(),
        );
        self.chain.push(new_block);
    }

    /// Validates the blockchain by checking each block's integrity and linking.
    pub fn is_valid(&self) -> bool {
        for i in 1..self.chain.len() {
            let current = &self.chain[i];
            let previous = &self.chain[i - 1];

            if !current.verify_block_integrity() {
                return false;
            }
            if current.previous_hash != previous.hash {
                return false;
            }
        }
        true
    }

    /// Checks if a voter has already voted.
    /// This function tries to find the voter by searching through the block transactions.
    pub fn has_voted(&self, voter_id: &str) -> bool {
        self.find_vote(voter_id).is_some()
    }

    /// Searches for a vote by voter ID.
    /// It first tries to parse the block's transactions as JSON (object or array) and looks for the "voter_id" field.
    /// If JSON parsing fails, it falls back to a raw string search.
    pub fn find_vote(&self, voter_id: &str) -> Option<(u32, String)> {
        for block in &self.chain {
            // Try to parse the transactions as JSON.
            if let Ok(json) = serde_json::from_str::<Value>(&block.transactions) {
                // If it's an array, iterate through each vote object.
                if let Some(arr) = json.as_array() {
                    for vote in arr {
                        if let Some(vote_obj) = vote.as_object() {
                            if let Some(voter_val) = vote_obj.get("voter_id") {
                                if voter_val.as_str() == Some(voter_id) {
                                    return Some((block.index, block.hash.clone()));
                                }
                            }
                        }
                    }
                } else if let Some(vote_obj) = json.as_object() {
                    // Single vote object.
                    if let Some(voter_val) = vote_obj.get("voter_id") {
                        if voter_val.as_str() == Some(voter_id) {
                            return Some((block.index, block.hash.clone()));
                        }
                    }
                }
            } else {
                // Fallback: treat the transactions as a plain string and check for the voter_id substring.
                if block.transactions.contains(voter_id) {
                    return Some((block.index, block.hash.clone()));
                }
            }
        }
        None
    }

    /// Retrieves a vote receipt (block index, vote hash, and timestamp) by searching for a vote with a given voter_id.
    pub fn get_vote_receipt(&self, voter_id: &str) -> Option<VoteReceipt> {
        self.find_vote(voter_id).map(|(block_index, vote_hash)| {
            VoteReceipt {
                block_index,
                vote_hash,
                timestamp: self.chain[block_index as usize].timestamp,
            }
        })
    }

    /// Retrieves vote counts by iterating over all blocks (skipping the genesis block).
    /// This function tries to parse the transaction data as JSON to extract the "candidate" field.
    /// If parsing fails, it falls back to extracting the candidate from a plain string.
    pub fn get_vote_counts(&self) -> HashMap<String, u32> {
        let mut vote_counts: HashMap<String, u32> = HashMap::new();

        for block in &self.chain {
            if block.index == 0 { continue; } // Skip genesis block

            if let Ok(json) = serde_json::from_str::<Value>(&block.transactions) {
                if let Some(arr) = json.as_array() {
                    // Assume votes are stored as an array of objects.
                    for vote in arr {
                        if let Some(vote_obj) = vote.as_object() {
                            if let Some(candidate_val) = vote_obj.get("candidate") {
                                if let Some(candidate_str) = candidate_val.as_str() {
                                    *vote_counts.entry(candidate_str.to_string()).or_insert(0) += 1;
                                }
                            }
                        }
                    }
                } else if let Some(vote_obj) = json.as_object() {
                    // A single vote object.
                    if let Some(candidate_val) = vote_obj.get("candidate") {
                        if let Some(candidate_str) = candidate_val.as_str() {
                            *vote_counts.entry(candidate_str.to_string()).or_insert(0) += 1;
                        }
                    }
                }
            } else {
                // Fallback for plain string transactions (expected format: "Voter: {} -> Candidate: {}")
                let parts: Vec<&str> = block.transactions.split("-> Candidate:").collect();
                if parts.len() >= 2 {
                    let candidate = parts[1].trim();
                    *vote_counts.entry(candidate.to_string()).or_insert(0) += 1;
                }
            }
        }

        vote_counts
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteReceipt {
    pub block_index: u32,
    pub vote_hash: String,
    pub timestamp: i64,
}
