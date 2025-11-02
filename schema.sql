-- Supabase-ready Postgres schema for Farbase (Farpedia) mini app
-- Run in Supabase SQL editor or psql. Do NOT store secrets here.

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL,
  author_fid text NOT NULL, -- Farcaster FID as string
  metadata jsonb DEFAULT '{}'::jsonb,
  published boolean DEFAULT false,
  neynar_score numeric, -- server-side moderation score (nullable)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_author_fid ON articles (author_fid);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (published);

-- Simple accounts table for optional server-side lookups
CREATE TABLE IF NOT EXISTS accounts (
  fid text PRIMARY KEY, -- Farcaster FID
  address text, -- optional wallet address
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to update updated_at on row modification
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON articles;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

-- TODO: Add RLS policies for Supabase auth if using client-side queries.
-- NOTE: This file is intentionally server-ready; use SUPABASE_SERVICE_ROLE_KEY for server-side inserts/updates.