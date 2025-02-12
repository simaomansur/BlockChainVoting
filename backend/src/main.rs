use warp::{Filter, cors};
use std::sync::{Arc, Mutex};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use serde_json::json;

// Import the PollManager from your poll_manager module.
use backend::poll_manager::{PollManager, PollInput};

//
// Data Structures for API Input
//

/// Represents a vote submission, including the poll identifier.
/// The candidate value must match one of the allowed options for the poll.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct VoteInput {
    pub poll_id: String,
    pub voter_id: String,
    pub candidate: String,
}

#[tokio::main]
async fn main() {
    // Create a PollManager instance wrapped in Arc/Mutex for thread-safe access.
    let poll_manager = Arc::new(Mutex::new(PollManager::new()));
    let pm_filter = warp::any().map(move || poll_manager.clone());

    // Set up CORS to allow requests from your React app.
    let cors= cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "OPTIONS"])
        .allow_headers(vec!["Content-Type"]);

    //
    // API Endpoints
    //

    // POST /poll/create - Creates a new poll.
    // This endpoint initializes a new poll (with its own blockchain) in the PollManager.
    let create_poll = warp::post()
        .and(warp::path("poll"))
        .and(warp::path("create"))
        .and(warp::body::json())
        .and(pm_filter.clone())
        .map(|poll: PollInput, poll_manager: Arc<Mutex<PollManager>>| {
            let mut pm = poll_manager.lock().unwrap();
            // Create the poll in the manager.
            pm.create_poll(poll.clone());
            // Optionally, add the poll metadata as the first block in its blockchain.
            let poll_data = serde_json::to_string(&poll).unwrap();
            pm.add_vote(&poll.poll_id, poll_data).unwrap();
            warp::reply::json(&json!({
                "status": "Poll created successfully",
                "poll_id": poll.poll_id
            }))
        }).with(cors.clone());

    // POST /poll/vote - Casts a vote on a specific poll.
    // Validates the vote candidate against the poll's allowed options.
    let add_vote = warp::post()
        .and(warp::path("poll"))
        .and(warp::path("vote"))
        .and(warp::body::json())
        .and(pm_filter.clone())
        .map(|vote: VoteInput, poll_manager: Arc<Mutex<PollManager>>| {
            let mut pm = poll_manager.lock().unwrap();
            // Look up the poll to retrieve its allowed options.
            if let Some(poll) = pm.get_poll(&vote.poll_id) {
                // Check if the submitted candidate is among the allowed options.
                if !poll.metadata.options.contains(&vote.candidate) {
                    return warp::reply::json(&json!({
                        "error": format!("Invalid candidate. Choose one of the allowed options: {:?}", poll.metadata.options)
                    }));
                }
                // Build the vote transaction string.
                let transaction = format!("Voter: {} -> Candidate: {}", vote.voter_id, vote.candidate);
                // Add the vote as a new block in the poll's blockchain.
                match pm.add_vote(&vote.poll_id, transaction) {
                    Ok(_) => warp::reply::json(&json!({ "status": "Vote added successfully" })),
                    Err(e) => warp::reply::json(&json!({ "error": e })),
                }
            } else {
                warp::reply::json(&json!({ "error": "Poll not found" }))
            }
        }).with(cors.clone());

    // GET /polls - Retrieves a list of all polls.
    let list_polls = warp::get()
        .and(warp::path!("polls"))
        .and(pm_filter.clone())
        .map(|poll_manager: Arc<Mutex<PollManager>>| {
            let pm = poll_manager.lock().unwrap();
            let polls: Vec<_> = pm.polls.values()
                .map(|poll| poll.metadata.clone())
                .collect();
            warp::reply::json(&polls)
        })
        .with(cors.clone());

    // GET /poll/{poll_id}/blockchain - Retrieves the blockchain for a specific poll.
    let get_blockchain = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>()) // Expects poll_id as a URL parameter.
        .and(warp::path("blockchain"))
        .and(pm_filter.clone())
        .map(|poll_id: String, poll_manager: Arc<Mutex<PollManager>>| {
            let pm = poll_manager.lock().unwrap();
            match pm.get_poll(&poll_id) {
                Some(poll) => warp::reply::json(&poll.blockchain.chain),
                None => warp::reply::json(&json!({ "error": "Poll not found" })),
            }
        }).with(cors.clone());

    // GET /poll/{poll_id}/validity - Checks the validity of a poll's blockchain.
    let check_validity = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>()) // Expects poll_id as a URL parameter.
        .and(warp::path("validity"))
        .and(pm_filter.clone())
        .map(|poll_id: String, poll_manager: Arc<Mutex<PollManager>>| {
            let pm = poll_manager.lock().unwrap();
            match pm.get_poll(&poll_id) {
                Some(poll) => {
                    let response = json!({ "valid": poll.blockchain.is_valid() });
                    warp::reply::json(&response)
                },
                None => warp::reply::json(&json!({ "error": "Poll not found" })),
            }
        }).with(cors.clone());

    // GET /poll/{poll_id}/vote_counts - Returns vote counts for each candidate in a poll.
    let get_vote_counts = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>()) // Expects poll_id as a URL parameter.
        .and(warp::path("vote_counts"))
        .and(pm_filter.clone())
        .map(|poll_id: String, poll_manager: Arc<Mutex<PollManager>>| {
            let pm = poll_manager.lock().unwrap();
            match pm.get_poll(&poll_id) {
                Some(poll) => {
                    let mut vote_counts: HashMap<String, u32> = HashMap::new();
                    // Iterate over the blocks, skipping the genesis and poll creation blocks.
                    for block in &poll.blockchain.chain {
                        if block.index <= 1 { continue; }
                        if let Some((_, candidate)) = block.transactions.split_once("->") {
                            let candidate = candidate.trim().to_string();
                            if !candidate.is_empty() {
                                *vote_counts.entry(candidate).or_insert(0) += 1;
                            }
                        }
                    }
                    warp::reply::json(&json!({ "vote_counts": vote_counts }))
                },
                None => warp::reply::json(&json!({ "error": "Poll not found" })),
            }
        }).with(cors.clone());

    // Combine all routes into a single filter.
    let routes = create_poll
        .or(add_vote)
        .or(list_polls)
        .or(get_blockchain)
        .or(check_validity)
        .or(get_vote_counts)
        .with(cors);

    println!("🚀 API Server running on http://127.0.0.1:3030");
    warp::serve(routes).run(([0, 0, 0, 0], 3030)).await;
}
