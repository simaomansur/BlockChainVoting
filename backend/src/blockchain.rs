// blockchain.rs

use crate::block::Block;

/// Represents a simple blockchain.
///
/// The blockchain is implemented as a vector of `Block` instances,
/// starting with a genesis block.
#[derive(Debug, Clone)]
pub struct Blockchain {
    /// A vector containing the chain of blocks.
    pub chain: Vec<Block>,
}

impl Blockchain {
    /// Creates a new blockchain with a genesis block.
    ///
    /// The genesis block is the first block in the blockchain.
    pub fn new() -> Self {
        // Create the genesis block with index 0.
        let genesis_block = Block::new(0, "Genesis Block".to_string(), "0".to_string());
        Blockchain {
            chain: vec![genesis_block],
        }
    }

    /// Adds a new block to the blockchain with the provided transaction data.
    ///
    /// # Arguments
    ///
    /// * `transactions` - A string representing the transaction or vote data.
    pub fn add_block(&mut self, transactions: String) {
        // Retrieve the last block in the chain.
        let previous_block = self.chain.last().unwrap();
        // Create a new block with an incremented index and the hash of the previous block.
        let new_block = Block::new(
            previous_block.index + 1,
            transactions,
            previous_block.hash.clone(),
        );
        // Append the new block to the blockchain.
        self.chain.push(new_block);
    }

    /// Validates the integrity of the blockchain.
    ///
    /// This method verifies that each block's hash is correctly computed
    /// and that the `previous_hash` field matches the hash of the previous block.
    ///
    /// # Returns
    ///
    /// * `true` if the blockchain is valid.
    /// * `false` if any block is invalid.
    pub fn is_valid(&self) -> bool {
        // Iterate over the chain, starting from the second block.
        for i in 1..self.chain.len() {
            let current = &self.chain[i];
            let previous = &self.chain[i - 1];

            // Validate the current block's hash.
            if current.hash != Block::calculate_hash(current.index, current.timestamp, &current.transactions, &current.previous_hash) {
                return false;
            }

            // Ensure that the previous_hash field matches the actual hash of the previous block.
            if current.previous_hash != previous.hash {
                return false;
            }
        }
        true
    }
}
=======
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
