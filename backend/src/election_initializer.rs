use backend::poll_manager::{PollManager, PollInput};

pub fn init_election_poll(pm: &mut PollManager) {
    // Check if an election poll already exists.
    if pm.get_poll("election").is_none() {
        println!("Creating election poll...");
        let election_options = r#"{
            "presidency": ["Candidate A", "Candidate B", "Candidate C"],
            "congress": ["Party X", "Party Y"],
            "judges": ["Judge 1", "Judge 2"],
            "propositions": ["Yes", "No"]
        }"#.to_string();

        let election_poll = PollInput {
            poll_id: "election".to_string(),
            title: "2024 Mock Election".to_string(),
            question: "Vote for the following contests: presidency, congress, judges, and propositions".to_string(),
            options: vec![election_options],
            is_public: true,
        };
        pm.create_poll(election_poll);
    } else {
        println!("Election poll already exists.");
    }
}
