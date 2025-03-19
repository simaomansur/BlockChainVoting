// src/db.rs
use sqlx::{Pool, Postgres};
use std::env;
use dotenv::dotenv;

pub async fn create_db_pool() -> Pool<Postgres> {
    // Load .env file if it exists, but don't error if it doesn't
    dotenv().ok();
    
    // Get the DATABASE_URL from environment (Docker will set this)
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in environment or .env file");
        
    // Add a small delay for Docker container startup
    if env::var("DOCKER_ENVIRONMENT").is_ok() {
        println!("Running in Docker environment, waiting for database to be ready...");
        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
    }
    
    // Log connection attempt (but don't expose credentials)
    println!("Connecting to database...");
    
    // Attempt to connect to the database
    let pool = Pool::<Postgres>::connect(&database_url)
        .await
        .expect("Failed to create database connection pool");
        
    println!("Database connection established successfully");
    
    pool
}