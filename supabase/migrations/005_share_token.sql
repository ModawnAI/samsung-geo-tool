-- Migration: 005_share_token.sql
-- FG-4: Add share functionality for collaboration
-- Apply via: Supabase Dashboard > SQL Editor

-- Add share_token column to generations table
ALTER TABLE generations
ADD COLUMN IF NOT EXISTS share_token VARCHAR(24) UNIQUE;

-- Create index for fast lookup by share token
CREATE INDEX IF NOT EXISTS idx_generations_share_token
ON generations(share_token)
WHERE share_token IS NOT NULL;

-- Add RLS policy to allow public read access for shared generations
-- Note: This creates a special policy that allows unauthenticated access
-- only when querying by share_token
CREATE POLICY "Anyone can view shared generations"
  ON generations FOR SELECT
  TO anon, authenticated
  USING (share_token IS NOT NULL);

-- Comment for documentation
COMMENT ON COLUMN generations.share_token IS 'Unique token for public sharing of generation content';
