use backend::poll_manager::{PollManager, PollInput};

pub async fn init_election_poll(pm: &mut PollManager) {
    if pm.get_poll("election").is_none() {
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
            options: vec![election_options],
            is_public: true,
            poll_type: Some("election".to_string()),
        };
        pm.create_poll(election_poll).await.expect("Failed to create election poll");
    } else {
        println!("Election poll already exists.");
    }
}

