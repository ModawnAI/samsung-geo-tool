-- Migration: 001_phase1_tables.sql
-- Phase 1: Tuning Console Tables
-- Apply via: Supabase Dashboard > SQL Editor

-- Prompt versions table
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  version VARCHAR(20) NOT NULL,
  engine VARCHAR(20) NOT NULL CHECK (engine IN ('gemini', 'perplexity', 'cohere')),
  system_prompt TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  performance_score DECIMAL(5,2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, version)
);

-- Scoring weights table
CREATE TABLE IF NOT EXISTS scoring_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  version VARCHAR(20) NOT NULL,
  weights JSONB NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batch jobs table
CREATE TABLE IF NOT EXISTS batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  total_items INTEGER NOT NULL,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  config JSONB,
  results JSONB,
  error_log TEXT[],
  estimated_cost DECIMAL(10,4),
  actual_cost DECIMAL(10,4),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batch job items table
CREATE TABLE IF NOT EXISTS batch_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_job_id UUID NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  input_data JSONB NOT NULL,
  output_data JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Validation results table
CREATE TABLE IF NOT EXISTS validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES generations(id),
  prompt_version_id UUID REFERENCES prompt_versions(id),
  weights_version_id UUID REFERENCES scoring_weights(id),
  ai_scores JSONB NOT NULL,
  human_scores JSONB,
  score_diff DECIMAL(5,2),
  validation_status VARCHAR(20) DEFAULT 'pending',
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prompt_versions_active ON prompt_versions(is_active, engine);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_items_job ON batch_job_items(batch_job_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_validation_generation ON validation_results(generation_id);

-- Enable RLS
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prompt_versions
CREATE POLICY "Users can view all prompt versions"
  ON prompt_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own prompt versions"
  ON prompt_versions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own prompt versions"
  ON prompt_versions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for scoring_weights
CREATE POLICY "Users can view all scoring weights"
  ON scoring_weights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own scoring weights"
  ON scoring_weights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own scoring weights"
  ON scoring_weights FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for batch_jobs
CREATE POLICY "Users can view their own batch jobs"
  ON batch_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own batch jobs"
  ON batch_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own batch jobs"
  ON batch_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for batch_job_items
CREATE POLICY "Users can view items of their batch jobs"
  ON batch_job_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM batch_jobs
      WHERE batch_jobs.id = batch_job_items.batch_job_id
      AND batch_jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert items to their batch jobs"
  ON batch_job_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batch_jobs
      WHERE batch_jobs.id = batch_job_items.batch_job_id
      AND batch_jobs.created_by = auth.uid()
    )
  );

-- RLS Policies for validation_results
CREATE POLICY "Users can view validation results"
  ON validation_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert validation results"
  ON validation_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = validated_by OR validated_by IS NULL);
