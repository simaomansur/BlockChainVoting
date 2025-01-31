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
}
