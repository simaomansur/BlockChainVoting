use backend::poll_manager::{PollManager, PollInput};

pub async fn init_election_poll(pm: &mut PollManager) {
    // Check if any existing poll is of type "election"
    if pm.polls.values().any(|p| matches!(p, backend::poll_manager::Poll::Election { .. })) {
        println!("Election poll already exists.");
    } else {
        println!("Creating election poll...");
        let election_options = r#"{
            "presidency": ["Candidate A", "Candidate B", "Candidate C"],
            "congress": ["Party X", "Party Y"],
            "judges": ["Judge 1", "Judge 2"],
            "propositions": ["Yes", "No"]
        }"#.to_string();

        let election_poll = PollInput {
            title: "2024 Mock Election".to_string(),
            question: "Vote for the following contests: presidency, congress, judges, and propositions".to_string(),
            // You might consider a more structured approach for multiple contests,
            // but here we store the options as a JSON string.
            options: vec![election_options],
            is_public: true,
            poll_type: Some("election".to_string()),
        };
        pm.create_poll(election_poll)
            .await
            .expect("Failed to create election poll");
    }
}
