use crate::block::Block;

#[derive(Debug, Clone)]
pub struct Blockchain {
    pub chain: Vec<Block>,
}

impl Blockchain {
    pub fn new() -> Self {
        let genesis_block = Block::new(0, "Genesis Block".to_string(), "0".to_string());
        Blockchain {
            chain: vec![genesis_block],
        }
    }

    pub fn add_block(&mut self, transactions: String) {
        let previous_block = self.chain.last().unwrap();
        let new_block = Block::new(
            previous_block.index + 1,
            transactions,
            previous_block.hash.clone(),
        );
        self.chain.push(new_block);
    }

    pub fn is_valid(&self) -> bool {
        for i in 1..self.chain.len() {
            let current = &self.chain[i];
            let previous = &self.chain[i - 1];

            if current.hash != Block::calculate_hash(current.index, current.timestamp, &current.transactions, &current.previous_hash) {
                return false;
            }

            if current.previous_hash != previous.hash {
                return false;
            }
        }
        true
    }
}
