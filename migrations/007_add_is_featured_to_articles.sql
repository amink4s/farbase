-- Migration: Add is_featured column to articles table
-- Run in Supabase SQL editor

ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_articles_is_featured ON articles (is_featured) WHERE is_featured = true;
