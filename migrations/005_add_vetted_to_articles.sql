-- Migration: Add vetted flag to articles
ALTER TABLE IF EXISTS articles
ADD COLUMN IF NOT EXISTS vetted boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_articles_vetted ON articles (vetted);
