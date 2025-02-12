// block.rs

use sha2::{Digest, Sha256};
use chrono::Utc;
use serde::{Serialize, Deserialize};

/// Represents a single block in the blockchain.
/// 
/// Each block contains an index, a timestamp, the transaction (or vote) data,
/// the hash of the previous block, and its own computed hash.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    /// The block’s position in the blockchain.
    pub index: u32,
    /// The Unix timestamp when the block was created.
    pub timestamp: i64,
    /// The transaction or vote data contained in the block.
    pub transactions: String,
    /// The hash of the previous block in the chain.
    pub previous_hash: String,
    /// The computed SHA-256 hash of this block.
    pub hash: String,
}

impl Block {
    /// Creates a new block using the provided index, transaction data, and previous hash.
    ///
    /// # Arguments
    ///
    /// * `index` - The index (or position) of the block in the blockchain.
    /// * `transactions` - A string containing the transaction (or vote) data.
    /// * `previous_hash` - The hash of the previous block in the blockchain.
    ///
    /// # Returns
    ///
    /// A new `Block` instance with a computed hash.
    pub fn new(index: u32, transactions: String, previous_hash: String) -> Self {
        // Get the current time as the block's timestamp.
        let timestamp = Utc::now().timestamp();
        // Calculate the block's hash based on its content.
        let hash = Self::calculate_hash(index, timestamp, &transactions, &previous_hash);

        Block {
            index,
            timestamp,
            transactions,
            previous_hash,
            hash,
        }
    }

    /// Calculates the SHA-256 hash for the block.
    ///
    /// # Arguments
    ///
    /// * `index` - The block's index.
    /// * `timestamp` - The block's timestamp.
    /// * `transactions` - The transaction data.
    /// * `previous_hash` - The hash of the previous block.
    ///
    /// # Returns
    ///
    /// A hexadecimal string representing the block's hash.
    pub fn calculate_hash(index: u32, timestamp: i64, transactions: &str, previous_hash: &str) -> String {
        let input = format!("{}{}{}{}", index, timestamp, transactions, previous_hash);
        let mut hasher = Sha256::new();
        hasher.update(input);
        format!("{:x}", hasher.finalize())
    }
}
