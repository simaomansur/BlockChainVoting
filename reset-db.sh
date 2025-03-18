#!/bin/bash
# reset_db.sh
# This script drops and recreates the "my_database" database.

# Set variables
DB_NAME="my_database"
DB_USER="username"
DB_HOST="localhost"
DB_PORT="5432"

# Set PGPASSWORD if needed (or configure .pgpass)
export PGPASSWORD="your_password_here"

# Connect to the default "postgres" database to run administrative commands.
echo "Connecting to PostgreSQL on ${DB_HOST}:${DB_PORT} as ${DB_USER}..."

echo "Dropping database ${DB_NAME} (if it exists)..."
psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"

echo "Creating database ${DB_NAME}..."
psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d postgres -c "CREATE DATABASE ${DB_NAME} WITH OWNER ${DB_USER};"

echo "Database ${DB_NAME} has been reset."

# (Optional) Run migrations if you want to automatically apply them:
# cargo sqlx migrate run
