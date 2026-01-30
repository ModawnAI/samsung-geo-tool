-- Migration: 009_prompt_refine_sessions.sql
-- Prompt Refiner Chat: AI-assisted prompt improvement sessions
-- Apply via: Supabase Dashboard > SQL Editor

-- ============================================================================
-- Prompt Refine Sessions Table
-- Stores chat sessions for AI-assisted prompt refinement
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompt_refine_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stage reference (which stage's prompt is being refined)
  stage VARCHAR(30) NOT NULL CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  )),

  -- Session metadata
  title VARCHAR(255),

  -- Chat messages stored as JSONB array
  -- Each message: { id, role, content, action?, codeBlocks?, timestamp }
  messages JSONB NOT NULL DEFAULT '[]',

  -- Prompts being worked on
  current_prompt TEXT,
  improved_prompt TEXT,

  -- User preferences
  is_favorite BOOLEAN DEFAULT false,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_refine_sessions_stage ON prompt_refine_sessions(stage);
CREATE INDEX IF NOT EXISTS idx_refine_sessions_user ON prompt_refine_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_refine_sessions_favorite ON prompt_refine_sessions(created_by, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_refine_sessions_updated ON prompt_refine_sessions(updated_at DESC);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE prompt_refine_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own refine sessions"
  ON prompt_refine_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Users can insert their own sessions
CREATE POLICY "Users can insert own refine sessions"
  ON prompt_refine_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own sessions
CREATE POLICY "Users can update own refine sessions"
  ON prompt_refine_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own refine sessions"
  ON prompt_refine_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
CREATE TRIGGER update_prompt_refine_sessions_updated_at
  BEFORE UPDATE ON prompt_refine_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE prompt_refine_sessions IS 'Stores AI chat sessions for refining stage prompts';
COMMENT ON COLUMN prompt_refine_sessions.messages IS 'JSONB array of chat messages with role, content, action, and extracted codeBlocks';
COMMENT ON COLUMN prompt_refine_sessions.current_prompt IS 'The original prompt being refined';
COMMENT ON COLUMN prompt_refine_sessions.improved_prompt IS 'The latest AI-suggested improved prompt';
