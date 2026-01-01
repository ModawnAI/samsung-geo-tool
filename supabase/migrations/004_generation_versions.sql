-- Migration: 004_generation_versions.sql
-- Phase 2.4: Generation Version History
-- Apply via: Supabase Dashboard > SQL Editor

-- Generation versions table for storing multiple versions per product
CREATE TABLE IF NOT EXISTS generation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES generations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  version_number INTEGER NOT NULL DEFAULT 1,
  version_label VARCHAR(100), -- e.g., "Initial", "Refined v2", "Final"

  -- Core content snapshot
  description TEXT,
  timestamps TEXT,
  hashtags TEXT[],
  faq JSONB,
  usps JSONB,
  case_studies JSONB,
  keywords JSONB,
  chapters JSONB,

  -- Metadata
  srt_content_hash VARCHAR(64), -- SHA256 hash for tracking SRT changes
  selected_keywords TEXT[],
  campaign_tag VARCHAR(100),

  -- Scoring snapshot
  geo_score_v2 JSONB,
  quality_scores JSONB,
  final_score DECIMAL(5,2),

  -- Generation config snapshot
  prompt_version_id UUID REFERENCES prompt_versions(id),
  weights_version_id UUID REFERENCES scoring_weights(id),
  generation_config JSONB, -- Store any config used during generation

  -- Version metadata
  change_summary TEXT, -- Brief description of what changed
  is_current BOOLEAN DEFAULT false, -- Flag for current active version
  is_starred BOOLEAN DEFAULT false, -- User can star important versions

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique version numbers per generation
  CONSTRAINT unique_version_per_generation UNIQUE (generation_id, version_number)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_version_generation ON generation_versions(generation_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_version_product ON generation_versions(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_version_user ON generation_versions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_version_current ON generation_versions(generation_id) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_version_starred ON generation_versions(user_id) WHERE is_starred = true;

-- Enable RLS
ALTER TABLE generation_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their generation versions"
  ON generation_versions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their generation versions"
  ON generation_versions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their generation versions"
  ON generation_versions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their generation versions"
  ON generation_versions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to get the next version number for a generation
CREATE OR REPLACE FUNCTION get_next_version_number(p_generation_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM generation_versions
  WHERE generation_id = p_generation_id;

  RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Function to set current version (unsets other current flags)
CREATE OR REPLACE FUNCTION set_current_version(p_version_id UUID)
RETURNS VOID AS $$
DECLARE
  v_generation_id UUID;
BEGIN
  -- Get the generation_id for this version
  SELECT generation_id INTO v_generation_id
  FROM generation_versions
  WHERE id = p_version_id;

  -- Unset all current flags for this generation
  UPDATE generation_versions
  SET is_current = false
  WHERE generation_id = v_generation_id;

  -- Set the specified version as current
  UPDATE generation_versions
  SET is_current = true
  WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create version on generation update (optional)
-- Uncomment if you want automatic versioning on every update
/*
CREATE OR REPLACE FUNCTION auto_version_generation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if content actually changed
  IF OLD.description IS DISTINCT FROM NEW.description
     OR OLD.timestamps IS DISTINCT FROM NEW.timestamps
     OR OLD.hashtags IS DISTINCT FROM NEW.hashtags
     OR OLD.faq IS DISTINCT FROM NEW.faq
  THEN
    INSERT INTO generation_versions (
      generation_id, user_id, product_id, version_number,
      description, timestamps, hashtags, faq,
      selected_keywords, campaign_tag, geo_score_v2, change_summary
    ) VALUES (
      NEW.id, NEW.user_id, NEW.product_id,
      get_next_version_number(NEW.id),
      OLD.description, OLD.timestamps, OLD.hashtags, OLD.faq,
      OLD.selected_keywords, OLD.campaign_tag, OLD.geo_score_v2,
      'Auto-saved before update'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_version_generation
  BEFORE UPDATE ON generations
  FOR EACH ROW
  EXECUTE FUNCTION auto_version_generation();
*/

-- Add comment
COMMENT ON TABLE generation_versions IS 'Stores version history for content generations, enabling rollback and comparison';
