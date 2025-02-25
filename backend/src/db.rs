// src/db.rs
use sqlx::{Pool, Postgres};
use std::env;
use dotenv::dotenv;

pub async fn create_db_pool() -> Pool<Postgres> {
    dotenv().ok(); // Load variables from .env
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env or environment");
    Pool::<Postgres>::connect(&database_url)
        .await
        .expect("Failed to create database connection pool")
}
