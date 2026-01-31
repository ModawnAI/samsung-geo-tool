-- Migration: 010_prompt_studio_evolution.sql
-- Prompt Studio Evolution: LLM-as-Judge evaluation and automatic prompt improvement
-- Apply via: Supabase Dashboard > SQL Editor

-- ============================================================================
-- Stage Execution Logs
-- Records all stage test executions for analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompt_studio_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stage reference
  stage VARCHAR(30) NOT NULL CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),

  -- Optional session reference (for refiner context)
  session_id UUID REFERENCES prompt_refine_sessions(id) ON DELETE SET NULL,

  -- Execution details
  input JSONB NOT NULL,
  output JSONB,
  raw_response TEXT,

  -- Performance metrics
  latency_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,

  -- Execution status
  status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN (
    'running', 'completed', 'failed'
  )),
  error_message TEXT,

  -- Prompt version tracking
  prompt_version INTEGER DEFAULT 1,
  stage_prompt_id UUID REFERENCES stage_prompts(id) ON DELETE SET NULL,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- Evaluation Feedback
-- Stores LLM-as-Judge evaluations and user feedback
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompt_studio_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Execution reference
  execution_id UUID NOT NULL REFERENCES prompt_studio_executions(id) ON DELETE CASCADE,

  -- Stage for quick filtering
  stage VARCHAR(30) NOT NULL CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),

  -- Feedback type
  feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN (
    'user', 'llm_judge', 'automated'
  )),

  -- Scores (1-5 scale, stored as NUMERIC for precision)
  overall_score NUMERIC(2,1) CHECK (overall_score >= 1 AND overall_score <= 5),
  relevance_score NUMERIC(2,1) CHECK (relevance_score >= 1 AND relevance_score <= 5),
  quality_score NUMERIC(2,1) CHECK (quality_score >= 1 AND quality_score <= 5),
  creativity_score NUMERIC(2,1) CHECK (creativity_score >= 1 AND creativity_score <= 5),

  -- Textual feedback
  feedback_text TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  suggestions TEXT[],

  -- LLM judge metadata
  judge_model VARCHAR(100),
  raw_evaluation JSONB,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Evolution Configuration
-- Per-stage settings for automatic prompt evolution
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompt_studio_evolution_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- One config per stage
  stage VARCHAR(30) NOT NULL UNIQUE CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),

  -- Evolution settings
  enabled BOOLEAN DEFAULT true,
  min_feedback_count INTEGER DEFAULT 10,
  min_improvement_threshold NUMERIC(3,2) DEFAULT 0.10,
  auto_promote_threshold NUMERIC(3,2) DEFAULT 0.20,
  require_human_approval BOOLEAN DEFAULT true,
  max_candidates_per_cycle INTEGER DEFAULT 3,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Evolution Cycles
-- Tracks evolution iterations
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompt_studio_evolution_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stage reference
  stage VARCHAR(30) NOT NULL CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),

  -- Cycle status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'analyzing', 'generating', 'testing', 'completed', 'failed'
  )),

  -- Feedback analysis summary
  feedback_summary JSONB,

  -- Error tracking
  error_message TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- Evolution Candidates
-- Candidate prompts generated during evolution cycles
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompt_studio_evolution_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cycle reference
  cycle_id UUID NOT NULL REFERENCES prompt_studio_evolution_cycles(id) ON DELETE CASCADE,

  -- Stage for quick filtering
  stage VARCHAR(30) NOT NULL CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),

  -- Candidate details
  candidate_version INTEGER NOT NULL,
  system_prompt TEXT NOT NULL,
  generation_rationale TEXT,

  -- Candidate status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'testing', 'completed', 'approved', 'rejected'
  )),

  -- Test results and comparison
  test_results JSONB,
  baseline_score NUMERIC(3,2),
  candidate_score NUMERIC(3,2),
  improvement_delta NUMERIC(3,2),

  -- Review workflow
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

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

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE prompt_studio_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_studio_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_studio_evolution_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_studio_evolution_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_studio_evolution_candidates ENABLE ROW LEVEL SECURITY;

-- Executions: Users can view their own executions
CREATE POLICY "Users can view own executions"
  ON prompt_studio_executions FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own executions"
  ON prompt_studio_executions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own executions"
  ON prompt_studio_executions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Feedback: Users can view and create feedback for their executions
CREATE POLICY "Users can view feedback for own executions"
  ON prompt_studio_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prompt_studio_executions e
      WHERE e.id = prompt_studio_feedback.execution_id
      AND e.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert feedback for own executions"
  ON prompt_studio_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prompt_studio_executions e
      WHERE e.id = prompt_studio_feedback.execution_id
      AND e.created_by = auth.uid()
    )
  );

-- Evolution config: All authenticated users can view
CREATE POLICY "Users can view evolution config"
  ON prompt_studio_evolution_config FOR SELECT
  TO authenticated
  USING (true);

-- Evolution cycles: Users can view and create cycles
CREATE POLICY "Users can view evolution cycles"
  ON prompt_studio_evolution_cycles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert evolution cycles"
  ON prompt_studio_evolution_cycles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own evolution cycles"
  ON prompt_studio_evolution_cycles FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Evolution candidates: Users can view and review
CREATE POLICY "Users can view evolution candidates"
  ON prompt_studio_evolution_candidates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can review candidates"
  ON prompt_studio_evolution_candidates FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================
CREATE TRIGGER update_evolution_config_updated_at
  BEFORE UPDATE ON prompt_studio_evolution_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Initialize default evolution config for all stages
-- ============================================================================
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
-- Comments
-- ============================================================================
COMMENT ON TABLE prompt_studio_executions IS 'Logs all stage test executions for performance tracking and evolution';
COMMENT ON TABLE prompt_studio_feedback IS 'Stores LLM-as-Judge evaluations and user feedback for each execution';
COMMENT ON TABLE prompt_studio_evolution_config IS 'Per-stage configuration for automatic prompt evolution';
COMMENT ON TABLE prompt_studio_evolution_cycles IS 'Tracks evolution iterations with feedback analysis summaries';
COMMENT ON TABLE prompt_studio_evolution_candidates IS 'Candidate prompts generated during evolution with A/B test results';

COMMENT ON COLUMN prompt_studio_feedback.overall_score IS '1-5 scale overall quality score';
COMMENT ON COLUMN prompt_studio_feedback.relevance_score IS '1-5 scale relevance to requirements';
COMMENT ON COLUMN prompt_studio_feedback.quality_score IS '1-5 scale output quality';
COMMENT ON COLUMN prompt_studio_feedback.creativity_score IS '1-5 scale creative expression';

COMMENT ON COLUMN prompt_studio_evolution_config.min_feedback_count IS 'Minimum feedback count before triggering evolution';
COMMENT ON COLUMN prompt_studio_evolution_config.min_improvement_threshold IS 'Minimum score improvement to consider candidate (e.g., 0.10 = 10%)';
COMMENT ON COLUMN prompt_studio_evolution_config.auto_promote_threshold IS 'Score improvement for automatic promotion (e.g., 0.20 = 20%)';
