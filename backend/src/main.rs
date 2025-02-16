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
    
    // Pre-seed the election poll once at server startup.
    {
        let mut pm = poll_manager.lock().unwrap();
        if pm.get_poll("election").is_none() {
            println!("Creating election poll...");
            // Here we create a fake election poll.
            // PollInput.options is defined as Vec<String>.
            // For a multi-contest election, we use a single JSON string that encodes structured options.
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
                options: vec![election_options], // storing the structured options as one JSON string
                is_public: true,
            };
            pm.create_poll(election_poll);
        }
    }

    // Set up your CORS filter.
    let cors = cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "OPTIONS"])
        .allow_headers(vec!["Content-Type"]);

    // Set up a filter to clone poll_manager.
    let pm_filter = warp::any().map(move || poll_manager.clone());

    //
    // API Endpoints
    //

    // POST /poll/create - Creates a new poll.
    let create_poll = warp::post()
        .and(warp::path("poll"))
        .and(warp::path("create"))
        .and(warp::body::json())
        .and(pm_filter.clone())
        .map(|poll: PollInput, poll_manager: Arc<Mutex<PollManager>>| {
            let mut pm = poll_manager.lock().unwrap();
            pm.create_poll(poll.clone());
            let poll_data = serde_json::to_string(&poll).unwrap();
            pm.add_vote(&poll.poll_id, poll_data).unwrap();
            warp::reply::json(&json!({
                "status": "Poll created successfully",
                "poll_id": poll.poll_id
            }))
        }).with(cors.clone());

    // POST /poll/vote - Casts a vote on a specific poll.
    // POST /poll/vote - Casts a vote on a specific poll.
    let add_vote = warp::post()
        .and(warp::path("poll"))
        .and(warp::path("vote"))
        .and(warp::body::json())
        .and(pm_filter.clone())
        .map(|vote: VoteInput, poll_manager: Arc<Mutex<PollManager>>| {
            let mut pm = poll_manager.lock().unwrap();
            
            // 1) Check if poll exists
            let poll = match pm.get_poll(&vote.poll_id) {
                Some(p) => p,
                None => {
                    return warp::reply::json(&json!({ "error": "Poll not found" }));
                }
            };

            // 2) Parse the single JSON string in poll.metadata.options[0]
            if poll.metadata.options.is_empty() {
                return warp::reply::json(&json!({
                    "error": "No options defined for this poll."
                }));
            }

            let json_str = &poll.metadata.options[0];
            let parsed_options: serde_json::Value = match serde_json::from_str(json_str) {
                Ok(val) => val,
                Err(e) => {
                    return warp::reply::json(&json!({
                        "error": format!("Error parsing poll options: {}", e)
                    }));
                }
            };

            // 3) Suppose the user sends "presidency: Candidate A" in vote.candidate
            // We'll split by ": " to separate the contest from the actual candidate
            let parts: Vec<&str> = vote.candidate.splitn(2, ": ").collect();
            if parts.len() < 2 {
                return warp::reply::json(&json!({
                    "error": "Invalid candidate format. Expect 'contest: candidate'."
                }));
            }
            let contest = parts[0];
            let actual_candidate = parts[1];

            // 4) Check if the contest exists in the JSON
            //    The structure is something like: {
            //       "presidency": ["Candidate A", "Candidate B"],
            //       "congress": ["Party X", "Party Y"],
            //       ...
            //    }
            if !parsed_options.is_object() {
                return warp::reply::json(&json!({
                    "error": "Poll options are not structured correctly."
                }));
            }

            let obj = parsed_options.as_object().unwrap();
            let contest_array = match obj.get(contest) {
                Some(arr) if arr.is_array() => arr.as_array().unwrap(),
                _ => {
                    return warp::reply::json(&json!({
                        "error": format!("Contest '{}' not found.", contest)
                    }));
                }
            };

            // 5) Check if the actual candidate is in the array
            let valid_candidate = contest_array.iter().any(|val| {
                val.as_str().map_or(false, |s| s == actual_candidate)
            });
            if !valid_candidate {
                return warp::reply::json(&json!({
                    "error": format!("'{}' is not a valid candidate in '{}'.", actual_candidate, contest)
                }));
            }

            // 6) If we get here, the vote is valid. Add the block to the blockchain
            let transaction = format!("Voter: {} -> {}: {}", vote.voter_id, contest, actual_candidate);
            match pm.add_vote(&vote.poll_id, transaction) {
                Ok(_) => warp::reply::json(&json!({ "status": "Vote added successfully" })),
                Err(e) => warp::reply::json(&json!({ "error": e })),
            }
        })
        .with(cors.clone());


    // OPTIONS /poll/vote - Handle preflight CORS requests for voting.
    let vote_options = warp::options()
        .and(warp::path("poll"))
        .and(warp::path("vote"))
        .map(|| warp::reply())
        .with(cors.clone());

    // Combine the POST and OPTIONS handlers for /poll/vote.
    let vote_route = add_vote.or(vote_options);

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
        .and(warp::path::param::<String>())
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
        .and(warp::path::param::<String>())
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
        .and(warp::path::param::<String>())
        .and(warp::path("vote_counts"))
        .and(pm_filter.clone())
        .map(|poll_id: String, poll_manager: Arc<Mutex<PollManager>>| {
            let pm = poll_manager.lock().unwrap();
            if let Some(poll) = pm.get_poll(&poll_id) {
                let mut vote_counts: HashMap<String, u32> = HashMap::new();
                for block in &poll.blockchain.chain {
                    if block.index <= 1 { continue; }
                    if let Some((_, candidate)) = block.transactions.split_once("->") {
                        let candidate = candidate.trim().to_string();
                        *vote_counts.entry(candidate).or_insert(0) += 1;
                    }
                }
                warp::reply::json(&json!({ "vote_counts": vote_counts }))
            } else {
                warp::reply::json(&json!({ "error": "Poll not found" }))
            }
        })
        .with(cors.clone());

    // GET /poll/{poll_id} - Returns the poll's metadata (details)
    let get_poll_details = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>())
        .and(pm_filter.clone())
        .map(|poll_id: String, poll_manager: Arc<Mutex<PollManager>>| {
            let pm = poll_manager.lock().unwrap();
            if let Some(poll) = pm.get_poll(&poll_id) {
                warp::reply::json(&poll.metadata)
            } else {
                warp::reply::json(&json!({ "error": "Poll not found" }))
            }
        })
        .with(cors.clone());

    // Combine all routes into a single filter.
    let routes = create_poll
        .or(vote_route)
        .or(list_polls)
        .or(get_blockchain)
        .or(check_validity)
        .or(get_vote_counts)
        .or(get_poll_details)
        .with(cors);

    println!("🚀 API Server running on http://127.0.0.1:3030");
    warp::serve(routes).run(([0, 0, 0, 0], 3030)).await;
}
