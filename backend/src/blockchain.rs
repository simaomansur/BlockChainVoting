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
