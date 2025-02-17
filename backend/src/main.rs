use warp::{Filter, cors};
use std::sync::{Arc, Mutex};
use serde::{Serialize, Deserialize};
use serde_json::json;

// Import your PollManager, PollInput, and Poll enum from poll_manager.rs.
use backend::poll_manager::{PollManager, PollInput, Poll};
// Import the election initializer function.
mod election_initializer;
use election_initializer::init_election_poll;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct VoteInput {
    pub poll_id: String,
    pub voter_id: String,
    pub candidate: String,
}

#[tokio::main]
async fn main() {
    // Create a PollManager instance wrapped in an Arc/Mutex for thread-safe access.
    let poll_manager = Arc::new(Mutex::new(PollManager::new()));
    
    // Initialize the election poll separately (in its own module).
    {
        let mut pm = poll_manager.lock().unwrap();
        init_election_poll(&mut pm);
    }

    // Set up CORS middleware.
    let cors = cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "OPTIONS"])
        .allow_headers(vec!["Content-Type"]);

    // Create a filter to pass the PollManager to each route.
    let pm_filter = warp::any().map(move || poll_manager.clone());

    // POST /poll/create - Creates a new poll (for normal polls).
    let create_poll = warp::post()
        .and(warp::path("poll"))
        .and(warp::path("create"))
        .and(warp::body::json())
        .and(pm_filter.clone())
        .map(|poll: PollInput, poll_manager: Arc<Mutex<PollManager>>| {
            let mut pm = poll_manager.lock().unwrap();
            pm.create_poll(poll.clone());
            // For simplicity, store the poll metadata as a block.
            let poll_data = serde_json::to_string(&poll).unwrap();
            pm.add_vote(&poll.poll_id, poll_data).unwrap();
            warp::reply::json(&json!({
                "status": "Poll created successfully",
                "poll_id": poll.poll_id
            }))
        })
        .with(cors.clone());

    // POST /poll/vote - Casts a vote on a poll.
    let add_vote = warp::post()
        .and(warp::path("poll"))
        .and(warp::path("vote"))
        .and(warp::body::json())
        .and(pm_filter.clone())
        .map(|vote: VoteInput, poll_manager: Arc<Mutex<PollManager>>| {
            let mut pm = poll_manager.lock().unwrap();
            if pm.get_poll(&vote.poll_id).is_none() {
                return warp::reply::json(&json!({ "error": "Poll not found" }));
            }
            
            // For election polls, build a structured JSON vote; for normal polls, use a simple string.
            let vote_transaction = if vote.poll_id == "election" {
                serde_json::json!({
                    "voter_id": vote.voter_id,
                    "contest": "election", // Extend later for multiple contests.
                    "candidate": vote.candidate
                }).to_string()
            } else {
                format!("Voter: {} -> Candidate: {}", vote.voter_id, vote.candidate)
            };

            match pm.add_vote(&vote.poll_id, vote_transaction) {
                Ok(_) => warp::reply::json(&json!({ "status": "Vote added successfully" })),
                Err(e) => warp::reply::json(&json!({ "error": e })),
            }
        })
        .with(cors.clone());

    // OPTIONS /poll/vote - Preflight handler for voting.
    let vote_options = warp::options()
        .and(warp::path("poll"))
        .and(warp::path("vote"))
        .map(|| warp::reply())
        .with(cors.clone());
    let vote_route = add_vote.or(vote_options);

    // GET /polls - Returns a list of all polls.
    let list_polls = warp::get()
        .and(warp::path!("polls"))
        .and(pm_filter.clone())
        .map(|poll_manager: Arc<Mutex<PollManager>>| {
            let pm = poll_manager.lock().unwrap();
            let polls: Vec<_> = pm.polls.values().map(|p| {
                match p {
                    Poll::Election { metadata, .. } => metadata.clone(),
                    Poll::Normal { metadata, .. } => metadata.clone(),
                }
            }).collect();
            warp::reply::json(&polls)
        })
        .with(cors.clone());

    // GET /poll/{poll_id}/blockchain - Returns the blockchain for a poll.
    let get_blockchain = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>())
        .and(warp::path("blockchain"))
        .and(pm_filter.clone())
        .map(|poll_id: String, poll_manager: Arc<Mutex<PollManager>>| {
            let pm = poll_manager.lock().unwrap();
            match pm.get_poll(&poll_id) {
                Some(Poll::Election { blockchain, .. }) => warp::reply::json(&blockchain.chain),
                Some(Poll::Normal { blockchain, .. }) => warp::reply::json(&blockchain.chain),
                None => warp::reply::json(&json!({ "error": "Poll not found" })),
            }
        })
        .with(cors.clone());

    // GET /poll/{poll_id}/vote_counts - Returns vote counts.
    let get_vote_counts = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>())
        .and(warp::path("vote_counts"))
        .and(pm_filter.clone())
        .map(|poll_id: String, poll_manager: Arc<Mutex<PollManager>>| {
            let pm = poll_manager.lock().unwrap();
            match pm.get_poll(&poll_id) {
                Some(Poll::Election { blockchain, .. }) => {
                    let counts = blockchain.get_vote_counts();
                    warp::reply::json(&json!({ "vote_counts": counts }))
                },
                Some(Poll::Normal { blockchain, .. }) => {
                    let counts = blockchain.get_vote_counts();
                    warp::reply::json(&json!({ "vote_counts": counts }))
                },
                None => warp::reply::json(&json!({ "error": "Poll not found" }))
            }
        })
        .with(cors.clone());

    // GET /poll/{poll_id} - Returns poll metadata (details).
    let get_poll_details = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>())
        .and(pm_filter.clone())
        .map(|poll_id: String, poll_manager: Arc<Mutex<PollManager>>| {
            let pm = poll_manager.lock().unwrap();
            match pm.get_poll(&poll_id) {
                Some(Poll::Election { metadata, .. }) => warp::reply::json(&metadata),
                Some(Poll::Normal { metadata, .. }) => warp::reply::json(&metadata),
                None => warp::reply::json(&json!({ "error": "Poll not found" })),
            }
        })
        .with(cors.clone());

    // GET /poll/{poll_id}/validity - Checks blockchain validity.
    let check_validity = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>())
        .and(warp::path("validity"))
        .and(pm_filter.clone())
        .map(|poll_id: String, poll_manager: Arc<Mutex<PollManager>>| {
            let pm = poll_manager.lock().unwrap();
            match pm.get_poll(&poll_id) {
                Some(Poll::Election { blockchain, .. }) => {
                    let response = json!({ "valid": blockchain.is_valid() });
                    warp::reply::json(&response)
                },
                Some(Poll::Normal { blockchain, .. }) => {
                    let response = json!({ "valid": blockchain.is_valid() });
                    warp::reply::json(&response)
                },
                None => warp::reply::json(&json!({ "error": "Poll not found" })),
            }
        })
        .with(cors.clone());

    // GET /poll/{poll_id}/verify_vote/{voter_id} - Verifies a vote by voter_id.
    let verify_vote = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>()) // poll_id
        .and(warp::path("verify_vote"))
        .and(warp::path::param::<String>()) // voter_id
        .and(pm_filter.clone())
        .map(|poll_id: String, voter_id: String, poll_manager: Arc<Mutex<PollManager>>| {
            let pm = poll_manager.lock().unwrap();
            match pm.get_poll(&poll_id) {
                Some(Poll::Normal { blockchain, .. }) => {
                    if let Some((block_index, vote_hash)) = blockchain.find_vote(&voter_id) {
                        warp::reply::json(&json!({
                            "verified": true,
                            "block_index": block_index,
                            "vote_hash": vote_hash,
                            "timestamp": blockchain.chain[block_index as usize].timestamp
                        }))
                    } else {
                        warp::reply::json(&json!({ "verified": false, "error": "Vote not found" }))
                    }
                },
                Some(Poll::Election { blockchain, .. }) => {
                    if let Some((block_index, vote_hash)) = blockchain.find_vote(&voter_id) {
                        warp::reply::json(&json!({
                            "verified": true,
                            "block_index": block_index,
                            "vote_hash": vote_hash,
                            "timestamp": blockchain.chain[block_index as usize].timestamp
                        }))
                    } else {
                        warp::reply::json(&json!({ "verified": false, "error": "Vote not found" }))
                    }
                },
                None => warp::reply::json(&json!({ "error": "Poll not found" }))
            }
        })
        .with(cors.clone());

    // Combine all routes into a single filter.
    let routes = create_poll
        .or(vote_route)
        .or(list_polls)
        .or(get_blockchain)
        .or(get_poll_details)
        .or(get_vote_counts)
        .or(check_validity)
        .or(verify_vote)
        .with(cors);

    println!("🚀 API Server running on http://127.0.0.1:3030");
    warp::serve(routes).run(([0, 0, 0, 0], 3030)).await;
}
