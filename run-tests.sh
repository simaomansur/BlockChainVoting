#!/bin/bash

# Make sure Docker containers are running
echo "Ensuring Docker containers are running..."
docker-compose up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Clean up database
echo "Cleaning database..."
docker-compose exec db psql -U username -d my_database -c "
DROP TABLE IF EXISTS blocks CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS polls CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS voters CASCADE;
"

# Run the tests with the --test-threads=1 flag to force sequential test execution
echo "Running tests sequentially..."
RUST_BACKTRACE=1 TEST_DATABASE_URL="postgres://username:password@localhost:5432/my_database" cargo test -- --test-threads=1