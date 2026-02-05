-- ============================================================================
-- CONSOLIDATED MIGRATION: Prompt Studio Tables
-- ============================================================================
-- This file combines migrations 008, 009, 010, 011, 012 for easier application.
-- Apply via: Supabase Dashboard > SQL Editor
--
-- Tables created:
--   1. stage_prompts - Stage-specific prompt configurations
--   2. prompt_test_runs - Test execution records
--   3. stage_test_inputs - Reusable test inputs
--   4. prompt_refine_sessions - AI chat sessions for prompt refinement
--   5. prompt_studio_executions - Stage test execution logs
--   6. prompt_studio_feedback - LLM-as-Judge evaluations
--   7. prompt_studio_evolution_config - Evolution settings per stage
--   8. prompt_studio_evolution_cycles - Evolution iteration tracking
--   9. prompt_studio_evolution_candidates - Candidate prompts
--   10. stage_prompt_versions - Version history
-- ============================================================================

-- ============================================================================
-- PART 1: Core Stage Prompts (from 008_prompt_studio.sql)
-- ============================================================================

-- Stage Prompts Table
CREATE TABLE IF NOT EXISTS stage_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version_id UUID REFERENCES prompt_versions(id) ON DELETE CASCADE,
  stage VARCHAR(30) NOT NULL CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),
  stage_system_prompt TEXT,
  temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 4096 CHECK (max_tokens > 0 AND max_tokens <= 32000),
  top_p DECIMAL(3,2) DEFAULT 0.9 CHECK (top_p >= 0 AND top_p <= 1),
  model VARCHAR(100) DEFAULT 'gemini-3-flash-preview',
  workflow_status VARCHAR(20) DEFAULT 'draft' CHECK (workflow_status IN (
    'draft', 'testing', 'pending_approval', 'active', 'archived'
  )),
  avg_quality_score DECIMAL(5,2),
  test_count INTEGER DEFAULT 0,
  last_tested_at TIMESTAMPTZ,
  current_version INTEGER DEFAULT 1,
  total_versions INTEGER DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prompt_version_id, stage)
);

-- Prompt Test Runs Table
CREATE TABLE IF NOT EXISTS prompt_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_prompt_id UUID REFERENCES stage_prompts(id) ON DELETE CASCADE,
  test_input JSONB NOT NULL,
  product_name VARCHAR(255),
  language VARCHAR(2) DEFAULT 'en' CHECK (language IN ('en', 'ko')),
  output_content TEXT,
  output_parsed JSONB,
  latency_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  quality_score DECIMAL(5,2),
  score_breakdown JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed'
  )),
  error_message TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage Test Inputs Table
CREATE TABLE IF NOT EXISTS stage_test_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  stage VARCHAR(30) NOT NULL CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),
  input_data JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: Prompt Refine Sessions (from 009_prompt_refine_sessions.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS prompt_refine_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage VARCHAR(30) NOT NULL CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),
  title VARCHAR(255),
  messages JSONB NOT NULL DEFAULT '[]',
  current_prompt TEXT,
  improved_prompt TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 3: Evolution System (from 010_prompt_studio_evolution.sql)
-- ============================================================================

-- Stage Execution Logs
CREATE TABLE IF NOT EXISTS prompt_studio_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage VARCHAR(30) NOT NULL CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),
  session_id UUID REFERENCES prompt_refine_sessions(id) ON DELETE SET NULL,
  input JSONB NOT NULL,
  output JSONB,
  raw_response TEXT,
  latency_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN (
    'running', 'completed', 'failed'
  )),
  error_message TEXT,
  prompt_version INTEGER DEFAULT 1,
  stage_prompt_id UUID REFERENCES stage_prompts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Evaluation Feedback
CREATE TABLE IF NOT EXISTS prompt_studio_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES prompt_studio_executions(id) ON DELETE CASCADE,
  stage VARCHAR(30) NOT NULL CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),
  feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN (
    'user', 'llm_judge', 'automated'
  )),
  overall_score NUMERIC(2,1) CHECK (overall_score >= 1 AND overall_score <= 5),
  relevance_score NUMERIC(2,1) CHECK (relevance_score >= 1 AND relevance_score <= 5),
  quality_score NUMERIC(2,1) CHECK (quality_score >= 1 AND quality_score <= 5),
  creativity_score NUMERIC(2,1) CHECK (creativity_score >= 1 AND creativity_score <= 5),
  feedback_text TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  suggestions TEXT[],
  judge_model VARCHAR(100),
  raw_evaluation JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evolution Configuration
CREATE TABLE IF NOT EXISTS prompt_studio_evolution_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage VARCHAR(30) NOT NULL UNIQUE CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),
  enabled BOOLEAN DEFAULT true,
  min_feedback_count INTEGER DEFAULT 10,
  min_improvement_threshold NUMERIC(3,2) DEFAULT 0.10,
  auto_promote_threshold NUMERIC(3,2) DEFAULT 0.20,
  require_human_approval BOOLEAN DEFAULT true,
  max_candidates_per_cycle INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evolution Cycles
CREATE TABLE IF NOT EXISTS prompt_studio_evolution_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage VARCHAR(30) NOT NULL CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'analyzing', 'generating', 'testing', 'completed', 'failed'
  )),
  feedback_summary JSONB,
  error_message TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Evolution Candidates
CREATE TABLE IF NOT EXISTS prompt_studio_evolution_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES prompt_studio_evolution_cycles(id) ON DELETE CASCADE,
  stage VARCHAR(30) NOT NULL CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),
  candidate_version INTEGER NOT NULL,
  system_prompt TEXT NOT NULL,
  generation_rationale TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'testing', 'completed', 'approved', 'rejected'
  )),
  test_results JSONB,
  baseline_score NUMERIC(3,2),
  candidate_score NUMERIC(3,2),
  improvement_delta NUMERIC(3,2),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 4: Stage Prompt Versions (from 012_stage_prompt_versions.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stage_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage VARCHAR(30) NOT NULL CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),
  version INTEGER NOT NULL,
  stage_system_prompt TEXT,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  top_p DECIMAL(3,2) DEFAULT 0.9,
  model VARCHAR(100) DEFAULT 'gemini-3-flash-preview',
  change_summary TEXT,
  is_active BOOLEAN DEFAULT false,
  avg_quality_score DECIMAL(5,2),
  test_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stage, version)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Stage prompts
CREATE INDEX IF NOT EXISTS idx_stage_prompts_stage ON stage_prompts(stage, workflow_status);
CREATE INDEX IF NOT EXISTS idx_stage_prompts_version ON stage_prompts(prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_stage_prompts_status ON stage_prompts(workflow_status);

-- Test runs
CREATE INDEX IF NOT EXISTS idx_test_runs_prompt ON prompt_test_runs(stage_prompt_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON prompt_test_runs(status);

-- Test inputs
CREATE INDEX IF NOT EXISTS idx_test_inputs_stage ON stage_test_inputs(stage);
CREATE INDEX IF NOT EXISTS idx_test_inputs_default ON stage_test_inputs(stage, is_default) WHERE is_default = true;

-- Refine sessions
CREATE INDEX IF NOT EXISTS idx_refine_sessions_stage ON prompt_refine_sessions(stage);
CREATE INDEX IF NOT EXISTS idx_refine_sessions_user ON prompt_refine_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_refine_sessions_favorite ON prompt_refine_sessions(created_by, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_refine_sessions_updated ON prompt_refine_sessions(updated_at DESC);

-- Executions
CREATE INDEX IF NOT EXISTS idx_executions_stage ON prompt_studio_executions(stage);
CREATE INDEX IF NOT EXISTS idx_executions_stage_prompt ON prompt_studio_executions(stage_prompt_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON prompt_studio_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_created ON prompt_studio_executions(created_at DESC);

-- Feedback
CREATE INDEX IF NOT EXISTS idx_feedback_execution ON prompt_studio_feedback(execution_id);
CREATE INDEX IF NOT EXISTS idx_feedback_stage ON prompt_studio_feedback(stage);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON prompt_studio_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON prompt_studio_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_stage_scores ON prompt_studio_feedback(stage, overall_score);

-- Evolution cycles
CREATE INDEX IF NOT EXISTS idx_cycles_stage ON prompt_studio_evolution_cycles(stage);
CREATE INDEX IF NOT EXISTS idx_cycles_status ON prompt_studio_evolution_cycles(status);

-- Evolution candidates
CREATE INDEX IF NOT EXISTS idx_candidates_cycle ON prompt_studio_evolution_candidates(cycle_id);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON prompt_studio_evolution_candidates(stage);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON prompt_studio_evolution_candidates(status);

-- Prompt versions
CREATE INDEX IF NOT EXISTS idx_prompt_versions_stage ON stage_prompt_versions(stage);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_stage_version ON stage_prompt_versions(stage, version DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_active ON stage_prompt_versions(stage, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_prompt_versions_created ON stage_prompt_versions(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE stage_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_test_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_refine_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_studio_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_studio_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_studio_evolution_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_studio_evolution_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_studio_evolution_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_prompt_versions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Stage prompts policies
DO $$ BEGIN
  CREATE POLICY "Users can view all stage prompts" ON stage_prompts FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own stage prompts" ON stage_prompts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own stage prompts" ON stage_prompts FOR UPDATE TO authenticated USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own stage prompts" ON stage_prompts FOR DELETE TO authenticated USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Test runs policies
DO $$ BEGIN
  CREATE POLICY "Users can view all test runs" ON prompt_test_runs FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own test runs" ON prompt_test_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own test runs" ON prompt_test_runs FOR UPDATE TO authenticated USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Test inputs policies
DO $$ BEGIN
  CREATE POLICY "Users can view shared or own test inputs" ON stage_test_inputs FOR SELECT TO authenticated USING (is_shared = true OR auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own test inputs" ON stage_test_inputs FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own test inputs" ON stage_test_inputs FOR UPDATE TO authenticated USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own test inputs" ON stage_test_inputs FOR DELETE TO authenticated USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Refine sessions policies
DO $$ BEGIN
  CREATE POLICY "Users can view own refine sessions" ON prompt_refine_sessions FOR SELECT TO authenticated USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own refine sessions" ON prompt_refine_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own refine sessions" ON prompt_refine_sessions FOR UPDATE TO authenticated USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own refine sessions" ON prompt_refine_sessions FOR DELETE TO authenticated USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Executions policies
DO $$ BEGIN
  CREATE POLICY "Users can view own executions" ON prompt_studio_executions FOR SELECT TO authenticated USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own executions" ON prompt_studio_executions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own executions" ON prompt_studio_executions FOR UPDATE TO authenticated USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Feedback policies
DO $$ BEGIN
  CREATE POLICY "Users can view feedback for own executions" ON prompt_studio_feedback FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM prompt_studio_executions e WHERE e.id = prompt_studio_feedback.execution_id AND e.created_by = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert feedback for own executions" ON prompt_studio_feedback FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM prompt_studio_executions e WHERE e.id = prompt_studio_feedback.execution_id AND e.created_by = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Evolution config policies
DO $$ BEGIN
  CREATE POLICY "Users can view evolution config" ON prompt_studio_evolution_config FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Evolution cycles policies
DO $$ BEGIN
  CREATE POLICY "Users can view evolution cycles" ON prompt_studio_evolution_cycles FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert evolution cycles" ON prompt_studio_evolution_cycles FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own evolution cycles" ON prompt_studio_evolution_cycles FOR UPDATE TO authenticated USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Evolution candidates policies
DO $$ BEGIN
  CREATE POLICY "Users can view evolution candidates" ON prompt_studio_evolution_candidates FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can review candidates" ON prompt_studio_evolution_candidates FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Stage prompt versions policies
DO $$ BEGIN
  CREATE POLICY "Users can view all prompt versions" ON stage_prompt_versions FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert prompt versions" ON stage_prompt_versions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own prompt versions" ON stage_prompt_versions FOR UPDATE TO authenticated USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_stage_prompts_updated_at ON stage_prompts;
CREATE TRIGGER update_stage_prompts_updated_at
  BEFORE UPDATE ON stage_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stage_test_inputs_updated_at ON stage_test_inputs;
CREATE TRIGGER update_stage_test_inputs_updated_at
  BEFORE UPDATE ON stage_test_inputs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prompt_refine_sessions_updated_at ON prompt_refine_sessions;
CREATE TRIGGER update_prompt_refine_sessions_updated_at
  BEFORE UPDATE ON prompt_refine_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_evolution_config_updated_at ON prompt_studio_evolution_config;
CREATE TRIGGER update_evolution_config_updated_at
  BEFORE UPDATE ON prompt_studio_evolution_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update test metrics on stage_prompts
CREATE OR REPLACE FUNCTION update_stage_prompt_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.quality_score IS NOT NULL THEN
    UPDATE stage_prompts
    SET
      test_count = test_count + 1,
      last_tested_at = NOW(),
      avg_quality_score = (
        SELECT AVG(quality_score)
        FROM prompt_test_runs
        WHERE stage_prompt_id = NEW.stage_prompt_id
          AND status = 'completed'
          AND quality_score IS NOT NULL
      )
    WHERE id = NEW.stage_prompt_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_stage_prompt_metrics_trigger ON prompt_test_runs;
CREATE TRIGGER update_stage_prompt_metrics_trigger
  AFTER INSERT OR UPDATE ON prompt_test_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_stage_prompt_metrics();

-- Helper function to get active stage prompt
CREATE OR REPLACE FUNCTION get_active_stage_prompt(p_stage VARCHAR(30))
RETURNS TABLE (
  id UUID,
  stage VARCHAR(30),
  stage_system_prompt TEXT,
  temperature DECIMAL(3,2),
  max_tokens INTEGER,
  model VARCHAR(100),
  prompt_version_id UUID,
  base_system_prompt TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.stage,
    sp.stage_system_prompt,
    sp.temperature,
    sp.max_tokens,
    sp.model,
    sp.prompt_version_id,
    pv.system_prompt as base_system_prompt
  FROM stage_prompts sp
  LEFT JOIN prompt_versions pv ON sp.prompt_version_id = pv.id
  WHERE sp.stage = p_stage
    AND sp.workflow_status = 'active'
  ORDER BY sp.updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get next version number for a stage
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

-- Function to activate a specific version
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
-- INITIAL DATA
-- ============================================================================

-- Initialize default evolution config for all stages
INSERT INTO prompt_studio_evolution_config (stage) VALUES
  ('grounding'),
  ('description'),
  ('usp'),
  ('faq'),
  ('chapters'),
  ('case_studies'),
  ('keywords'),
  ('hashtags')
ON CONFLICT (stage) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE stage_prompts IS 'Stage-specific prompt configurations with workflow status';
COMMENT ON TABLE prompt_test_runs IS 'Records individual test executions for each stage prompt';
COMMENT ON TABLE stage_test_inputs IS 'Stores reusable test input configurations for each stage';
COMMENT ON TABLE prompt_refine_sessions IS 'Stores AI chat sessions for refining stage prompts';
COMMENT ON TABLE prompt_studio_executions IS 'Logs all stage test executions for performance tracking';
COMMENT ON TABLE prompt_studio_feedback IS 'Stores LLM-as-Judge evaluations and user feedback';
COMMENT ON TABLE prompt_studio_evolution_config IS 'Per-stage configuration for automatic prompt evolution';
COMMENT ON TABLE prompt_studio_evolution_cycles IS 'Tracks evolution iterations with feedback summaries';
COMMENT ON TABLE prompt_studio_evolution_candidates IS 'Candidate prompts generated during evolution';
COMMENT ON TABLE stage_prompt_versions IS 'Version history for stage prompts';

COMMENT ON COLUMN stage_prompts.stage IS 'Pipeline stage: grounding, description, usp, faq, chapters, case_studies, keywords, hashtags';
COMMENT ON COLUMN stage_prompts.workflow_status IS 'draft, testing, pending_approval, active, archived';
COMMENT ON COLUMN stage_prompt_versions.version IS 'Sequential version number within each stage';
COMMENT ON COLUMN stage_prompt_versions.is_active IS 'Whether this version is currently active in production';
