-- 0001_initial.sql
-- Initial migration for the blockchain voting system

-- Create the voters table with all required columns.
CREATE TABLE IF NOT EXISTS voters (
    id SERIAL PRIMARY KEY,
    voter_id TEXT UNIQUE NOT NULL,  -- Unique identifier assigned to the voter
    name TEXT,
    email TEXT UNIQUE,  -- Unique email for each voter
    zip_code TEXT,
    birth_date DATE,
    password_hash TEXT NOT NULL DEFAULT '',  -- Added here instead of a separate migration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the polls table with a poll_type column.
CREATE TABLE IF NOT EXISTS polls (
    poll_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    poll_type TEXT NOT NULL DEFAULT 'normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the votes table.
CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    poll_id TEXT NOT NULL,            -- References polls.poll_id
    voter_id TEXT NOT NULL,           -- References voters.voter_id
    vote JSONB NOT NULL,              -- Vote details stored as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, voter_id)         -- Ensure one vote per poll per voter
);

-- Create the blocks table.
CREATE TABLE IF NOT EXISTS blocks (
    id SERIAL PRIMARY KEY,
    poll_id TEXT NOT NULL,            -- References polls.poll_id
    block_index INT NOT NULL,
    timestamp BIGINT NOT NULL,
    previous_hash TEXT NOT NULL,
    hash TEXT NOT NULL,
    transactions JSONB NOT NULL,      -- Transactions stored as JSON (for normal polls, a JSON array; for election polls, a JSON object)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls(poll_id)
);
