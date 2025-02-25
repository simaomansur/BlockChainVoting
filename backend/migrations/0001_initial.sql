-- 0001_initial.sql
-- Initial migration for the blockchain voting system

-- Create a table for voters
CREATE TABLE IF NOT EXISTS voters (
    id SERIAL PRIMARY KEY,
    voter_id TEXT UNIQUE NOT NULL,  -- Unique identifier assigned to the voter
    name TEXT,
    zip_code TEXT,
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a table for polls
CREATE TABLE IF NOT EXISTS polls (
    id SERIAL PRIMARY KEY,
    poll_id TEXT UNIQUE NOT NULL,  -- Unique poll identifier (could be auto-generated or provided)
    title TEXT NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,        -- Options stored as JSON (allows structured data)
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a table for votes
CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    poll_id TEXT NOT NULL,         -- References poll.poll_id
    voter_id TEXT NOT NULL,        -- References voters.voter_id
    vote JSONB NOT NULL,           -- The vote, stored as JSON (for multi-contest ballots)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, voter_id)      -- Ensure one vote per poll per voter
);
