-- 0002_add_password_hash.sql
-- Add password_hash column to voters table

ALTER TABLE voters ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';