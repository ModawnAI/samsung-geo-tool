-- Migration: 012_stage_prompt_versions.sql
-- History-based version management for stage prompts
-- Apply via: Supabase Dashboard > SQL Editor

-- ============================================================================
-- Stage Prompt Versions Table
-- Stores version history for each stage prompt
-- ============================================================================
CREATE TABLE IF NOT EXISTS stage_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stage reference (not FK to allow independent versioning)
  stage VARCHAR(30) NOT NULL CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),

  -- Version number (auto-incremented per stage)
  version INTEGER NOT NULL,

  -- Prompt content
  stage_system_prompt TEXT,

  -- LLM Parameters
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  top_p DECIMAL(3,2) DEFAULT 0.9,
  model VARCHAR(100) DEFAULT 'gemini-3-flash-preview',

  -- Version metadata
  change_summary TEXT,
  is_active BOOLEAN DEFAULT false,

  -- Performance snapshot at time of version creation
  avg_quality_score DECIMAL(5,2),
  test_count INTEGER DEFAULT 0,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique version per stage
  UNIQUE(stage, version)
);

-- ============================================================================
-- Update stage_prompts to track current version
-- ============================================================================
ALTER TABLE stage_prompts
  ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_versions INTEGER DEFAULT 1;

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_prompt_versions_stage ON stage_prompt_versions(stage);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_stage_version ON stage_prompt_versions(stage, version DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_active ON stage_prompt_versions(stage, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_prompt_versions_created ON stage_prompt_versions(created_at DESC);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE stage_prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all prompt versions"
  ON stage_prompt_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert prompt versions"
  ON stage_prompt_versions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own prompt versions"
  ON stage_prompt_versions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- ============================================================================
-- Function to get next version number for a stage
-- ============================================================================
CREATE OR REPLACE FUNCTION get_next_stage_version(p_stage VARCHAR(30))
RETURNS INTEGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1
  INTO next_version
  FROM stage_prompt_versions
  WHERE stage = p_stage;

  RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function to activate a specific version
-- ============================================================================
CREATE OR REPLACE FUNCTION activate_stage_version(p_stage VARCHAR(30), p_version INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  -- Deactivate all versions for this stage
  UPDATE stage_prompt_versions
  SET is_active = false
  WHERE stage = p_stage AND is_active = true;

  -- Activate the specified version
  UPDATE stage_prompt_versions
  SET is_active = true
  WHERE stage = p_stage AND version = p_version;

  -- Update stage_prompts with the active version content
  UPDATE stage_prompts sp
  SET
    stage_system_prompt = spv.stage_system_prompt,
    temperature = spv.temperature,
    max_tokens = spv.max_tokens,
    top_p = spv.top_p,
    model = spv.model,
    current_version = p_version,
    workflow_status = 'active',
    updated_at = NOW()
  FROM stage_prompt_versions spv
  WHERE sp.stage = p_stage
    AND spv.stage = p_stage
    AND spv.version = p_version;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE stage_prompt_versions IS 'Version history for stage prompts - stores all historical versions';
COMMENT ON COLUMN stage_prompt_versions.version IS 'Sequential version number within each stage';
COMMENT ON COLUMN stage_prompt_versions.is_active IS 'Whether this version is currently active in production';
COMMENT ON COLUMN stage_prompt_versions.change_summary IS 'Optional description of changes in this version';
COMMENT ON COLUMN stage_prompts.current_version IS 'Current active version number';
COMMENT ON COLUMN stage_prompts.total_versions IS 'Total number of versions created for this stage';
