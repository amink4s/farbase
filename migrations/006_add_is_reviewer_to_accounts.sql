-- Migration: Add is_reviewer flag to accounts
ALTER TABLE IF EXISTS accounts
ADD COLUMN IF NOT EXISTS is_reviewer boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_accounts_is_reviewer ON accounts (is_reviewer);
