-- Run this in Supabase SQL Editor to diagnose the current state
-- Copy the results and share them back

-- 1. Check table structures
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('articles', 'likes', 'flags', 'user_points', 'point_logs', 'contributions')
ORDER BY table_name, ordinal_position;

-- 2. Check if increment_user_points function exists and its signature
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'increment_user_points';

-- 3. Check function parameters
SELECT 
  r.routine_name,
  p.parameter_name,
  p.data_type,
  p.parameter_mode
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p 
  ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public' 
  AND r.routine_name = 'increment_user_points'
ORDER BY p.ordinal_position;

-- 4. Check sample data
SELECT 'articles' as table_name, COUNT(*) as row_count FROM articles
UNION ALL
SELECT 'likes', COUNT(*) FROM likes
UNION ALL
SELECT 'flags', COUNT(*) FROM flags
UNION ALL
SELECT 'user_points', COUNT(*) FROM user_points
UNION ALL
SELECT 'point_logs', COUNT(*) FROM point_logs
UNION ALL
SELECT 'contributions', COUNT(*) FROM contributions;

-- 5. Check recent point_logs entries
SELECT * FROM point_logs ORDER BY created_at DESC LIMIT 10;

-- 6. Check user_points entries
SELECT * FROM user_points ORDER BY last_updated DESC LIMIT 10;

-- 7. Check recent likes
SELECT l.*, a.author_fid, a.slug 
FROM likes l 
JOIN articles a ON l.article_id = a.id 
ORDER BY l.created_at DESC 
LIMIT 10;
