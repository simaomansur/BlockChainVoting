use sha2::{Sha256, Digest};

#[derive(Debug, Clone, Default)]
pub struct MerkleTree {
    leaves: Vec<MerkleNode>,
    root: Option<MerkleNode>,
}

impl MerkleTree {
    pub fn new() -> Self {
        MerkleTree {
            leaves: Vec::new(),
            root: None,
        }
    }

    pub fn add_node(&mut self, hash: Vec<u8>) {
        let new_leaf = MerkleNode::new_leaf(hash);
        self.leaves.push(new_leaf);
        self.update_tree();
    }

    /// Returns the root hash of the Merkle tree as a reference to a Vec<u8>, if available.
    pub fn root(&self) -> Option<&Vec<u8>> {
        self.root.as_ref().map(|node| &node.hash)
    }

    fn update_tree(&mut self) {
        if self.leaves.is_empty() {
            self.root = None;
            return;
        }

        let mut current_level = self.leaves.clone();
        
        while current_level.len() > 1 {
            let mut next_level = Vec::new();
            
            for pair in current_level.chunks(2) {
                match pair {
                    [left, right] => {
                        let parent = MerkleNode::new_internal(left.clone(), right.clone());
                        next_level.push(parent);
                    }
                    [remaining] => {
                        next_level.push(remaining.clone());
                    }
                    _ => unreachable!(),
                }
            }
            
            current_level = next_level;
        }

        self.root = Some(current_level.remove(0));
    }
}

#[derive(Debug, Clone)]
pub struct MerkleNode {
    hash: Vec<u8>,
    left: Option<Box<MerkleNode>>,
    right: Option<Box<MerkleNode>>
}

impl MerkleNode {
    /// Creates a new leaf node with the given hash.
    fn new_leaf(hash: Vec<u8>) -> Self {
        MerkleNode {
            hash,
            left: None,
            right: None,
        }
    }
    
    /// Creates a new internal node from two child nodes.
    fn new_internal(left: MerkleNode, right: MerkleNode) -> Self {
        let mut hasher = Sha256::new();
        hasher.update(&left.hash);
        hasher.update(&right.hash);
        let hash = hasher.finalize().to_vec();

        MerkleNode {
            hash,
            left: Some(Box::new(left)),
            right: Some(Box::new(right)),
        }
    }

    /// Hashes arbitrary data using SHA256.
    pub fn hash_data(data: &[u8]) -> Vec<u8> {
        let mut hasher = Sha256::new();
        hasher.update(data);
        hasher.finalize().to_vec()
    }
}
