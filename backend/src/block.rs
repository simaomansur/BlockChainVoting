use sha2::{Digest, Sha256};
use chrono::Utc;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    pub index: u32,
    pub timestamp: i64,
    pub transactions: String,
    pub previous_hash: String,
    pub hash: String,
}

impl Block {
    /// Creates a new block with calculated hash
    pub fn new(index: u32, transactions: String, previous_hash: String) -> Self {
        let timestamp = Utc::now().timestamp();
        let hash = Self::calculate_hash(index, timestamp, &transactions, &previous_hash);

        Block {
            index,
            timestamp,
            transactions,
            previous_hash,
            hash,
        }
    }

    /// Calculates a SHA-256 hash of the block's contents
    pub fn calculate_hash(index: u32, timestamp: i64, transactions: &str, previous_hash: &str) -> String {
        let input = format!("{}{}{}{}", index, timestamp, transactions, previous_hash);
        let mut hasher = Sha256::new();
        hasher.update(input);
        format!("{:x}", hasher.finalize()) // Convert to hexadecimal format
    }

    /// Verifies that the block's stored hash matches its calculated hash
    pub fn verify_block_integrity(&self) -> bool {
        self.hash == Self::calculate_hash(
            self.index,
            self.timestamp,
            &self.transactions,
            &self.previous_hash
        )
    }

    /// Generates a secure hash of a voter ID to anonymize identity in blockchain
    pub fn hash_voter_id(voter_id: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(format!("VOTER:{}", voter_id));
        format!("{:x}", hasher.finalize())
    }

    /// Generates a proof-of-vote hash for verification purposes
    pub fn calculate_vote_proof(vote_data: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(format!("VOTE_PROOF:{}", vote_data));
        format!("{:x}", hasher.finalize())
    }

    /// Checks whether a given vote is included in the block's transactions
    pub fn verify_vote(&self, vote_data: &str) -> bool {
        let vote_proof = Self::calculate_vote_proof(vote_data);
        self.transactions.contains(&vote_proof)
    }
}
