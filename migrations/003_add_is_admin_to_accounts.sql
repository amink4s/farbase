-- Migration: Add is_admin column to accounts
-- Run in Supabase SQL editor or psql as appropriate.

ALTER TABLE IF EXISTS accounts
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_accounts_is_admin ON accounts (is_admin);
