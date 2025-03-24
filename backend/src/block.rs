use sha2::{Digest, Sha256};
use chrono::Utc;
use serde::{Serialize, Deserialize};
use serde_json::Value;
use crate::merkle_tree::{MerkleTree, MerkleNode};
use sqlx::{Error, Row}; // Ensure you have sqlx in your Cargo.toml

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    pub index: i32,
    pub timestamp: i64,
    pub transactions: Vec<Value>, // Structured transactions
    pub previous_hash: String,
    pub hash: String,
    #[serde(skip)]
    pub merkle_tree: MerkleTree,
    // NEW: Finalized flag to enforce immutability
    pub finalized: bool,
}

impl Block {
    /// Creates a new block with one initial transaction.
    pub fn new(index: u32, transaction: Value, previous_hash: String) -> Self {
        // Use millisecond precision for consistency
        let timestamp = Utc::now().timestamp_millis();
        let transactions_vec = vec![transaction.clone()];
        let transactions_serialized = serde_json::to_string(&transactions_vec).unwrap_or_default();
        let hash = Self::calculate_hash(index, timestamp, &transactions_serialized, &previous_hash);

        let mut merkle_tree = MerkleTree::new();
        let tx_bytes = serde_json::to_vec(&transaction).unwrap_or_default();
        merkle_tree.add_node(MerkleNode::hash_data(&tx_bytes));

        Block {
            index: index as i32,
            timestamp,
            transactions: transactions_vec,
            previous_hash,
            hash,
            merkle_tree,
            finalized: false, // Initially not finalized
        }
    }

    /// Creates a Block instance from a database row.
    /// Adjust the row type as needed for your database and schema.
    pub fn from_db_row(row: &sqlx::postgres::PgRow) -> Result<Self, Error> {
        // Extract the block's fields from the database row.
        let index: i32 = row.try_get("index")?;
        let timestamp: i64 = row.try_get("timestamp")?;
        let transactions: Vec<Value> = row.try_get("transactions")?;
        let previous_hash: String = row.try_get("previous_hash")?;
        let hash: String = row.try_get("hash")?;
        let finalized: bool = row.try_get("finalized")?;

        // Rebuild the Merkle tree from the stored transactions.
        let mut merkle_tree = MerkleTree::new();
        for tx in &transactions {
            let tx_bytes = serde_json::to_vec(tx).unwrap_or_default();
            merkle_tree.add_node(MerkleNode::hash_data(&tx_bytes));
        }

        Ok(Block {
            index,
            timestamp,
            transactions,
            previous_hash,
            hash,
            merkle_tree,
            finalized,
        })
    }

    /// Returns the Merkle root of the block as a hex string, if available.
    /// Assumes that `MerkleTree` provides a `root()` method returning an Option<Vec<u8>>.
    pub fn merkle_root(&self) -> Option<String> {
        self.merkle_tree.root().map(|root_bytes| hex::encode(root_bytes))
    }

    /// Adds a new transaction to the block and updates its hash and Merkle tree.
    pub fn add_transaction(&mut self, transaction: Value) {
        if self.finalized {
            println!("Block {} is finalized and cannot be modified.", self.index);
            return;
        }
        self.transactions.push(transaction.clone());
        let tx_bytes = serde_json::to_vec(&transaction).unwrap_or_default();
        self.merkle_tree.add_node(MerkleNode::hash_data(&tx_bytes));
        let transactions_serialized = serde_json::to_string(&self.transactions).unwrap_or_default();
        self.hash = Self::calculate_hash(self.index as u32, self.timestamp, &transactions_serialized, &self.previous_hash);
    }

    /// Finalizes the block so no further transactions can be added.
    pub fn finalize(&mut self) {
        self.finalized = true;
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
