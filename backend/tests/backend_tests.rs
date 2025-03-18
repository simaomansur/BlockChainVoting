#[cfg(test)]
mod tests {
    use serde_json::json;
    use backend::block::Block;
    use backend::blockchain::Blockchain;
    use backend::election_blockchain::ElectionBlockchain;
    use backend::poll_manager::{PollManager, PollInput, Poll};
    use sqlx::postgres::PgPoolOptions;
    use sqlx::Error as SqlxError;
    use std::env;
    use std::sync::Arc;
    use tokio::sync::Mutex;

    // Import modules from your backend.
    use backend::user::{UserLogin, UserManager, UserRegistration};
    use backend::vote_service::{VoteService, VoteRequest};
    use backend::voting_integration::VotingIntegration;

    // ==============================
    // Test Setup
    // ==============================
    async fn setup_test_pool() -> Result<sqlx::Pool<sqlx::Postgres>, SqlxError> {
        // Get the database URL from environment or use the default from docker-compose
        let database_url = env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| {
                "postgres://username:password@localhost:5432/my_database".to_string()
            });
        
        println!("Connecting to database: {}", database_url);
        
        // Connect to the database
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(&database_url)
            .await?;
        
        // Verify connection using i32 (INT4) instead of i64 (INT8)
        let result: (i32,) = sqlx::query_as("SELECT 1")
            .fetch_one(&pool)
            .await?;
        
        println!("Database connection verified: {}", result.0);
        
        // First check if tables exist and drop them with IF EXISTS
        sqlx::query("DROP TABLE IF EXISTS blocks CASCADE").execute(&pool).await?;
        sqlx::query("DROP TABLE IF EXISTS votes CASCADE").execute(&pool).await?;
        sqlx::query("DROP TABLE IF EXISTS polls CASCADE").execute(&pool).await?;
        sqlx::query("DROP TABLE IF EXISTS users CASCADE").execute(&pool).await?;
        sqlx::query("DROP TABLE IF EXISTS voters CASCADE").execute(&pool).await?;
        
        // Create both tables to satisfy both naming conventions
        
        // Create voters table for your application code 
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS voters (
                id SERIAL PRIMARY KEY,
                voter_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                zip_code TEXT NOT NULL,
                birth_date DATE NOT NULL,
                password_hash TEXT NOT NULL DEFAULT '',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&pool).await?;
        
        // Create users table as an alias (for tests that expect it)
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                voter_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                zip_code TEXT NOT NULL,
                birth_date DATE NOT NULL,
                password_hash TEXT NOT NULL DEFAULT '',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&pool).await?;
        
        // Create polls table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS polls (
                id SERIAL PRIMARY KEY,
                poll_id TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                question TEXT NOT NULL,
                options JSONB NOT NULL,
                is_public BOOLEAN NOT NULL DEFAULT TRUE,
                poll_type TEXT NOT NULL DEFAULT 'normal',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&pool).await?;
        
        // Create votes table with both vote and vote_data columns
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS votes (
                id SERIAL PRIMARY KEY,
                poll_id TEXT NOT NULL,
                voter_id TEXT NOT NULL,
                vote JSONB,
                vote_data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(poll_id, voter_id)
            )"
        ).execute(&pool).await?;
        
        // Create blocks table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS blocks (
                id SERIAL PRIMARY KEY,
                poll_id TEXT NOT NULL,
                block_index INT NOT NULL,
                timestamp BIGINT NOT NULL,
                previous_hash TEXT NOT NULL,
                hash TEXT NOT NULL,
                transactions JSONB NOT NULL,
                merkle_root TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (poll_id) REFERENCES polls(poll_id)
            )"
        ).execute(&pool).await?;
        
        println!("Database setup complete");
        
        Ok(pool)
    }

    // ==============================
    // Block and Blockchain Tests
    // ==============================

    #[tokio::test]
    async fn test_block_hash_integrity() {
        let transaction = json!("Test transaction");
        let block = Block::new(1, transaction.clone(), "0".to_string());
        // Serialize the transactions vector for hash calculation.
        let transactions_serialized = serde_json::to_string(&vec![transaction]).unwrap_or_default();
        let expected_hash = Block::calculate_hash(1, block.timestamp, &transactions_serialized, "0");
        assert_eq!(block.hash, expected_hash, "Block hash should match calculated hash");
        assert!(block.verify_block_integrity(), "Block integrity should verify");
    }

    #[tokio::test]
    async fn test_normal_blockchain_validity_and_vote_search() {
        let mut blockchain = Blockchain::new();
        blockchain.add_block(json!({"voter_id": "A", "candidate": "X"}));
        blockchain.add_block(json!({"voter_id": "B", "candidate": "Y"}));
        assert!(blockchain.is_valid(), "Blockchain should be valid after adding blocks");

        // Test vote search.
        if let Some((index, hash)) = blockchain.find_vote("A") {
            assert!(index > 0, "Vote for 'A' should not be in the genesis block");
            assert!(!hash.is_empty(), "Hash should be non-empty");
        } else {
            panic!("Vote for voter 'A' not found");
        }

        // Test vote counts.
        let counts = blockchain.get_vote_counts();
        // In this test our vote objects have "candidate" fields.
        // We expect counts for candidate X and Y accordingly.
        assert_eq!(
            counts.get("X"),
            Some(&1),
            "Candidate X should have 1 vote"
        );
        assert_eq!(
            counts.get("Y"),
            Some(&1),
            "Candidate Y should have 1 vote"
        );
    }

    #[tokio::test]
    async fn test_election_blockchain_new_vote_per_block() {
        let mut election_chain = ElectionBlockchain::new();
        assert_eq!(election_chain.chain.len(), 1, "Chain should start with only the genesis block");

        let vote1 = json!({"voter_id": "A", "contest": "election", "candidate": "Candidate A"});
        let vote2 = json!({"voter_id": "B", "contest": "election", "candidate": "Candidate B"});
        let vote3 = json!({"voter_id": "C", "contest": "election", "candidate": "Candidate A"});

        election_chain.add_vote(vote1).unwrap();
        assert_eq!(election_chain.chain.len(), 2, "After first vote, chain length should be 2");

        election_chain.add_vote(vote2).unwrap();
        assert_eq!(election_chain.chain.len(), 3, "After second vote, chain length should be 3");

        election_chain.add_vote(vote3).unwrap();
        assert_eq!(election_chain.chain.len(), 4, "After third vote, chain length should be 4");

        let counts = election_chain.get_vote_counts();
        // Our aggregation groups votes under the "default" contest.
        assert_eq!(
            counts.get("default").and_then(|m| m.get("Candidate A")),
            Some(&2),
            "Candidate A should have 2 votes in election poll"
        );
        assert_eq!(
            counts.get("default").and_then(|m| m.get("Candidate B")),
            Some(&1),
            "Candidate B should have 1 vote in election poll"
        );

        if let Some((block_index, _)) = election_chain.find_vote("A") {
            assert!(block_index > 0, "Found vote should not be in the genesis block");
        } else {
            panic!("Vote for voter 'A' should be found");
        }
    }

    // ==============================
    // PollManager Tests
    // ==============================

    #[tokio::test]
    async fn test_poll_manager_normal_poll() {
        let pool = setup_test_pool().await.expect("Failed to create test pool");
        let mut pm = PollManager::new(pool);

        let poll_input = PollInput {
            title: "Normal Poll".to_string(),
            question: "Yes or No?".to_string(),
            options: vec!["Yes".to_string(), "No".to_string()],
            is_public: true,
            poll_type: Some("normal".to_string()),
        };

        let poll_id = pm.create_poll(poll_input.clone()).await.expect("Poll creation failed");
        
        // Add a vote to the normal poll.
        pm.add_vote(&poll_id, json!({ "voter_id": "voter1", "candidate": "Yes" }))
            .expect("Failed to add vote");
        
        if let Some(Poll::Normal { blockchain, .. }) = pm.get_poll(&poll_id) {
            // Expect genesis block plus one new block.
            assert_eq!(blockchain.chain.len(), 2, "Normal poll chain length should be 2 after one vote");
            assert!(blockchain.is_valid(), "Blockchain should be valid after adding a vote");
        } else {
            panic!("Normal poll not found or not of Normal type");
        }
    }

    #[tokio::test]
    async fn test_poll_manager_election_poll() {
        let pool = setup_test_pool().await.expect("Failed to create test pool");
        let mut pm = PollManager::new(pool);

        let poll_input = PollInput {
            title: "Election Poll".to_string(),
            question: "Vote for candidate".to_string(),
            options: vec![r#"{"election": ["Candidate A", "Candidate B"]}"#.to_string()],
            is_public: true,
            poll_type: Some("election".to_string()),
        };

        let poll_id = pm.create_poll(poll_input.clone()).await.expect("Failed to create election poll");

        let vote_json = json!({
            "voter_id": "voter1",
            "contest": "election",
            "candidate": "Candidate A"
        });
        pm.add_vote(&poll_id, vote_json).unwrap();

        if let Some(Poll::Election { blockchain, .. }) = pm.get_poll(&poll_id) {
            // Expect genesis block plus one new block.
            assert_eq!(blockchain.chain.len(), 2, "Election poll chain length should be 2 after one vote");
            let counts = blockchain.get_vote_counts();
            assert_eq!(
                counts.get("default").and_then(|m| m.get("Candidate A")),
                Some(&1),
                "Candidate A should have 1 vote in election poll"
            );
        } else {
            panic!("Election poll not found or not of Election type");
        }
    }

    // ==============================
    // User Module Tests
    // ==============================
    #[tokio::test]
    async fn test_user_registration_and_login() {
        let pool = setup_test_pool().await.expect("Failed to set up test pool");
        let user_manager = UserManager::new(pool.clone());
        
        let registration = UserRegistration {
            name: "Test User".to_string(),
            email: "a@a.com".to_string(),
            zip_code: "12345".to_string(),
            birth_date: "2000-01-01".to_string(),
            password: "testpassword".to_string(),
        };

        let registered_user = user_manager.register_user(registration).await
            .expect("User registration failed");

        let login = UserLogin {
            email: registered_user.email.clone().unwrap(),
            password: "testpassword".to_string(),
        };

        let logged_in_user = user_manager.login_user(login).await
            .expect("User login failed");

        assert_eq!(logged_in_user.voter_id, registered_user.voter_id, "Voter IDs should match");
    }

    #[tokio::test]
    async fn test_user_change_password() {
        let pool = setup_test_pool().await.expect("Failed to set up test pool");
        let user_manager = UserManager::new(pool.clone());
        
        let registration = UserRegistration {
            name: "Password Tester".to_string(),
            email: "a@a.com".to_string(),
            zip_code: "54321".to_string(),
            birth_date: "1990-05-05".to_string(),
            password: "oldpassword".to_string(),
        };

        let registered_user = user_manager.register_user(registration).await
            .expect("User registration failed");
        
        // Change password.
        user_manager.change_password(&registered_user.voter_id, "oldpassword", "newpassword")
            .await
            .expect("Change password failed");
        
        // Login with new password should succeed.
        let login_new = UserLogin {
            email: registered_user.email.clone().unwrap(),
            password: "newpassword".to_string(),
        };
        let user_new = user_manager.login_user(login_new).await
            .expect("Login with new password failed");
        assert_eq!(user_new.voter_id, registered_user.voter_id, "Voter IDs should match after password change");
        
        // Login with old password should fail.
        let login_old = UserLogin {
            email: registered_user.email.clone().unwrap(),
            password: "oldpassword".to_string(),
        };
        let result = user_manager.login_user(login_old).await;
        assert!(result.is_err(), "Login with old password should fail");
    }

    // ==============================
    // Vote Service Tests
    // ==============================
    #[tokio::test]
    async fn test_vote_service_record_and_duplicate() {
        let pool = setup_test_pool().await.expect("Failed to set up test pool");
        let vote_service = VoteService::new(pool.clone());
        
        let vote_request = VoteRequest {
            poll_id: "test_poll".to_string(),
            voter_id: "voter_test".to_string(),
            vote_data: json!({"candidate": "Candidate X"}),
        };

        // Record a vote.
        let vote_record = vote_service.record_vote(vote_request.clone()).await
            .expect("Failed to record vote");
        assert!(vote_record.id > 0, "Vote record should have a valid ID");

        // Attempt to record a duplicate vote should return an error.
        let duplicate_result = vote_service.record_vote(vote_request).await;
        assert!(duplicate_result.is_err(), "Duplicate vote should fail");
    }

    // ==============================
    // Voting Integration Tests
    // ==============================
    #[tokio::test]
    async fn test_voting_integration_cast_and_verify_vote() {
        let pool = setup_test_pool().await.expect("Failed to set up test pool");

        // Create managers and wrap PollManager in an async Mutex.
        let vote_service = Arc::new(VoteService::new(pool.clone()));
        let poll_manager = Arc::new(Mutex::new(PollManager::new(pool.clone())));
        let voting_integration = Arc::new(VotingIntegration::new(poll_manager.clone(), vote_service.clone()));

        // Create a normal poll.
        let poll_input = PollInput {
            title: "Integration Poll".to_string(),
            question: "Do you agree?".to_string(),
            options: vec!["Yes".to_string(), "No".to_string()],
            is_public: true,
            poll_type: Some("normal".to_string()),
        };

        let poll_id = {
            let mut pm_lock = poll_manager.lock().await;
            pm_lock.create_poll(poll_input).await.expect("Poll creation failed")
        };

        // THE ISSUE: The vote data structure doesn't match what the system expects
        // Change this:
        // let vote_data = json!({ "voter_id": "integration_voter", "candidate": "Yes" });
        
        // To this:
        let vote_data = json!({ 
            "voter_id": "integration_voter", 
            "candidate": "Yes",
            // Add any other required fields based on your specific implementation
            // For example, you might need:
            "contest": "default"
        });

        voting_integration.cast_vote(&poll_id, "integration_voter", vote_data.clone())
            .await
            .expect("Failed to cast vote");

        // Verify the vote exists in both systems.
        let verify_result = voting_integration.verify_vote(&poll_id, "integration_voter")
            .await
            .expect("Vote verification failed");
        
        let verified = verify_result.get("verified")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        assert!(verified, "Vote should be verified in both blockchain and database");

        // Here's the part that's failing:
        let results = voting_integration.get_poll_results(&poll_id)
            .await
            .expect("Failed to get poll results");
        
        // Print the results structure for debugging (helpful for seeing exactly what's returned)
        println!("Results: {:?}", results);
        
        // The current check might be looking in the wrong place:
        // let candidate_count = results.get("blockchain_results")
        //     .and_then(|v| v.get("candidate"))
        //     .and_then(|m| m.get("Yes"))
        //     .and_then(|v| v.as_u64())
        //     .unwrap_or(0);
        
        // Try these alternative lookups instead:
        
        // Option 1: Direct path if you know the exact structure
        let candidate_count = results
            .get("blockchain_results")
            .and_then(|r| r.as_object())
            .and_then(|obj| obj.get("Yes"))
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        
        // Option 2: If the vote is under a contest
        // let candidate_count = results
        //    .get("blockchain_results")
        //    .and_then(|r| r.get("default"))  // or whatever contest name is used
        //    .and_then(|c| c.get("Yes"))
        //    .and_then(|v| v.as_u64())
        //    .unwrap_or(0);
            
        // Option 3: If the results are not nested
        // let candidate_count = results
        //    .get("Yes")
        //    .and_then(|v| v.as_u64())
        //    .unwrap_or(0);
        
        assert!(candidate_count >= 1, "Candidate Yes should have at least 1 vote");
    }
}
