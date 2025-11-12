-- Supabase-ready Postgres schema for farpedia (Farpedia) mini app
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
  is_admin boolean DEFAULT false,
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

-- Webhook events table: stores raw payloads received from Farcaster / host.
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  headers jsonb DEFAULT '{}'::jsonb,
  verified boolean DEFAULT false,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events (event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events (received_at);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_fid text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, user_fid)
);
CREATE INDEX IF NOT EXISTS idx_likes_article_id ON likes (article_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_fid ON likes (user_fid);

-- Flags table
CREATE TABLE IF NOT EXISTS flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_fid text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, user_fid)
);
CREATE INDEX IF NOT EXISTS idx_flags_article_id ON flags (article_id);
CREATE INDEX IF NOT EXISTS idx_flags_user_fid ON flags (user_fid);

-- User points aggregation
CREATE TABLE IF NOT EXISTS user_points (
  user_fid text PRIMARY KEY,
  total_points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Point logs
CREATE TABLE IF NOT EXISTS point_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_fid text NOT NULL,
  points_awarded integer NOT NULL,
  reason text,
  related_article_id uuid,
  related_user_fid text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_point_logs_user_fid ON point_logs (user_fid);
CREATE INDEX IF NOT EXISTS idx_point_logs_article_id ON point_logs (related_article_id);

-- Increment points function
CREATE OR REPLACE FUNCTION increment_user_points(user_fid_to_update text, points_to_add integer)
RETURNS void AS $$
BEGIN
  INSERT INTO user_points (user_fid, total_points)
  VALUES (user_fid_to_update, GREATEST(points_to_add, 0))
  ON CONFLICT (user_fid)
  DO UPDATE SET total_points = user_points.total_points + GREATEST(points_to_add, 0), updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Neynar profiles cache (optional)
CREATE TABLE IF NOT EXISTS neynar_profiles (
  fid text PRIMARY KEY,
  username text,
  display_name text,
  pfp_url text,
  score numeric,
  fetched_at timestamptz
);