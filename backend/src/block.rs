use sha2::{Digest, Sha256};
use chrono::Utc;
use serde::{Serialize, Deserialize};
use crate::merkle_tree::MerkleTree;  // Add this import

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    pub index: u32,
    pub timestamp: i64,
    pub transactions: String,
    pub previous_hash: String,
    pub hash: String,
    #[serde(skip)]  
    pub merkle_tree: MerkleTree,
}

impl Block {
    pub fn new(index: u32, transactions: String, previous_hash: String) -> Self {
        let timestamp = Utc::now().timestamp();
        let hash = Self::calculate_hash(index, timestamp, &transactions, &previous_hash);

        let mut merkle_tree = MerkleTree::new();
        merkle_tree.add_node(transactions.as_bytes().to_vec());

        Block {
            index,
            timestamp,
            transactions,
            previous_hash,
            hash,
            merkle_tree,
        }
    }

    pub fn add_transaction(&mut self, transactions: String) {
        self.transactions.push_str(&transactions);
        self.merkle_tree.add_node(transactions.as_bytes().to_vec());
        
        self.hash = Self::calculate_hash(
            self.index, 
            self.timestamp,
            &self.transactions,
            &self.previous_hash,
        )
    }

    pub fn merkle_root(&self) -> Option<Vec<u8>> {
        self.merkle_tree.root_hash().cloned()
    }

    pub fn calculate_hash(index: u32, timestamp: i64, transactions: &str, previous_hash: &str) -> String {
        let input = format!("{}{}{}{}", index, timestamp, transactions, previous_hash);
        let mut hasher = Sha256::new();
        hasher.update(input);
        format!("{:x}", hasher.finalize())
    }

    pub fn verify_block_integrity(&self) -> bool {
        self.hash == Self::calculate_hash(
            self.index,
            self.timestamp,
            &self.transactions,
            &self.previous_hash
        )
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