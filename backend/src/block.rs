use sha2::{Digest, Sha256};
use chrono::Utc;
use serde::{Serialize, Deserialize};
use serde_json::Value;
use sqlx::{Error, Row};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    pub index: i32,
    pub timestamp: i64,
    pub transactions: Vec<Value>,
    pub previous_hash: String,
    pub hash: String,
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

        Block {
            index: index as i32,
            timestamp,
            transactions: transactions_vec,
            previous_hash,
            hash,
            finalized: false, // Initially not finalized
        }
    }

    /// Creates a Block instance from a database row.
    pub fn from_db_row(row: &sqlx::postgres::PgRow) -> Result<Self, Error> {
        // Extract the block's fields from the database row.
        let index: i32 = row.try_get("index")?;
        let timestamp: i64 = row.try_get("timestamp")?;
        let transactions: Vec<Value> = row.try_get("transactions")?;
        let previous_hash: String = row.try_get("previous_hash")?;
        let hash: String = row.try_get("hash")?;
        let finalized: bool = row.try_get("finalized")?;

        Ok(Block {
            index,
            timestamp,
            transactions,
            previous_hash,
            hash,
            finalized,
        })
    }

    /// Adds a new transaction to the block and updates its hash.
    pub fn add_transaction(&mut self, transaction: Value) {
        if self.finalized {
            println!("Block {} is finalized and cannot be modified.", self.index);
            return;
        }
        self.transactions.push(transaction.clone());
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
