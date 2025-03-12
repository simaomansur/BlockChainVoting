use serde::{Serialize, Deserialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::election_block::ElectionBlock;
use sqlx::postgres::PgRow;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElectionBlockchain {
    pub chain: Vec<ElectionBlock>,
}

impl ElectionBlockchain {
    /// Creates a new election blockchain with a genesis block.
    pub fn new() -> Self {
        let genesis_block = ElectionBlock::new(0, json!("Genesis Block"), "0".to_string());
        ElectionBlockchain {
            chain: vec![genesis_block],
        }
    }

    /// Optionally, reconstructs an ElectionBlockchain from a vector of database rows.
    pub fn from_db_rows(rows: Vec<PgRow>) -> Result<Self, sqlx::Error> {
        let mut chain = Vec::new();
        for row in rows {
            let block = ElectionBlock::from_db_row(&row)?;
            chain.push(block);
        }
        Ok(ElectionBlockchain { chain })
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
            if !current.verify_block_integrity() ||
               current.previous_hash != previous.hash ||
               current.index != previous.index + 1 {
                return false;
            }
        }
        true
    }

    /// Returns a HashMap of vote counts for each contest and candidate.
    /// Assumes each election block's vote (transactions) has a "candidate" field.
    pub fn get_vote_counts(&self) -> HashMap<String, HashMap<String, u32>> {
        let mut counts: HashMap<String, HashMap<String, u32>> = HashMap::new();
    
        for block in self.chain.iter().skip(1) {
            if let Some(vote_obj) = block.transactions.as_object() {
                if let Some(candidate_val) = vote_obj.get("candidate") {
                    if let Some(candidate) = candidate_val.as_str() {
                        counts
                            .entry("default".to_string())
                            .or_insert_with(HashMap::new)
                            .entry(candidate.to_string())
                            .and_modify(|c| *c += 1)
                            .or_insert(1);
                    }
                }
            }
        }
        counts
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
