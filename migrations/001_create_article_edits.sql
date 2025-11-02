-- Migration: Create article_edits table
-- Run in Supabase SQL editor or psql as appropriate.

CREATE TABLE IF NOT EXISTS article_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  author_fid text NOT NULL,
  body text NOT NULL,
  summary text,
  approved boolean DEFAULT false,
  reviewer_fid text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_edits_article_id ON article_edits (article_id);
CREATE INDEX IF NOT EXISTS idx_article_edits_author_fid ON article_edits (author_fid);
