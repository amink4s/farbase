-- Migration: Add likes/flags count columns, approval metadata, and RPC functions
-- Date: 2025-11-13

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flags_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vetted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by_fid text;

-- Trigger functions to maintain counts
CREATE OR REPLACE FUNCTION trg_increment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE articles SET likes_count = likes_count + 1 WHERE id = NEW.article_id;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_decrement_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE articles SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.article_id;
  RETURN OLD;
END;$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_increment_flags_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE articles SET flags_count = flags_count + 1 WHERE id = NEW.article_id;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_decrement_flags_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE articles SET flags_count = GREATEST(flags_count - 1, 0) WHERE id = OLD.article_id;
  RETURN OLD;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS likes_insert_inc ON likes;
CREATE TRIGGER likes_insert_inc AFTER INSERT ON likes
FOR EACH ROW EXECUTE FUNCTION trg_increment_likes_count();

DROP TRIGGER IF EXISTS likes_delete_dec ON likes;
CREATE TRIGGER likes_delete_dec AFTER DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION trg_decrement_likes_count();

DROP TRIGGER IF EXISTS flags_insert_inc ON flags;
CREATE TRIGGER flags_insert_inc AFTER INSERT ON flags
FOR EACH ROW EXECUTE FUNCTION trg_increment_flags_count();

DROP TRIGGER IF EXISTS flags_delete_dec ON flags;
CREATE TRIGGER flags_delete_dec AFTER DELETE ON flags
FOR EACH ROW EXECUTE FUNCTION trg_decrement_flags_count();

-- Function: like_article
-- Ensures idempotent like, awards points, logs activity, returns new counts.
CREATE OR REPLACE FUNCTION like_article(p_slug text, p_liker_fid text, p_points_author integer DEFAULT 1)
RETURNS TABLE(success boolean, likes_count integer) AS $$
DECLARE
  v_article_id uuid;
  v_author_fid text;
  v_inserted boolean := false;
BEGIN
  SELECT id, author_fid INTO v_article_id, v_author_fid FROM articles WHERE slug = p_slug LIMIT 1;
  IF v_article_id IS NULL THEN
    RETURN QUERY SELECT false, NULL; RETURN; END IF;

  -- Try insert like
  BEGIN
    INSERT INTO likes(article_id, user_fid) VALUES (v_article_id, p_liker_fid);
    v_inserted := true;
  EXCEPTION WHEN unique_violation THEN
    v_inserted := false; -- duplicate like, treat as success but no point award
  END;

  IF v_inserted THEN
    PERFORM increment_user_points(v_author_fid, p_points_author);
    INSERT INTO point_logs(user_fid, points_awarded, reason, related_article_id, related_user_fid)
      VALUES (v_author_fid, p_points_author, 'like_received', v_article_id, p_liker_fid);
  END IF;

  SELECT likes_count INTO likes_count FROM articles WHERE id = v_article_id;
  RETURN QUERY SELECT true, likes_count;
END;$$ LANGUAGE plpgsql;

-- Function: approve_article
-- Marks vetted, awards points to author (1000) and approver (100).
CREATE OR REPLACE FUNCTION approve_article(p_slug text, p_admin_fid text, p_author_points integer DEFAULT 1000, p_admin_points integer DEFAULT 100)
RETURNS TABLE(success boolean, author_fid text, approved_at timestamptz) AS $$
DECLARE
  v_article_id uuid;
  v_author_fid text;
BEGIN
  SELECT id, author_fid INTO v_article_id, v_author_fid FROM articles WHERE slug = p_slug LIMIT 1;
  IF v_article_id IS NULL THEN
    RETURN QUERY SELECT false, NULL, NULL; RETURN; END IF;

  UPDATE articles SET vetted = true, approved_at = now(), approved_by_fid = p_admin_fid WHERE id = v_article_id;

  -- Award points
  PERFORM increment_user_points(v_author_fid, p_author_points);
  PERFORM increment_user_points(p_admin_fid, p_admin_points);

  INSERT INTO point_logs(user_fid, points_awarded, reason, related_article_id, related_user_fid)
    VALUES (v_author_fid, p_author_points, 'article_approved_author', v_article_id, p_admin_fid);
  INSERT INTO point_logs(user_fid, points_awarded, reason, related_article_id, related_user_fid)
    VALUES (p_admin_fid, p_admin_points, 'article_approved_admin', v_article_id, v_author_fid);

  RETURN QUERY SELECT true, v_author_fid, now();
END;$$ LANGUAGE plpgsql;

-- Function: flag_article
-- Idempotent flag, logs flag action (no points awarded by default).
CREATE OR REPLACE FUNCTION flag_article(p_slug text, p_flagger_fid text)
RETURNS TABLE(success boolean, flags_count integer) AS $$
DECLARE
  v_article_id uuid;
  v_author_fid text;
  v_inserted boolean := false;
BEGIN
  SELECT id, author_fid INTO v_article_id, v_author_fid FROM articles WHERE slug = p_slug LIMIT 1;
  IF v_article_id IS NULL THEN
    RETURN QUERY SELECT false, NULL; RETURN; END IF;

  BEGIN
    INSERT INTO flags(article_id, user_fid) VALUES (v_article_id, p_flagger_fid);
    v_inserted := true;
  EXCEPTION WHEN unique_violation THEN
    v_inserted := false; -- duplicate
  END;

  IF v_inserted THEN
    INSERT INTO point_logs(user_fid, points_awarded, reason, related_article_id, related_user_fid)
      VALUES (p_flagger_fid, 0, 'article_flagged', v_article_id, v_author_fid);
  END IF;

  SELECT flags_count INTO flags_count FROM articles WHERE id = v_article_id;
  RETURN QUERY SELECT true, flags_count;
END;$$ LANGUAGE plpgsql;
