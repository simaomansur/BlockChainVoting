use crate::block::Block;
use serde::{Serialize, Deserialize};

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

    pub fn add_block(&mut self, transactions: String) {
        let previous_block = self.chain.last().unwrap();
        let new_block = Block::new(
            previous_block.index + 1,
            transactions,
            previous_block.hash.clone(),
        );
        self.chain.push(new_block);
    }

    pub fn is_valid(&self) -> bool {
        for i in 1..self.chain.len() {
            let current = &self.chain[i];
            let previous = &self.chain[i - 1];

            if current.hash != Block::calculate_hash(
                current.index,
                current.timestamp,
                &current.transactions,
                &current.previous_hash
            ) {
                return false;
            }

            if current.previous_hash != previous.hash {
                return false;
            }
        }
        true
    }

    // New methods
    pub fn has_voted(&self, voter_id: &str) -> bool {
        let voter_hash = Block::hash_voter_id(voter_id);
        self.chain.iter().any(|block| block.transactions.contains(&voter_hash))
    }

    pub fn verify_chain_integrity(&self) -> bool {
        for i in 1..self.chain.len() {
            let current = &self.chain[i];
            let previous = &self.chain[i - 1];
            
            if !current.verify_block_integrity() {
                return false;
            }
            
            if current.previous_hash != previous.hash {
                return false;
            }

            if current.index != previous.index + 1 {
                return false;
            }
        }
        true
    }

    pub fn find_vote(&self, vote_data: &str) -> Option<(u32, String)> {
        let vote_proof = Block::calculate_vote_proof(vote_data);
        
        for block in &self.chain {
            if block.transactions.contains(&vote_proof) {
                return Some((block.index, block.hash.clone()));
            }
        }
        None
    }

    pub fn get_vote_receipt(&self, vote_data: &str) -> Option<VoteReceipt> {
        self.find_vote(vote_data).map(|(block_index, vote_hash)| {
            VoteReceipt {
                block_index,
                vote_hash,
                timestamp: self.chain[block_index as usize].timestamp,
            }
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteReceipt {
    pub block_index: u32,
    pub vote_hash: String,
    pub timestamp: i64,
}
