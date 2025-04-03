use backend::poll_manager::{PollManager, PollInput};

/// Attempts to initialize a single “official” election poll if none exist.
/// Checks if a poll with `poll_type = "election"` is already present.
/// If not, creates a more detailed poll with multiple offices and propositions.
pub async fn init_election_poll(pm: &mut PollManager) {
    // Check if any existing poll is of type "election"
    if pm.polls.values().any(|p| matches!(p, backend::poll_manager::Poll::Election { .. })) {
        println!("Election poll already exists. Skipping auto-init.");
    } else {
        println!("No existing election poll found. Creating a default election poll with multiple offices...");

        // A more detailed set of options for a national election
        let election_options = r#"{
            "presidency": ["Candidate A", "Candidate B", "Candidate C"],
            "senate": ["Candidate X", "Candidate Y", "Candidate Z"],
            "congress": ["Party 1", "Party 2", "Party 3"],
            "judges": ["Judge 1", "Judge 2", "Judge 3"],
            "propositions": ["Yes on Prop 1", "No on Prop 1", "Yes on Prop 2", "No on Prop 2"]
        }"#.to_string();

        // poll_type is "election" so that it’s recognized as an election poll.
        let election_poll = PollInput {
            title: "2024 National General Election".to_string(),
            question: "Please cast your vote for the following offices and propositions:".to_string(),
            options: vec![election_options],
            is_public: true,
            poll_type: Some("election".to_string()),
        };

        // Attempt to create a new poll; a poll_id (UUID) will be auto-generated.
        match pm.create_poll(election_poll).await {
            Ok(poll_id) => {
                println!("Successfully created new election poll with poll_id: {}", poll_id);
                println!("Offices included: presidency, senate, congress, judges, and multiple propositions.");
            }
            Err(e) => {
                eprintln!("Failed to create election poll: {}", e);
            }
        }
    }
}
