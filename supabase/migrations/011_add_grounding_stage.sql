-- Migration: 011_add_grounding_stage.sql
-- Add 'grounding' to stage_prompts and stage_test_inputs check constraints
-- Apply via: Supabase Dashboard > SQL Editor

-- ============================================================================
-- Update stage_prompts check constraint to include 'grounding'
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE stage_prompts DROP CONSTRAINT IF EXISTS stage_prompts_stage_check;

-- Add the updated constraint with 'grounding'
ALTER TABLE stage_prompts ADD CONSTRAINT stage_prompts_stage_check
  CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  ));

-- ============================================================================
-- Update stage_test_inputs check constraint to include 'grounding'
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE stage_test_inputs DROP CONSTRAINT IF EXISTS stage_test_inputs_stage_check;

-- Add the updated constraint with 'grounding'
ALTER TABLE stage_test_inputs ADD CONSTRAINT stage_test_inputs_stage_check
  CHECK (stage IN (
    'grounding', 'description', 'usp', 'faq', 'chapters',
    'case_studies', 'keywords', 'hashtags'
  ));

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN stage_prompts.stage IS 'Pipeline stage: grounding, description, usp, faq, chapters, case_studies, keywords, hashtags';
COMMENT ON COLUMN stage_test_inputs.stage IS 'Pipeline stage: grounding, description, usp, faq, chapters, case_studies, keywords, hashtags';
