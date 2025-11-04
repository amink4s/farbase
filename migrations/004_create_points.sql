-- Migration: Create contributions ledger and user_points aggregate
-- Run in Supabase SQL editor or psql as appropriate.

CREATE TABLE IF NOT EXISTS contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid text NOT NULL,
  source_type text NOT NULL, -- e.g. 'article', 'edit'
  source_id uuid, -- reference to article or edit id
  points integer NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contributions_fid ON contributions (fid);

-- Aggregate table for quick lookups when building airdrop allocations
CREATE TABLE IF NOT EXISTS user_points (
  fid text PRIMARY KEY,
  total_points bigint NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_points_total ON user_points (total_points DESC);
