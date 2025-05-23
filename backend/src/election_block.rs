use chrono::Utc;
use sha2::{Digest, Sha256};
use serde::{Serialize, Deserialize};
use serde_json::Value;
use sqlx::Row;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElectionBlock {
    pub index: u32,
    pub timestamp: i64,
    pub transactions: Value,
    pub previous_hash: String,
    pub hash: String,
}

impl ElectionBlock {
    pub fn new(index: u32, transactions: Value, previous_hash: String) -> Self {
        let timestamp = Utc::now().timestamp_millis();
        let hash = Self::calculate_hash(index, timestamp, &transactions, &previous_hash);

        ElectionBlock {
            index,
            timestamp,
            transactions,
            previous_hash,
            hash,
        }
    }

    /// Calculates a SHA-256 hash for the block using canonical (sorted-key) JSON serialization.
    pub fn calculate_hash(index: u32, timestamp: i64, transactions: &Value, previous_hash: &str) -> String {
        let transaction_str = if let Value::Object(map) = transactions {
            let mut pairs: Vec<(&String, &Value)> = map.iter().collect();
            pairs.sort_by(|a, b| a.0.cmp(b.0));
            let sorted_map: serde_json::Map<String, Value> = pairs.into_iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect();
            serde_json::to_string(&Value::Object(sorted_map)).unwrap_or_default()
        } else {
            serde_json::to_string(transactions).unwrap_or_default()
        };
        let input = format!("{}{}{}{}", index, timestamp, transaction_str, previous_hash);
        let mut hasher = Sha256::new();
        hasher.update(input);
        format!("{:x}", hasher.finalize())
    }

    /// Verifies that the stored hash matches the recalculated hash.
    pub fn verify_block_integrity(&self) -> bool {
        let recalculated = Self::calculate_hash(self.index, self.timestamp, &self.transactions, &self.previous_hash);
        if self.hash != recalculated {
            println!("ElectionBlock {} integrity failure:", self.index);
            println!("  Stored hash:     {}", self.hash);
            println!("  Recalculated:    {}", recalculated);
            println!("  Transactions:    {}", serde_json::to_string_pretty(&self.transactions).unwrap_or_default());
        }
        self.hash == recalculated
    }

    /// Reconstructs an ElectionBlock from a database row.
    pub fn from_db_row(row: &sqlx::postgres::PgRow) -> Result<Self, sqlx::Error> {
        let index: i32 = row.try_get("block_index")?;
        let timestamp: i64 = row.try_get("timestamp")?;
        let previous_hash: String = row.try_get("previous_hash")?;
        let hash: String = row.try_get("hash")?;
        let transactions_json: String = row.try_get("transactions")?;
        let transactions: Value = serde_json::from_str(&transactions_json).unwrap_or_else(|_| serde_json::json!({}));

        Ok(ElectionBlock {
            index: index as u32,
            timestamp,
            transactions,
            previous_hash,
            hash,
        })
    }
}
