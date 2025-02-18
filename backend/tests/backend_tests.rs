#[cfg(test)]
mod tests {
    use serde_json::json;
    use backend::block::Block;
    use backend::blockchain::Blockchain;
    use backend::election_blockchain::ElectionBlockchain;
    use backend::poll_manager::{PollManager, PollInput, Poll};

    #[test]
    fn test_block_hash_integrity() {
        let transactions = "Test transaction".to_string();
        let block = Block::new(1, transactions.clone(), "0".to_string());
        let expected_hash = Block::calculate_hash(1, block.timestamp, &transactions, "0");
        assert_eq!(block.hash, expected_hash, "Block hash should match calculated hash");
        assert!(block.verify_block_integrity(), "Block integrity should verify");
    }

    #[test]
    fn poll_manager_normal_poll() {
        let mut pm = PollManager::new();
        let poll_input = PollInput {
            poll_id: "normal".to_string(),
            title: "Normal Poll".to_string(),
            question: "Yes or No?".to_string(),
            options: vec!["Yes".to_string(), "No".to_string()],
            is_public: true,
        };
        pm.create_poll(poll_input.clone());

        // For a normal poll, we expect the vote to be a simple string.
        let vote = "Yes".to_string();
        pm.add_vote("normal", json!(vote)).unwrap();

        if let Some(Poll::Normal { blockchain, .. }) = pm.get_poll("normal") {
            assert_eq!(blockchain.chain.len(), 2, "Normal poll chain length should be 2 after one vote");
            assert!(blockchain.is_valid(), "Blockchain should be valid after adding a vote");
        } else {
            panic!("Normal poll not found or not a Normal type");
        }
    }

    #[test]
    fn test_normal_blockchain_validity() {
        let mut blockchain = Blockchain::new();
        blockchain.add_block("Voter: A -> Candidate: X".to_string());
        blockchain.add_block("Voter: B -> Candidate: Y".to_string());
        assert!(blockchain.is_valid(), "Blockchain should be valid after adding blocks");
    }

    #[test]
    fn test_election_blockchain_new_vote_per_block() {
        let mut election_chain = ElectionBlockchain::new();
        // With our current design, new() creates only the genesis block.
        assert_eq!(election_chain.chain.len(), 1, "Chain should start with only the genesis block");

        // Define three votes as JSON objects.
        let vote1 = json!({"voter_id": "A", "contest": "election", "candidate": "Candidate A"});
        let vote2 = json!({"voter_id": "B", "contest": "election", "candidate": "Candidate B"});
        let vote3 = json!({"voter_id": "C", "contest": "election", "candidate": "Candidate A"});

        // Each call to add_vote creates a new block.
        election_chain.add_vote(vote1).unwrap();
        assert_eq!(election_chain.chain.len(), 2, "After first vote, chain length should be 2");

        election_chain.add_vote(vote2).unwrap();
        assert_eq!(election_chain.chain.len(), 3, "After second vote, chain length should be 3");

        election_chain.add_vote(vote3).unwrap();
        assert_eq!(election_chain.chain.len(), 4, "After third vote, chain length should be 4");

        // Now, test vote counts.
        // With our current implementation, get_vote_counts iterates over each vote object's keys.
        // For each vote, it records counts for key "contest" and for key "candidate".
        // We choose to verify the counts under "candidate", which should reflect the chosen candidate.
        let counts = election_chain.get_vote_counts();
        assert_eq!(
            counts.get("candidate").and_then(|m| m.get("Candidate A")),
            Some(&2),
            "Candidate A should have 2 votes in election poll"
        );
        assert_eq!(
            counts.get("candidate").and_then(|m| m.get("Candidate B")),
            Some(&1),
            "Candidate B should have 1 vote in election poll"
        );

        // Test finding a vote.
        if let Some((block_index, _)) = election_chain.find_vote("A") {
            // Ensure the found vote is not in the genesis block.
            assert!(block_index > 0, "Found vote should not be in the genesis block");
        } else {
            panic!("Vote for voter 'A' should be found");
        }
    }


    #[test]
    fn test_poll_manager_election_poll() {
        let mut pm = PollManager::new();
        let poll_input = PollInput {
            poll_id: "election".to_string(),
            title: "Election Poll".to_string(),
            question: "Vote for candidate".to_string(),
            // For the election poll, options are stored as a JSON string representing structured contests.
            options: vec![r#"{"election": ["Candidate A", "Candidate B"]}"#.to_string()],
            is_public: true,
        };
        pm.create_poll(poll_input.clone());

        // For the election poll, send vote data as a JSON object.
        let vote_json = json!({
            "voter_id": "voter1",
            "contest": "election",
            "candidate": "Candidate A"
        });
        pm.add_vote("election", vote_json).unwrap();

        if let Some(Poll::Election { blockchain, .. }) = pm.get_poll("election") {
            // With our design, chain length should be 1 (genesis) + 1 (this vote) = 2.
            assert_eq!(blockchain.chain.len(), 2, "Election poll chain length should be 2 after one vote");
            let counts = blockchain.get_vote_counts();
            // Check the counts under "candidate" since that's where the chosen candidate is recorded.
            assert_eq!(
                counts.get("candidate").and_then(|m| m.get("Candidate A")),
                Some(&1),
                "Candidate A should have 1 vote in election poll"
            );
        } else {
            panic!("Election poll not found");
        }
    }
}

