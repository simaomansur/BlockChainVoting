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

    pub fn calculate_hash(index: u32, timestamp: i64, transactions: &str, previous_hash: &str) -> String {
        let input = format!("{}{}{}{}", index, timestamp, transactions, previous_hash);
        let mut hasher = Sha256::new();
        hasher.update(input);
        format!("{:x}", hasher.finalize())
    }

    // New methods
    pub fn verify_block_integrity(&self) -> bool {
        let calculated_hash = Self::calculate_hash(
            self.index,
            self.timestamp,
            &self.transactions,
            &self.previous_hash
        );
        self.hash == calculated_hash
    }

    pub fn hash_voter_id(voter_id: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(format!("VOTER:{}", voter_id));
        format!("{:x}", hasher.finalize())
    }

    pub fn calculate_vote_proof(vote_data: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(format!("VOTE_PROOF:{}", vote_data));
        format!("{:x}", hasher.finalize())
    }

    pub fn verify_vote(&self, vote_data: &str) -> bool {
        let vote_proof = Self::calculate_vote_proof(vote_data);
        self.transactions.contains(&vote_proof)
    }
}
