-- Cache table for Neynar user profiles to reduce API latency
-- Fields: fid (TEXT), username, display_name, pfp_url, score (numeric), fetched_at

CREATE TABLE IF NOT EXISTS neynar_profiles (
  fid text PRIMARY KEY,
  username text,
  display_name text,
  pfp_url text,
  score numeric,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_neynar_profiles_score ON neynar_profiles(score);
CREATE INDEX IF NOT EXISTS idx_neynar_profiles_fetched_at ON neynar_profiles(fetched_at);
