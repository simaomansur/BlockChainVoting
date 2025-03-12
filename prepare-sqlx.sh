#!/bin/bash

# Set database URL for local development
export DATABASE_URL=${DATABASE_URL:-postgres://localhost/blockchain_voting}

# Inform user
echo "Preparing SQLx metadata for offline mode..."
echo "Using database: $DATABASE_URL"

# Ensure the .sqlx directory exists
mkdir -p backend/.sqlx

# Run the prepare command
cd backend
cargo sqlx prepare -- --merged

# After prepare completes
echo "SQLx preparation complete!"
echo "You can now compile with SQLX_OFFLINE=true"