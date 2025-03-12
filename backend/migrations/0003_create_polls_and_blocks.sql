-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
    poll_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    poll_type TEXT NOT NULL,  -- "normal" or "election"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
    id SERIAL PRIMARY KEY,
    poll_id TEXT NOT NULL,
    block_index INT NOT NULL,
    timestamp BIGINT NOT NULL,
    previous_hash TEXT NOT NULL,
    hash TEXT NOT NULL,
    transactions JSONB NOT NULL,
    merkle_root TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls(poll_id)
);
