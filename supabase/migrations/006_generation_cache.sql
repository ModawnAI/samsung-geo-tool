-- Migration: 006_generation_cache.sql
-- Persistent Generation Cache (L2 Supabase layer)
-- Apply via: Supabase Dashboard > SQL Editor

-- Generation cache table for persistent storage
CREATE TABLE IF NOT EXISTS generation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  keywords JSONB NOT NULL DEFAULT '[]',
  result JSONB NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_generation_cache_key ON generation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_generation_cache_expires ON generation_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_generation_cache_product ON generation_cache(product_name);
CREATE INDEX IF NOT EXISTS idx_generation_cache_accessed ON generation_cache(last_accessed_at);

-- Enable RLS
ALTER TABLE generation_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies - allow all authenticated users to read/write cache
CREATE POLICY "Users can view all cached generations"
  ON generation_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert cached generations"
  ON generation_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update cached generations"
  ON generation_cache FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete cached generations"
  ON generation_cache FOR DELETE
  TO authenticated
  USING (true);

-- Function to increment hit count and update last_accessed_at
CREATE OR REPLACE FUNCTION increment_generation_cache_hit(p_cache_key VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE generation_cache
  SET
    hit_count = hit_count + 1,
    last_accessed_at = NOW()
  WHERE cache_key = p_cache_key;
END;
$$ LANGUAGE plpgsql;

-- Function to prune expired cache entries
CREATE OR REPLACE FUNCTION prune_expired_generation_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM generation_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION get_generation_cache_stats()
RETURNS TABLE(
  total_entries BIGINT,
  total_hits BIGINT,
  expired_entries BIGINT,
  avg_hit_count NUMERIC,
  oldest_entry TIMESTAMPTZ,
  newest_entry TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_entries,
    COALESCE(SUM(hit_count), 0)::BIGINT as total_hits,
    COUNT(*) FILTER (WHERE expires_at < NOW())::BIGINT as expired_entries,
    COALESCE(AVG(hit_count), 0)::NUMERIC as avg_hit_count,
    MIN(created_at) as oldest_entry,
    MAX(created_at) as newest_entry
  FROM generation_cache;
END;
$$ LANGUAGE plpgsql;
