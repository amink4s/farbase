-- Migration: Add likes, flags, points, and Neynar cache tables
-- Date: 2025-11-13

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

-- Neynar profiles cache (optional but recommended for performance)
CREATE TABLE IF NOT EXISTS neynar_profiles (
  fid text PRIMARY KEY,
  username text,
  display_name text,
  pfp_url text,
  score numeric,
  fetched_at timestamptz
);
