-- Migration: 002_phase3_tables.sql
-- Phase 3: Analytics and Export Tables
-- Apply via: Supabase Dashboard > SQL Editor

-- Competitor analyses table
CREATE TABLE IF NOT EXISTS competitor_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  competitor_name VARCHAR(255) NOT NULL,
  competitor_url TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  analysis_data JSONB NOT NULL,
  keyword_coverage DECIMAL(5,2),
  gap_analysis JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- AI exposure metrics table
CREATE TABLE IF NOT EXISTS ai_exposure_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  generation_id UUID REFERENCES generations(id),
  engine VARCHAR(50) NOT NULL,
  query_text TEXT NOT NULL,
  is_cited BOOLEAN,
  citation_rank INTEGER,
  citation_context TEXT,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  measurement_method VARCHAR(50),
  raw_response JSONB,
  created_by UUID REFERENCES users(id)
);

-- User feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES generations(id),
  user_id UUID REFERENCES users(id),
  feedback_type VARCHAR(50) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  improvement_suggestions TEXT[],
  context_useful BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Export reports table
CREATE TABLE IF NOT EXISTS export_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  format VARCHAR(20) NOT NULL,
  filters JSONB,
  file_url TEXT,
  file_size_bytes INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_competitor_product ON competitor_analyses(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exposure_product ON ai_exposure_metrics(product_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_exposure_generation ON ai_exposure_metrics(generation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_generation ON user_feedback(generation_id);
CREATE INDEX IF NOT EXISTS idx_export_user ON export_reports(created_by, created_at DESC);

-- Modify generations table (add new columns for Phase 2/3)
ALTER TABLE generations ADD COLUMN IF NOT EXISTS geo_score_v2 JSONB;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS json_ld_schema TEXT;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS schema_type VARCHAR(50);
ALTER TABLE generations ADD COLUMN IF NOT EXISTS simulation_results JSONB;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS created_with_prompt_version UUID REFERENCES prompt_versions(id);

-- Enable RLS
ALTER TABLE competitor_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_exposure_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitor_analyses
CREATE POLICY "Users can view their competitor analyses"
  ON competitor_analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their competitor analyses"
  ON competitor_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their competitor analyses"
  ON competitor_analyses FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their competitor analyses"
  ON competitor_analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for ai_exposure_metrics
CREATE POLICY "Users can view their exposure metrics"
  ON ai_exposure_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their exposure metrics"
  ON ai_exposure_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- RLS Policies for user_feedback
CREATE POLICY "Users can view their feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their feedback"
  ON user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their feedback"
  ON user_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for export_reports
CREATE POLICY "Users can view their export reports"
  ON export_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their export reports"
  ON export_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their export reports"
  ON export_reports FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
