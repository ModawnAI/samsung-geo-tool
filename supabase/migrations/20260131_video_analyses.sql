-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for video thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-thumbnails', 'video-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS but allow public access for videos
CREATE POLICY "Public video access" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

CREATE POLICY "Public thumbnail access" ON storage.objects
  FOR SELECT USING (bucket_id = 'video-thumbnails');

CREATE POLICY "Authenticated users can upload thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'video-thumbnails' AND auth.role() = 'authenticated');

-- Create video_analyses table
CREATE TABLE IF NOT EXISTS video_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Video info
  video_url TEXT NOT NULL,
  video_name TEXT NOT NULL,
  video_size BIGINT,
  video_duration_seconds INTEGER,
  mime_type TEXT,
  
  -- Analysis status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  -- SEO Metadata
  seo_title TEXT,
  meta_description TEXT,
  primary_keywords TEXT[],
  secondary_keywords TEXT[],
  long_tail_keywords TEXT[],
  search_intent TEXT,
  
  -- Content breakdown
  scene_breakdown JSONB,  -- Array of {timestamp, visual_description, text_narration}
  technical_specs JSONB,  -- Key-value pairs of specs mentioned
  
  -- Semantic analysis
  topic_hierarchy JSONB,
  named_entities JSONB,
  key_claims TEXT[],
  target_audience TEXT,
  tone_sentiment TEXT,
  
  -- Visual analysis
  color_palette TEXT[],
  visual_style TEXT,
  production_quality TEXT,
  
  -- Thumbnails
  thumbnails JSONB,  -- Array of {timestamp, url, description, recommendation}
  selected_thumbnail_url TEXT,
  
  -- Structured data
  schema_video_object JSONB,
  schema_faq JSONB,
  
  -- Content gaps
  content_gaps TEXT[],
  follow_up_suggestions TEXT[],
  
  -- Full analysis text
  full_analysis TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Token usage
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  video_tokens INTEGER
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_video_analyses_user_id ON video_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_video_analyses_status ON video_analyses(status);
CREATE INDEX IF NOT EXISTS idx_video_analyses_created_at ON video_analyses(created_at DESC);

-- Enable RLS
ALTER TABLE video_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own video analyses"
  ON video_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video analyses"
  ON video_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own video analyses"
  ON video_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own video analyses"
  ON video_analyses FOR DELETE
  USING (auth.uid() = user_id);
