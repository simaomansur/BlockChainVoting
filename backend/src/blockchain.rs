use crate::block::Block;
use serde::{Serialize, Deserialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Blockchain {
    pub chain: Vec<Block>,
}

impl Blockchain {
    /// Creates a new blockchain with a genesis block.
    pub fn new() -> Self {
        let mut genesis_block = Block::new(0, serde_json::json!("Genesis Block"), "0".to_string());
        // Finalize the genesis block to enforce immutability
        genesis_block.finalize();
        Blockchain { chain: vec![genesis_block] }
    }

    /// Adds a new block with a single transaction to the chain.
    pub fn add_block(&mut self, transaction: Value) {
        let previous_block = self.chain.last().unwrap();
        let mut new_block = Block::new(previous_block.index as u32 + 1, transaction, previous_block.hash.clone());
        new_block.finalize(); // Finalize immediately
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
    pub fn get_vote_counts(&self) -> serde_json::Map<String, serde_json::Value> {
        let mut vote_counts = serde_json::Map::new();
        for block in self.chain.iter().skip(1) {
            for transaction in &block.transactions {
                if let Some(obj) = transaction.as_object() {
                    if let Some(candidate_val) = obj.get("candidate") {
                        if let Some(candidate) = candidate_val.as_str() {
                            let count = vote_counts.entry(candidate.to_string())
                                .or_insert(serde_json::json!(0));
                            if let Some(n) = count.as_u64() {
                                *count = serde_json::json!(n + 1);
                            }
                        }
                    }
                }
            }
        }
        vote_counts
    }
}
