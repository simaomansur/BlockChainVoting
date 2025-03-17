use sha2::{Digest, Sha256};
use chrono::Utc;
use serde::{Serialize, Deserialize};
use serde_json::Value;
use crate::merkle_tree::MerkleTree; // Ensure your merkle_tree module is available
use sqlx::Row;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    pub index: i32,
    pub timestamp: i64,
    pub transactions: Vec<Value>, // Structured transactions
    pub previous_hash: String,
    pub hash: String,
    #[serde(skip)]
    pub merkle_tree: MerkleTree,
}

impl Block {
    /// Creates a new block with one initial transaction.
    pub fn new(index: u32, transaction: Value, previous_hash: String) -> Self {
        let timestamp = Utc::now().timestamp();
        // Start with a single transaction in a vector.
        let transactions_vec = vec![transaction.clone()];
        // Serialize transactions vector to compute hash.
        let transactions_serialized = serde_json::to_string(&transactions_vec).unwrap_or_default();
        let hash = Self::calculate_hash(index, timestamp, &transactions_serialized, &previous_hash);

        let mut merkle_tree = MerkleTree::new();
        // Compute the hash of the transaction and add it to the Merkle tree.
        let tx_bytes = serde_json::to_vec(&transaction).unwrap_or_default();
        merkle_tree.add_node(crate::merkle_tree::MerkleNode::hash_data(&tx_bytes));

        Block {
            index: index as i32,
            timestamp,
            transactions: transactions_vec,
            previous_hash,
            hash,
            merkle_tree,
        }
    }

    /// Reconstructs a Block from a database row.
    /// Assumes the "transactions" column stores a JSON string representing a vector of transactions.
    pub fn from_db_row(row: &sqlx::postgres::PgRow) -> Result<Self, sqlx::Error> {
        let index: i32 = row.try_get("block_index")?;
        let timestamp: i64 = row.try_get("timestamp")?;
        let previous_hash: String = row.try_get("previous_hash")?;
        let hash: String = row.try_get("hash")?;
        let transactions_json: String = row.try_get("transactions")?;
        let transactions: Vec<Value> = serde_json::from_str(&transactions_json).unwrap_or_default();

        // Rebuild the Merkle tree based on the transactions.
        let mut merkle_tree = MerkleTree::new();
        for tx in &transactions {
            let tx_bytes = serde_json::to_vec(tx).unwrap_or_default();
            merkle_tree.add_node(crate::merkle_tree::MerkleNode::hash_data(&tx_bytes));
        }

        Ok(Block {
            index,
            timestamp,
            transactions,
            previous_hash,
            hash,
            merkle_tree,
        })
    }

    /// Returns the Merkle root as a slice.
    pub fn merkle_root(&self) -> Option<&[u8]> {
        self.merkle_tree.root_hash().map(|r| r.as_slice())
    }

    /// Adds a new transaction to the block and updates its hash and Merkle tree.
    pub fn add_transaction(&mut self, transaction: Value) {
        self.transactions.push(transaction.clone());
        let tx_bytes = serde_json::to_vec(&transaction).unwrap_or_default();
        self.merkle_tree.add_node(crate::merkle_tree::MerkleNode::hash_data(&tx_bytes));
        let transactions_serialized = serde_json::to_string(&self.transactions).unwrap_or_default();
        self.hash = Self::calculate_hash(self.index as u32, self.timestamp, &transactions_serialized, &self.previous_hash);
    }

    /// Computes the block hash based on index, timestamp, serialized transactions, and previous hash.
    pub fn calculate_hash(index: u32, timestamp: i64, transactions_serialized: &str, previous_hash: &str) -> String {
        let input = format!("{}{}{}{}", index, timestamp, transactions_serialized, previous_hash);
        let mut hasher = Sha256::new();
        hasher.update(input);
        format!("{:x}", hasher.finalize())
    }

    /// Verifies block integrity by comparing stored hash with a freshly computed one.
    pub fn verify_block_integrity(&self) -> bool {
        let transactions_serialized = serde_json::to_string(&self.transactions).unwrap_or_default();
        let recalculated = Self::calculate_hash(self.index as u32, self.timestamp, &transactions_serialized, &self.previous_hash);
        if self.hash != recalculated {
            println!("Block {} integrity failure:", self.index);
            println!("  Stored hash:     {}", self.hash);
            println!("  Recalculated:    {}", recalculated);
            println!("  Transactions:    {}", serde_json::to_string_pretty(&self.transactions).unwrap_or_default());
        }
        self.hash == recalculated
    }
}
