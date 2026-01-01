-- Migration: 003_activity_logging.sql
-- Comprehensive Activity Logging System
-- Apply via: Supabase Dashboard > SQL Editor

-- ============================================
-- Activity Logs: Main user activity tracking
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,
  session_id TEXT,

  -- Action details
  action_type VARCHAR(50) NOT NULL,
  action_category VARCHAR(50) NOT NULL,
  action_description TEXT,

  -- Resource context
  resource_type VARCHAR(50),
  resource_id UUID,
  resource_name TEXT,

  -- Request context
  ip_address INET,
  user_agent TEXT,
  request_path TEXT,
  request_method VARCHAR(10),

  -- Additional metadata
  metadata JSONB DEFAULT '{}',

  -- Result tracking
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'pending')),
  error_message TEXT,
  duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action categories for activity_logs:
-- - 'auth': login, logout, password_reset
-- - 'generation': create, regenerate, save, confirm, export
-- - 'navigation': page_view, tab_switch
-- - 'configuration': update_settings, change_prompt, update_weights
-- - 'data': upload, download, delete
-- - 'system': error, warning, info

COMMENT ON TABLE activity_logs IS 'Comprehensive user activity tracking for audit and analytics';
COMMENT ON COLUMN activity_logs.action_type IS 'Specific action: login, generate_content, save_draft, etc.';
COMMENT ON COLUMN activity_logs.action_category IS 'Category: auth, generation, navigation, configuration, data, system';
COMMENT ON COLUMN activity_logs.resource_type IS 'Type of resource: generation, product, template, brief, etc.';

-- ============================================
-- API Call Logs: Detailed API request tracking
-- ============================================
CREATE TABLE IF NOT EXISTS api_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User context
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,

  -- Request details
  endpoint TEXT NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_body JSONB,
  request_headers JSONB,
  query_params JSONB,

  -- Response details
  response_status INTEGER,
  response_body JSONB,
  response_size_bytes INTEGER,

  -- Performance metrics
  duration_ms INTEGER,

  -- External API calls made during this request
  external_apis_called JSONB DEFAULT '[]',

  -- Error tracking
  error_type VARCHAR(100),
  error_message TEXT,
  error_stack TEXT,

  -- Request tracing
  trace_id TEXT,
  parent_trace_id TEXT,

  -- Cost tracking (for AI API calls)
  estimated_cost DECIMAL(10, 6),
  tokens_used JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE api_call_logs IS 'Detailed API request/response logging for debugging and cost tracking';
COMMENT ON COLUMN api_call_logs.external_apis_called IS 'Array of external APIs called: [{name, duration_ms, status}]';
COMMENT ON COLUMN api_call_logs.tokens_used IS 'Token usage: {input, output, total}';

-- ============================================
-- Generation Event Logs: Specific to content generation
-- ============================================
CREATE TABLE IF NOT EXISTS generation_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  activity_log_id UUID REFERENCES activity_logs(id) ON DELETE CASCADE,
  api_call_log_id UUID REFERENCES api_call_logs(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Event type
  event_type VARCHAR(50) NOT NULL,

  -- Input snapshot
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  keywords_used TEXT[],
  srt_length INTEGER,
  video_url TEXT,

  -- Pipeline configuration
  pipeline_config JSONB,
  prompt_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
  weights_version_id UUID REFERENCES scoring_weights(id) ON DELETE SET NULL,

  -- Output metrics
  description_length INTEGER,
  timestamps_count INTEGER,
  hashtags_count INTEGER,
  faq_count INTEGER,

  -- Quality scores
  quality_scores JSONB,
  final_score DECIMAL(5, 2),

  -- Grounding metadata
  grounding_sources_count INTEGER,
  grounding_citations_count INTEGER,

  -- Performance
  total_duration_ms INTEGER,
  stage_durations JSONB,

  -- Refinement tracking
  is_refined BOOLEAN DEFAULT false,
  refinement_focus TEXT,
  refinement_iteration INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event types for generation_event_logs:
-- - 'generation_started': When generation begins
-- - 'generation_completed': When generation finishes successfully
-- - 'generation_failed': When generation fails
-- - 'regeneration_requested': When user requests regeneration
-- - 'content_refined': When content is refined/improved
-- - 'content_saved': When content is saved as draft
-- - 'content_confirmed': When content is confirmed/published
-- - 'content_exported': When content is exported

COMMENT ON TABLE generation_event_logs IS 'Detailed tracking of all generation events for analytics and debugging';
COMMENT ON COLUMN generation_event_logs.stage_durations IS 'Duration per stage: {rag, grounding, generation, scoring}';

-- ============================================
-- Indexes for efficient querying
-- ============================================

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action_category, action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON activity_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_session ON activity_logs(session_id);

-- API call logs indexes
CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_call_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_call_logs(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_call_logs(response_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_trace ON api_call_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_call_logs(created_at DESC);

-- Generation event logs indexes
CREATE INDEX IF NOT EXISTS idx_gen_events_user ON generation_event_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gen_events_generation ON generation_event_logs(generation_id);
CREATE INDEX IF NOT EXISTS idx_gen_events_type ON generation_event_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gen_events_product ON generation_event_logs(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gen_events_created ON generation_event_logs(created_at DESC);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_event_logs ENABLE ROW LEVEL SECURITY;

-- Activity logs RLS
CREATE POLICY "Users can view their own activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- API call logs RLS
CREATE POLICY "Users can view their own API logs"
  ON api_call_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert API logs"
  ON api_call_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Generation event logs RLS
CREATE POLICY "Users can view their own generation events"
  ON generation_event_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert generation events"
  ON generation_event_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- Utility Functions
-- ============================================

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_user_email TEXT,
  p_action_type VARCHAR(50),
  p_action_category VARCHAR(50),
  p_action_description TEXT DEFAULT NULL,
  p_resource_type VARCHAR(50) DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_resource_name TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_status VARCHAR(20) DEFAULT 'success',
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO activity_logs (
    user_id, user_email, action_type, action_category,
    action_description, resource_type, resource_id, resource_name,
    metadata, status, duration_ms
  ) VALUES (
    p_user_id, p_user_email, p_action_type, p_action_category,
    p_action_description, p_resource_type, p_resource_id, p_resource_name,
    p_metadata, p_status, p_duration_ms
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Function to get activity summary for a user
CREATE OR REPLACE FUNCTION get_user_activity_summary(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  action_category VARCHAR(50),
  action_type VARCHAR(50),
  count BIGINT,
  success_count BIGINT,
  failure_count BIGINT,
  avg_duration_ms NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.action_category,
    al.action_type,
    COUNT(*)::BIGINT as count,
    COUNT(*) FILTER (WHERE al.status = 'success')::BIGINT as success_count,
    COUNT(*) FILTER (WHERE al.status = 'failure')::BIGINT as failure_count,
    AVG(al.duration_ms)::NUMERIC as avg_duration_ms
  FROM activity_logs al
  WHERE al.user_id = p_user_id
    AND al.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY al.action_category, al.action_type
  ORDER BY count DESC;
END;
$$;

-- Function to get recent API errors
CREATE OR REPLACE FUNCTION get_recent_api_errors(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_email TEXT,
  endpoint TEXT,
  method VARCHAR(10),
  response_status INTEGER,
  error_type VARCHAR(100),
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    acl.id,
    acl.user_email,
    acl.endpoint,
    acl.method,
    acl.response_status,
    acl.error_type,
    acl.error_message,
    acl.duration_ms,
    acl.created_at
  FROM api_call_logs acl
  WHERE (p_user_id IS NULL OR acl.user_id = p_user_id)
    AND (acl.response_status >= 400 OR acl.error_type IS NOT NULL)
  ORDER BY acl.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- Cleanup policy (optional - for data retention)
-- ============================================

-- Create a function to clean old logs (run via cron job)
CREATE OR REPLACE FUNCTION cleanup_old_logs(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  activity_logs_deleted BIGINT,
  api_logs_deleted BIGINT,
  generation_events_deleted BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activity_deleted BIGINT;
  v_api_deleted BIGINT;
  v_gen_deleted BIGINT;
BEGIN
  -- Delete old activity logs
  WITH deleted AS (
    DELETE FROM activity_logs
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_activity_deleted FROM deleted;

  -- Delete old API logs
  WITH deleted AS (
    DELETE FROM api_call_logs
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_api_deleted FROM deleted;

  -- Delete old generation event logs
  WITH deleted AS (
    DELETE FROM generation_event_logs
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_gen_deleted FROM deleted;

  RETURN QUERY SELECT v_activity_deleted, v_api_deleted, v_gen_deleted;
END;
$$;
