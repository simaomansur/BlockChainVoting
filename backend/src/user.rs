use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// User structure for database operations
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: i32,
    pub voter_id: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub zip_code: Option<String>,
    pub birth_date: Option<chrono::NaiveDate>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing)]
    pub password_hash: String,
}

/// User registration input structure
#[derive(Debug, Deserialize)]
pub struct UserRegistration {
    pub name: String,
    pub email: String,
    pub zip_code: String,
    pub birth_date: String,
    pub password: String,
}

/// User login input structure — now using email instead of voter_id
#[derive(Debug, Deserialize)]
pub struct UserLogin {
    pub email: String,
    pub password: String,
}

/// Error types for user operations
#[derive(Debug, Serialize)]
pub enum UserError {
    DatabaseError(String),
    AuthenticationError(String),
    ValidationError(String),
}

impl std::fmt::Display for UserError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            UserError::AuthenticationError(msg) => write!(f, "Authentication error: {}", msg),
            UserError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
        }
    }
}

impl std::error::Error for UserError {}

#[allow(dead_code)]
fn handle_db_error(error: sqlx::Error) -> UserError {
    match error {
        sqlx::Error::RowNotFound => UserError::DatabaseError("User not found".to_string()),
        sqlx::Error::Database(e) => {
            if e.message().contains("duplicate key") {
                UserError::ValidationError("Voter ID already exists".to_string())
            } else {
                UserError::DatabaseError(format!("Database error: {}", e))
            }
        },
        sqlx::Error::PoolTimedOut => UserError::DatabaseError("Database connection timeout. Make sure your database is running.".to_string()),
        _ => UserError::DatabaseError(format!("Database error: {}", error))
    }
}

/// User manager to handle all user-related database operations
pub struct UserManager {
    pool: Pool<Postgres>,
}

impl UserManager {
    /// Create a new UserManager with the provided database pool
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    /// Register a new user
    pub async fn register_user(&self, registration: UserRegistration) -> Result<User, UserError> {
        // Validate input data
        if registration.name.trim().is_empty() {
            return Err(UserError::ValidationError("Name cannot be empty".to_string()));
        }

        // Parse birth date
        let birth_date = chrono::NaiveDate::parse_from_str(&registration.birth_date, "%Y-%m-%d")
            .map_err(|_| UserError::ValidationError("Invalid birth date format".to_string()))?;

        // Generate a unique voter ID
        let voter_id = Uuid::new_v4().to_string();

        // Hash the password
        let password_hash = hash_password(&registration.password)
            .map_err(|e| UserError::ValidationError(format!("Password hashing error: {}", e)))?;

        // Check if the email already exists
        let existing_user = sqlx::query_as::<_, User>(
            "SELECT id, voter_id, name, email, zip_code, birth_date, created_at, password_hash FROM voters WHERE email = $1"
        )
        .bind(&registration.email)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| UserError::DatabaseError(e.to_string()))?;
        if existing_user.is_some() {
            return Err(UserError::ValidationError("Email already exists".to_string()));
        }

        // Insert the new user into the database
        let user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO voters (voter_id, name, email, zip_code, birth_date, password_hash)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, voter_id, name, email, zip_code, birth_date, created_at, password_hash
            "#
        )
        .bind(&voter_id)
        .bind(&registration.name)
        .bind(&registration.email)
        .bind(&registration.zip_code)
        .bind(birth_date)
        .bind(&password_hash)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| UserError::DatabaseError(e.to_string()))?;

        Ok(user)
    }

    /// Login a user using email and password.
    pub async fn login_user(&self, login: UserLogin) -> Result<User, UserError> {
        // Fetch the user by email.
        let user = sqlx::query_as::<_, User>(
            "SELECT id, voter_id, name, email, zip_code, birth_date, created_at, password_hash FROM voters WHERE email = $1"
        )
        .bind(&login.email)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| UserError::DatabaseError(e.to_string()))?;

        // Check if the user exists.
        let user = user.ok_or_else(|| UserError::AuthenticationError("Invalid email or password".to_string()))?;

        // Verify the password.
        verify_password(&login.password, &user.password_hash)
            .map_err(|_| UserError::AuthenticationError("Invalid email or password".to_string()))?;

        Ok(user)
    }

    /// Get a user by voter ID.
    pub async fn get_user_by_voter_id(&self, voter_id: &str) -> Result<User, UserError> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, voter_id, name, email, zip_code, birth_date, created_at, password_hash FROM voters WHERE voter_id = $1"
        )
        .bind(voter_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| UserError::DatabaseError(e.to_string()))?;

        user.ok_or_else(|| UserError::DatabaseError("User not found".to_string()))
    }

    /// Update user information.
    pub async fn update_user(&self, voter_id: &str, name: Option<String>, zip_code: Option<String>) -> Result<User, UserError> {
        // Check if the user exists.
        let _user = self.get_user_by_voter_id(voter_id).await?;
    
        // Update the user in the database.
        let updated_user = sqlx::query_as::<_, User>(
            r#"
            UPDATE voters 
            SET name = COALESCE($2, name), 
                zip_code = COALESCE($3, zip_code)
            WHERE voter_id = $1
            RETURNING id, voter_id, name, email, zip_code, birth_date, created_at, password_hash
            "#
        )
        .bind(voter_id)
        .bind(name)
        .bind(zip_code)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| UserError::DatabaseError(e.to_string()))?;
    
        Ok(updated_user)
    }

    /// Change user password.
    pub async fn change_password(&self, voter_id: &str, old_password: &str, new_password: &str) -> Result<(), UserError> {
        // Fetch the user.
        let user = self.get_user_by_voter_id(voter_id).await?;
    
        // Verify the old password.
        verify_password(old_password, &user.password_hash)
            .map_err(|_| UserError::AuthenticationError("Invalid current password".to_string()))?;
    
        // Hash the new password.
        let new_password_hash = hash_password(new_password)
            .map_err(|e| UserError::ValidationError(format!("Password hashing error: {}", e)))?;
    
        // Update the password.
        sqlx::query("UPDATE voters SET password_hash = $1 WHERE voter_id = $2")
            .bind(&new_password_hash)
            .bind(voter_id)
            .execute(&self.pool)
            .await
            .map_err(|e| UserError::DatabaseError(e.to_string()))?;
    
        Ok(())
    }
}

/// Helper function to hash a password.
pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password.as_bytes(), &salt)?;
    Ok(password_hash.to_string())
}

/// Helper function to verify a password.
pub fn verify_password(password: &str, hash: &str) -> Result<(), argon2::password_hash::Error> {
    let parsed_hash = PasswordHash::new(hash)?;
    Argon2::default().verify_password(password.as_bytes(), &parsed_hash)
}

/// Alter the table to add password_hash column.
pub async fn migrate_password_column(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    sqlx::query(
        "ALTER TABLE voters ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT ''",
    )
    .execute(pool)
    .await?;
    
    Ok(())
}
