-- CRITICAL FIX: Standardize all FID columns to TEXT type
-- This migration fixes the type mismatch that's preventing points from being awarded
-- 
-- BACKUP YOUR DATABASE BEFORE RUNNING THIS!
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Drop the old function that expects BIGINT
DROP FUNCTION IF EXISTS increment_user_points(BIGINT, INT);

-- 2. Recreate the function with TEXT parameter
CREATE OR REPLACE FUNCTION increment_user_points(user_fid_to_update TEXT, points_to_add INT)
RETURNS void AS $$
BEGIN
  INSERT INTO user_points (fid, total_points, last_updated)
  VALUES (user_fid_to_update, points_to_add, NOW())
  ON CONFLICT (fid)
  DO UPDATE SET 
    total_points = user_points.total_points + points_to_add,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- 3. Alter likes table to use TEXT for user_fid
-- First, we need to drop constraints that depend on this column
ALTER TABLE likes DROP CONSTRAINT IF EXISTS unique_like;

-- Change the column type
ALTER TABLE likes ALTER COLUMN user_fid TYPE TEXT USING user_fid::TEXT;

-- Recreate the unique constraint
ALTER TABLE likes ADD CONSTRAINT unique_like UNIQUE (article_id, user_fid);

-- 4. Alter flags table to use TEXT for user_fid
ALTER TABLE flags DROP CONSTRAINT IF EXISTS unique_flag;
ALTER TABLE flags ALTER COLUMN user_fid TYPE TEXT USING user_fid::TEXT;
ALTER TABLE flags ADD CONSTRAINT unique_flag UNIQUE (article_id, user_fid);

-- 5. Alter point_logs table
ALTER TABLE point_logs ALTER COLUMN user_fid TYPE TEXT USING user_fid::TEXT;
ALTER TABLE point_logs ALTER COLUMN related_user_fid TYPE TEXT USING related_user_fid::TEXT;

-- 6. Alter contributions table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contributions') THEN
    ALTER TABLE contributions ALTER COLUMN fid TYPE TEXT USING fid::TEXT;
  END IF;
END $$;

-- 7. Create an index on user_fid columns for performance
CREATE INDEX IF NOT EXISTS idx_likes_user_fid ON likes(user_fid);
CREATE INDEX IF NOT EXISTS idx_flags_user_fid ON flags(user_fid);

COMMIT;

-- Verification queries
SELECT 'Data type check passed' as status 
WHERE (
  SELECT data_type FROM information_schema.columns 
  WHERE table_name = 'likes' AND column_name = 'user_fid'
) = 'text'
AND (
  SELECT data_type FROM information_schema.columns 
  WHERE table_name = 'user_points' AND column_name = 'fid'
) = 'text'
AND (
  SELECT data_type FROM information_schema.parameters 
  WHERE specific_name = (
    SELECT specific_name FROM information_schema.routines 
    WHERE routine_name = 'increment_user_points'
  )
  AND parameter_name = 'user_fid_to_update'
) = 'text';
