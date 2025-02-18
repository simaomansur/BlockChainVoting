use serde::{Serialize, Deserialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::election_block::ElectionBlock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElectionBlockchain {
    pub chain: Vec<ElectionBlock>,
}

impl ElectionBlockchain {
    pub fn new() -> Self {
        let genesis_block = ElectionBlock::new(0, json!("Genesis Block"), "0".to_string());
        ElectionBlockchain {
            chain: vec![genesis_block],
        }
    }

    /// Adds a vote by creating a new block for each vote.
    pub fn add_vote(&mut self, vote: Value) -> Result<(), String> {
        if let Some(last_block) = self.chain.last() {
            let new_block = ElectionBlock::new(last_block.index + 1, vote, last_block.hash.clone());
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
            if !current.verify_block_integrity() {
                println!("Validation failed at block {}: integrity check failed.", current.index);
                return false;
            }
            if current.previous_hash != previous.hash {
                println!("Validation failed at block {}: previous_hash does not match.", current.index);
                println!("  Expected: {}", previous.hash);
                println!("  Found: {}", current.previous_hash);
                return false;
            }
            if current.index != previous.index + 1 {
                println!("Validation failed at block {}: index mismatch (expected {}, got {}).", current.index, previous.index + 1, current.index);
                return false;
            }
        }
        true
    }

    /// Returns a HashMap of vote counts for each contest and candidate.
    pub fn get_vote_counts(&self) -> HashMap<String, HashMap<String, u32>> {
        let mut category_counts: HashMap<String, HashMap<String, u32>> = HashMap::new();
    
        for block in self.chain.iter().skip(1) {
            if let Some(vote_obj) = block.transactions.as_object() {
                for (key, value) in vote_obj {
                    if key == "voter_id" || key == "poll_id" {
                        continue;
                    }
                    if let Some(choice) = value.as_str() {
                        let contest = key.trim().to_string();
                        let candidate = choice.trim().to_string();
                        category_counts
                            .entry(contest)
                            .or_insert_with(HashMap::new)
                            .entry(candidate)
                            .and_modify(|c| *c += 1)
                            .or_insert(1);
                    }
                }
            } else if let Some(transaction_str) = block.transactions.as_str() {
                Self::parse_plain_string(transaction_str, &mut category_counts);
            }
        }
        category_counts
    }
    
    /// Fallback for plain string transactions formatted as "Voter: ... -> Candidate: ..."
    fn parse_plain_string(transactions: &str, category_counts: &mut HashMap<String, HashMap<String, u32>>) {
        let parts: Vec<&str> = transactions.split("-> Candidate:").collect();
        if parts.len() >= 2 {
            let candidate = parts[1].trim();
            category_counts
                .entry("default".to_string())
                .or_insert_with(HashMap::new)
                .entry(candidate.to_string())
                .and_modify(|c| *c += 1)
                .or_insert(1);
        }
    }
    
    /// Searches the blockchain for a vote by a given voter ID.
    pub fn find_vote(&self, voter_id: &str) -> Option<(u32, String)> {
        for block in self.chain.iter().skip(1) {
            if let Some(vote_obj) = block.transactions.as_object() {
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
