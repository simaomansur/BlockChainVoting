use warp::Filter;
use warp::cors;
use std::sync::{Arc, Mutex};
use blockchain::{Blockchain, Block};
use serde::{Serialize, Deserialize};

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
        .allow_any_origin()  // Allow frontend requests
        .allow_methods(vec!["GET", "POST", "OPTIONS"])  // Allow GET, POST, and preflight OPTIONS
        .allow_headers(vec!["Content-Type"]);  // Allow JSON headers

    let add_vote = warp::post()
        .and(warp::path("vote"))
        .and(warp::body::json())
        .and(blockchain_filter.clone())
        .map(|vote: VoteInput, blockchain: Arc<Mutex<Blockchain>>| {
            let mut blockchain = blockchain.lock().unwrap();
            let transaction = format!("Voter: {} -> Candidate: {}", vote.voter_id, vote.candidate);
            blockchain.add_block(transaction);
            warp::reply::json(&blockchain.chain)
        });

    let get_blockchain = warp::get()
        .and(warp::path("blockchain"))
        .and(blockchain_filter.clone())
        .map(|blockchain: Arc<Mutex<Blockchain>>| {
            let blockchain = blockchain.lock().unwrap();
            warp::reply::json(&blockchain.chain)
        });

    let check_validity = warp::get()
        .and(warp::path("validity"))
        .and(blockchain_filter.clone())
        .map(|blockchain: Arc<Mutex<Blockchain>>| {
            let blockchain = blockchain.lock().unwrap();
            let response = serde_json::json!({ "valid": blockchain.is_valid() });
            warp::reply::json(&response)
        });

    let routes = add_vote.or(get_blockchain).or(check_validity).with(cors);

    println!("🚀 API Server running on http://127.0.0.1:3030");
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}
