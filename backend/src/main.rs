use warp::{Filter, cors, reject, Rejection, Reply};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::convert::Infallible;
use serde::{Serialize, Deserialize};
use serde_json::json;
use backend::poll_manager::{PollManager, PollInput, Poll};
use backend::user::{UserManager, UserRegistration, UserLogin, UserError, migrate_password_column};
use backend::vote_service::VoteService;
use backend::voting_integration::{VotingIntegration, VotingError};
mod election_initializer;
use election_initializer::init_election_poll;
use sqlx::migrate::Migrator;
use dotenv::dotenv;
mod db;

use sqlx::Row; // For try_get on rows

#[derive(Debug, Clone, Serialize, Deserialize)]
struct VoteInput {
    pub poll_id: String,
    pub voter_id: String,
    pub candidate: String,
}

// Custom rejection for user errors
#[derive(Debug)]
struct CustomRejection {
    message: String,
}

impl reject::Reject for CustomRejection {}

// Convert UserError to warp Rejection
fn user_error_to_rejection(error: UserError) -> Rejection {
    reject::custom(CustomRejection {
        message: error.to_string(),
    })
}

// Convert VotingError to warp Rejection
fn voting_error_to_rejection(error: VotingError) -> Rejection {
    reject::custom(CustomRejection {
        message: error.to_string(),
    })
}

// Convert Rejection to Reply
async fn handle_rejection(err: Rejection) -> Result<impl Reply, Infallible> {
    let message = if let Some(custom) = err.find::<CustomRejection>() {
        custom.message.clone()
    } else {
        "Internal Server Error".to_string()
    };

    let json = warp::reply::json(&json!({ "error": message }));
    let response = warp::reply::with_status(json, warp::http::StatusCode::BAD_REQUEST);
    
    // Add CORS headers to the error response
    Ok(warp::reply::with_header(
        response,
        "Access-Control-Allow-Origin",
        "*"
    ))
}

static MIGRATOR: Migrator = sqlx::migrate!();

#[tokio::main]
async fn main() {
    dotenv().ok();
    let pool = db::create_db_pool().await;
    
    // Run migrations
    MIGRATOR.run(&pool).await.expect("Failed to run migrations");
    
    // Ensure password_hash column exists
    migrate_password_column(&pool).await.expect("Failed to migrate password column");

    // ------------------
    // Create PollManager
    // ------------------
    let poll_manager = Arc::new(Mutex::new(PollManager::new(pool.clone())));

    // Load existing polls from the database
    {
        let poll_rows = sqlx::query("SELECT poll_id FROM polls")
            .fetch_all(&pool)
            .await
            .expect("Failed to fetch poll rows");
        
        // Lock poll_manager asynchronously
        let mut pm = poll_manager.lock().await;
        for row in poll_rows {
            let poll_id: String = row.try_get("poll_id").expect("Failed to extract poll_id");
            pm.load_poll(&poll_id).await.expect("Failed to load poll");
        }
    }

    // Initialize the election poll
    {
        let mut pm = poll_manager.lock().await;
        init_election_poll(&mut pm).await;
    }

    // ----------------------
    // Create Other Managers
    // ----------------------
    let user_manager = Arc::new(UserManager::new(pool.clone()));
    let vote_service = Arc::new(VoteService::new(pool.clone()));
    let voting_integration = Arc::new(VotingIntegration::new(poll_manager.clone(), vote_service.clone()));

    // ---------------
    // Warp + CORS
    // ---------------
    let cors = cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
        .allow_headers(vec!["Content-Type", "Authorization"])
        .build(); 

    // Filters for injecting shared state
    let pm_filter = warp::any().map(move || poll_manager.clone());
    let um_filter = warp::any().map(move || user_manager.clone());
    let vi_filter = warp::any().map(move || voting_integration.clone());

    // ------------------
    // Error Conversions
    // ------------------

    // We'll define some helpers for rejections if needed, but we already have them.

    // --------------------
    // User Management
    // --------------------
    let register = warp::post()
        .and(warp::path("user"))
        .and(warp::path("register"))
        .and(warp::body::json())
        .and(um_filter.clone())
        .and_then(|registration: UserRegistration, user_manager: Arc<UserManager>| async move {
            user_manager
                .register_user(registration)
                .await
                .map(|user| warp::reply::json(&json!({
                    "status": "User registered successfully",
                    "voter_id": user.voter_id
                })))
                .map_err(user_error_to_rejection)
        })
        .with(cors.clone());

    let login = warp::post()
        .and(warp::path("user"))
        .and(warp::path("login"))
        .and(warp::body::json())
        .and(um_filter.clone())
        .and_then(|login: UserLogin, user_manager: Arc<UserManager>| async move {
            user_manager
                .login_user(login)
                .await
                .map(|user| warp::reply::json(&json!({
                    "status": "Login successful",
                    "user": {
                        "voter_id": user.voter_id,
                        "name": user.name,
                        "zip_code": user.zip_code,
                        "birth_date": user.birth_date
                    }
                })))
                .map_err(user_error_to_rejection)
        })
        .with(cors.clone());

    let get_profile = warp::get()
        .and(warp::path("user"))
        .and(warp::path::param::<String>())
        .and(warp::path("profile"))
        .and(um_filter.clone())
        .and_then(|voter_id: String, user_manager: Arc<UserManager>| async move {
            user_manager
                .get_user_by_voter_id(&voter_id)
                .await
                .map(|user| warp::reply::json(&json!({
                    "voter_id": user.voter_id,
                    "name": user.name,
                    "zip_code": user.zip_code,
                    "birth_date": user.birth_date,
                    "created_at": user.created_at
                })))
                .map_err(user_error_to_rejection)
        })
        .with(cors.clone());

    let update_profile = warp::put()
        .and(warp::path("user"))
        .and(warp::path::param::<String>())
        .and(warp::path("profile"))
        .and(warp::body::json())
        .and(um_filter.clone())
        .and_then(|voter_id: String, update: serde_json::Value, user_manager: Arc<UserManager>| async move {
            let name = update.get("name").and_then(|v| v.as_str()).map(|s| s.to_string());
            let zip_code = update.get("zip_code").and_then(|v| v.as_str()).map(|s| s.to_string());
            
            user_manager
                .update_user(&voter_id, name, zip_code)
                .await
                .map(|user| warp::reply::json(&json!({
                    "status": "Profile updated successfully",
                    "user": {
                        "voter_id": user.voter_id,
                        "name": user.name,
                        "zip_code": user.zip_code,
                        "birth_date": user.birth_date
                    }
                })))
                .map_err(user_error_to_rejection)
        })
        .with(cors.clone());

    let change_password = warp::put()
        .and(warp::path("user"))
        .and(warp::path::param::<String>())
        .and(warp::path("password"))
        .and(warp::body::json())
        .and(um_filter.clone())
        .and_then(|voter_id: String, body: serde_json::Value, user_manager: Arc<UserManager>| async move {
            let old_password = body.get("old_password")
                .and_then(|v| v.as_str())
                .ok_or_else(|| reject::custom(CustomRejection {
                    message: "Missing old_password".to_string(),
                }))?;
            
            let new_password = body.get("new_password")
                .and_then(|v| v.as_str())
                .ok_or_else(|| reject::custom(CustomRejection {
                    message: "Missing new_password".to_string(),
                }))?;
            
            user_manager
                .change_password(&voter_id, old_password, new_password)
                .await
                .map(|_| warp::reply::json(&json!({ "status": "Password changed successfully" })))
                .map_err(user_error_to_rejection)
        })
        .with(cors.clone());

    // ------------------------
    // Poll Management Routes
    // ------------------------
    let create_poll = warp::post()
        .and(warp::path("poll"))
        .and(warp::path("create"))
        .and(warp::body::json())
        .and(pm_filter.clone())
        .and_then(|poll: PollInput, poll_manager: Arc<Mutex<PollManager>>| async move {
            // Lock asynchronously
            let mut pm = poll_manager.lock().await;
            match pm.create_poll(poll).await {
                Ok(poll_id) => Ok::<_, Rejection>(warp::reply::json(&json!({
                    "status": "Poll created successfully",
                    "poll_id": poll_id
                }))),
                Err(e) => Err(reject::custom(CustomRejection {
                    message: e.to_string(),
                })),
            }
        })
        .with(cors.clone());

    // -----------------------------
    // Integrated Voting Routes
    // -----------------------------
    let cast_vote = warp::post()
        .and(warp::path("vote"))
        .and(warp::body::json())
        .and(vi_filter.clone())
        .and_then(|body: serde_json::Value, voting_integration: Arc<VotingIntegration>| async move {
            let poll_id = body.get("poll_id").and_then(|v| v.as_str())
                .ok_or_else(|| reject::custom(CustomRejection {
                    message: "Missing poll_id".to_string(),
                }))?;
            
            let voter_id = body.get("voter_id").and_then(|v| v.as_str())
                .ok_or_else(|| reject::custom(CustomRejection {
                    message: "Missing voter_id".to_string(),
                }))?;
            
            let vote_data = body.get("vote").cloned()
                .ok_or_else(|| reject::custom(CustomRejection {
                    message: "Missing vote data".to_string(),
                }))?;
            
            voting_integration
                .cast_vote(poll_id, voter_id, vote_data)
                .await
                .map(|_| warp::reply::json(&json!({
                    "status": "Vote cast successfully",
                    "poll_id": poll_id,
                    "voter_id": voter_id
                })))
                .map_err(voting_error_to_rejection)
        })
        .with(cors.clone());

    let verify_vote_integrated = warp::get()
        .and(warp::path("vote"))
        .and(warp::path::param::<String>())
        .and(warp::path::param::<String>())
        .and(warp::path("verify"))
        .and(vi_filter.clone())
        .and_then(|poll_id: String, voter_id: String, voting_integration: Arc<VotingIntegration>| async move {
            voting_integration
                .verify_vote(&poll_id, &voter_id)
                .await
                .map(|result| warp::reply::json(&result))
                .map_err(voting_error_to_rejection)
        })
        .with(cors.clone());

    let poll_results = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>())
        .and(warp::path("results"))
        .and(vi_filter.clone())
        .and_then(|poll_id: String, voting_integration: Arc<VotingIntegration>| async move {
            voting_integration
                .get_poll_results(&poll_id)
                .await
                .map(|result| warp::reply::json(&result))
                .map_err(voting_error_to_rejection)
        })
        .with(cors.clone());

    // --------------------------
    // Existing Poll Routes
    // --------------------------
    let list_polls = warp::get()
        .and(warp::path!("polls"))
        .and(pm_filter.clone())
        .and_then(|poll_manager: Arc<Mutex<PollManager>>| async move {
            let pm = poll_manager.lock().await;
            let polls: Vec<_> = pm.polls.values().map(|p| {
                match p {
                    Poll::Election { metadata, .. } => metadata.clone(),
                    Poll::Normal { metadata, .. } => metadata.clone(),
                }
            }).collect();
            Ok::<_, Infallible>(warp::reply::json(&polls))
        })
        .with(cors.clone());

    let get_blockchain = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>())
        .and(warp::path("blockchain"))
        .and(pm_filter.clone())
        .and_then(|poll_id: String, poll_manager: Arc<Mutex<PollManager>>| async move {
            let pm = poll_manager.lock().await;
            let response = match pm.get_poll(&poll_id) {
                Some(Poll::Election { blockchain, .. }) => {
                    warp::reply::json(&blockchain.chain)
                },
                Some(Poll::Normal { blockchain, .. }) => {
                    warp::reply::json(&blockchain.chain)
                },
                None => warp::reply::json(&json!({ "error": "Poll not found" })),
            };
            Ok::<_, Infallible>(response)
        })
        .with(cors.clone());

    let get_vote_counts = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>())
        .and(warp::path("vote_counts"))
        .and(pm_filter.clone())
        .and_then(|poll_id: String, poll_manager: Arc<Mutex<PollManager>>| async move {
            let pm = poll_manager.lock().await;
            let response = match pm.get_poll(&poll_id) {
                Some(Poll::Election { blockchain, .. }) => {
                    let counts = blockchain.get_vote_counts();
                    warp::reply::json(&json!({ "vote_counts": counts }))
                },
                Some(Poll::Normal { blockchain, .. }) => {
                    let counts = blockchain.get_vote_counts();
                    warp::reply::json(&json!({ "vote_counts": counts }))
                },
                None => warp::reply::json(&json!({ "error": "Poll not found" }))
            };
            Ok::<_, Infallible>(response)
        })
        .with(cors.clone());

    let check_validity = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>())
        .and(warp::path("validity"))
        .and(pm_filter.clone())
        .and_then(|poll_id: String, poll_manager: Arc<Mutex<PollManager>>| async move {
            let pm = poll_manager.lock().await;
            let response = match pm.get_poll(&poll_id) {
                Some(Poll::Election { blockchain, .. }) => {
                    let valid = blockchain.is_valid();
                    warp::reply::json(&json!({ "valid": valid }))
                },
                Some(Poll::Normal { blockchain, .. }) => {
                    let valid = blockchain.is_valid();
                    warp::reply::json(&json!({ "valid": valid }))
                },
                None => warp::reply::json(&json!({ "error": "Poll not found" })),
            };
            Ok::<_, Infallible>(response)
        })
        .with(cors.clone());

    let get_poll_details = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>())
        .and(warp::path("details"))
        .and(pm_filter.clone())
        .and_then(|poll_id: String, poll_manager: Arc<Mutex<PollManager>>| async move {
            let pm = poll_manager.lock().await;
            let response = match pm.get_poll(&poll_id) {
                Some(Poll::Election { metadata, .. }) => warp::reply::json(&metadata),
                Some(Poll::Normal { metadata, .. }) => warp::reply::json(&metadata),
                None => warp::reply::json(&json!({ "error": "Poll not found" })),
            };
            Ok::<_, Infallible>(response)
        })
        .with(cors.clone());

    let verify_vote = warp::get()
        .and(warp::path("poll"))
        .and(warp::path::param::<String>())
        .and(warp::path("verify_vote"))
        .and(warp::path::param::<String>())
        .and(pm_filter.clone())
        .and_then(|poll_id: String, voter_id: String, poll_manager: Arc<Mutex<PollManager>>| async move {
            let pm = poll_manager.lock().await;
            let response = match pm.get_poll(&poll_id) {
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
                None => warp::reply::json(&json!({ "error": "Poll not found" })),
            };
            Ok::<_, Infallible>(response)
        })
        .with(cors.clone());

    // OPTIONS for CORS
    let options = warp::options()
        .and(warp::path::full())
        .map(|_| warp::reply::with_status(warp::reply(), warp::http::StatusCode::OK))
        .with(cors.clone());

    // Combine routes
    let user_routes = register
        .or(login)
        .or(get_profile)
        .or(update_profile)
        .or(change_password);

    let integrated_voting_routes = cast_vote
        .or(verify_vote_integrated)
        .or(poll_results);

    let poll_routes = create_poll
        .or(list_polls)
        .or(get_blockchain)
        .or(get_vote_counts)
        .or(check_validity)
        .or(get_poll_details)
        .or(verify_vote);

    let routes = user_routes
        .or(integrated_voting_routes)
        .or(poll_routes)
        .or(options)
        .with(cors)
        .recover(handle_rejection);

    // Server host/port
    let host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("SERVER_PORT")
        .map(|p| p.parse::<u16>().unwrap_or(3030))
        .unwrap_or(3030);
    
    let addr: std::net::SocketAddr = format!("{}:{}", host, port)
        .parse()
        .expect("Invalid address");
    
    println!("🚀 API Server running on http://{}:{}", host, port);
    println!("🗄️ Database connected successfully");
    println!("🔗 Blockchain voting system with database integration is ready");
    
    warp::serve(routes).run(addr).await;
}
