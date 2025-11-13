-- Migration: Add like/flag count columns and increment functions
-- Date: 2025-11-13

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flag_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vetted boolean NOT NULL DEFAULT false;

-- Functions to increment counts atomically
CREATE OR REPLACE FUNCTION increment_article_like_count(p_article_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE articles SET like_count = like_count + 1 WHERE id = p_article_id;
END;$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_article_flag_count(p_article_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE articles SET flag_count = flag_count + 1 WHERE id = p_article_id;
END;$$ LANGUAGE plpgsql;

-- Optionally backfill (here we reset to 0 per request to accept loss of historic counts)
-- Uncomment below if you later want to recalc from existing likes/flags tables.
-- UPDATE articles a SET like_count = COALESCE(l.c,0) FROM (
--   SELECT article_id, COUNT(*) c FROM likes GROUP BY article_id
-- ) l WHERE l.article_id = a.id;
-- UPDATE articles a SET flag_count = COALESCE(f.c,0) FROM (
--   SELECT article_id, COUNT(*) c FROM flags GROUP BY article_id
-- ) f WHERE f.article_id = a.id;

-- Approval points logic (authors 1000, approver 100) as stored procedure
CREATE OR REPLACE FUNCTION approve_article_and_award(article_slug text, approver_fid text)
RETURNS TABLE(updated_id uuid) AS $$
DECLARE
  v_article_id uuid;
  v_author_fid text;
BEGIN
  SELECT id, author_fid INTO v_article_id, v_author_fid FROM articles WHERE slug = article_slug LIMIT 1;
  IF v_article_id IS NULL THEN
    RAISE EXCEPTION 'Article not found';
  END IF;

  UPDATE articles SET vetted = true WHERE id = v_article_id;

  -- Author +1000 points
  PERFORM increment_user_points(v_author_fid, 1000);
  INSERT INTO point_logs(user_fid, points_awarded, reason, related_article_id, related_user_fid)
    VALUES (v_author_fid, 1000, 'article_approved', v_article_id, approver_fid);

  -- Approver +100 points
  PERFORM increment_user_points(approver_fid, 100);
  INSERT INTO point_logs(user_fid, points_awarded, reason, related_article_id, related_user_fid)
    VALUES (approver_fid, 100, 'approved_article', v_article_id, v_author_fid);

  RETURN QUERY SELECT v_article_id;
END;$$ LANGUAGE plpgsql;
