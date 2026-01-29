-- Migration: 007_brief_templates.sql
-- Brief Templates Extension
-- Apply via: Supabase Dashboard > SQL Editor

-- Add brief template fields to templates table
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS is_brief_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS brief_defaults JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create index for brief template lookups
CREATE INDEX IF NOT EXISTS idx_templates_is_brief ON public.templates(is_brief_template) WHERE is_brief_template = true;
CREATE INDEX IF NOT EXISTS idx_templates_usage_count ON public.templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category_id);

-- Create brief template usage tracking table
CREATE TABLE IF NOT EXISTS public.brief_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  brief_id UUID REFERENCES public.briefs(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on usage table
ALTER TABLE public.brief_template_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brief_template_usage
CREATE POLICY "Users can view all template usage"
  ON public.brief_template_usage FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own usage records"
  ON public.brief_template_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Index for usage lookups
CREATE INDEX IF NOT EXISTS idx_brief_template_usage_template ON public.brief_template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_brief_template_usage_user ON public.brief_template_usage(user_id);

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular brief templates
CREATE OR REPLACE FUNCTION get_popular_brief_templates(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  category_id UUID,
  category_name TEXT,
  keywords TEXT[],
  brief_usps TEXT[],
  brief_defaults JSONB,
  usage_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.description,
    t.category_id,
    c.name as category_name,
    t.keywords,
    t.brief_usps,
    t.brief_defaults,
    t.usage_count,
    t.created_at
  FROM templates t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.is_brief_template = true
  ORDER BY t.usage_count DESC, t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
