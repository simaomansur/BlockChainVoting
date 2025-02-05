use warp::{Filter, cors};  // Explicitly import Filter
use std::sync::{Arc, Mutex};
use blockchain::{Blockchain, Block};
use serde::{Serialize, Deserialize};
use std::collections::{HashSet, HashMap};
use serde_json::json;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct VoteInput {
    voter_id: String,
    candidate: String,
}

#[tokio::main]
async fn main() {
    let blockchain = Arc::new(Mutex::new(Blockchain::new()));
    let blockchain_filter = warp::any().map(move || blockchain.clone());

    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "OPTIONS"])
        .allow_headers(vec!["Content-Type"]);

    // Allowed Candidates
    let valid_candidates: HashSet<String> = ["Alice", "Bob", "Charlie", "Diana"]
        .iter()
        .map(|s| s.to_string())
        .collect();

    // POST /vote
    let add_vote = warp::post()
        .and(warp::path("vote"))
        .and(warp::body::json())
        .and(blockchain_filter.clone())
        .map(move |vote: VoteInput, blockchain: Arc<Mutex<Blockchain>>| {
            if !valid_candidates.contains(&vote.candidate) {
                return warp::reply::json(&serde_json::json!({
                    "error": "Invalid candidate. Choose Alice, Bob, Charlie, or Diana."
                }));
            }

            let mut blockchain = blockchain.lock().unwrap();
            let transaction = format!("Voter: {} -> Candidate: {}", vote.voter_id, vote.candidate);
            blockchain.add_block(transaction);
            warp::reply::json(&blockchain.chain)
        }).with(cors.clone());

    // GET /blockchain
    let get_blockchain = warp::get()
        .and(warp::path("blockchain"))
        .and(blockchain_filter.clone())
        .map(|blockchain: Arc<Mutex<Blockchain>>| {
            let blockchain = blockchain.lock().unwrap();
            warp::reply::json(&blockchain.chain)
        }).with(cors.clone());

    // GET /validity
    let check_validity = warp::get()
        .and(warp::path("validity"))
        .and(blockchain_filter.clone())
        .map(|blockchain: Arc<Mutex<Blockchain>>| {
            let blockchain = blockchain.lock().unwrap();
            let response = serde_json::json!({ "valid": blockchain.is_valid() });
            warp::reply::json(&response)
        }).with(cors.clone());

    let get_vote_counts = warp::get()
        .and(warp::path("vote_counts"))
        .and(blockchain_filter.clone())
        .map(|blockchain: Arc<Mutex<Blockchain>>| {
            let blockchain = blockchain.lock().unwrap();
            let mut vote_counts: HashMap<String, u32> = HashMap::new();

            for block in &blockchain.chain {
                if block.index == 0 { continue; } // Skip Genesis block

                if let Some((_, candidate)) = block.transactions.split_once("->") {
                    let candidate = candidate.trim().to_string();
                    if !candidate.is_empty() {
                        *vote_counts.entry(candidate).or_insert(0) += 1;
                    }
                }
            }

            warp::reply::json(&json!({ "vote_counts": vote_counts }))
        }).with(cors.clone());

    let routes = add_vote.or(get_blockchain).or(check_validity).or(get_vote_counts).with(cors);

    println!("🚀 API Server running on http://127.0.0.1:3030");
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}