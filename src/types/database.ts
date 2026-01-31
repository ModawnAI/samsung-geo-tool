export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Activity logging types
export type ActivityCategory = 'auth' | 'generation' | 'navigation' | 'configuration' | 'data' | 'system'

export type GenerationEventType =
  | 'generation_started'
  | 'generation_completed'
  | 'generation_failed'
  | 'regeneration_requested'
  | 'content_refined'
  | 'content_saved'
  | 'content_confirmed'
  | 'content_exported'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          name_ko: string | null
          icon: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          name_ko?: string | null
          icon?: string | null
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          name_ko?: string | null
          icon?: string | null
          sort_order?: number
        }
      }
      products: {
        Row: {
          id: string
          category_id: string
          name: string
          code_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          code_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          code_name?: string | null
          created_at?: string
        }
      }
      briefs: {
        Row: {
          id: string
          product_id: string
          version: number
          usps: string[]
          content: string | null
          is_active: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          product_id: string
          version?: number
          usps: string[]
          content?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          version?: number
          usps?: string[]
          content?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
      }
      generations: {
        Row: {
          id: string
          user_id: string
          product_id: string
          brief_id: string | null
          video_url: string | null
          srt_content: string
          selected_keywords: string[]
          description: string | null
          timestamps: string | null
          hashtags: string[]
          faq: string | null
          status: 'draft' | 'confirmed'
          campaign_tag: string | null
          created_at: string
          updated_at: string
          geo_score_v2: Json | null
          json_ld_schema: string | null
          schema_type: string | null
          simulation_results: Json | null
          created_with_prompt_version: string | null
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          brief_id?: string | null
          video_url?: string | null
          srt_content: string
          selected_keywords: string[]
          description?: string | null
          timestamps?: string | null
          hashtags?: string[]
          faq?: string | null
          status?: 'draft' | 'confirmed'
          campaign_tag?: string | null
          created_at?: string
          updated_at?: string
          geo_score_v2?: Json | null
          json_ld_schema?: string | null
          schema_type?: string | null
          simulation_results?: Json | null
          created_with_prompt_version?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          brief_id?: string | null
          video_url?: string | null
          srt_content?: string
          selected_keywords?: string[]
          description?: string | null
          timestamps?: string | null
          hashtags?: string[]
          faq?: string | null
          status?: 'draft' | 'confirmed'
          campaign_tag?: string | null
          created_at?: string
          updated_at?: string
          geo_score_v2?: Json | null
          json_ld_schema?: string | null
          schema_type?: string | null
          simulation_results?: Json | null
          created_with_prompt_version?: string | null
        }
      }
      grounding_cache: {
        Row: {
          id: string
          product_name: string
          keywords: Json
          sources: Json
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          product_name: string
          keywords: Json
          sources: Json
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          product_name?: string
          keywords?: Json
          sources?: Json
          created_at?: string
          expires_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          name: string
          description: string | null
          product_id: string | null
          keywords: string[]
          campaign_tag: string | null
          brief_usps: string[]
          is_brief_template: boolean
          brief_defaults: Json
          usage_count: number
          category_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          product_id?: string | null
          keywords?: string[]
          campaign_tag?: string | null
          brief_usps?: string[]
          is_brief_template?: boolean
          brief_defaults?: Json
          usage_count?: number
          category_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          product_id?: string | null
          keywords?: string[]
          campaign_tag?: string | null
          brief_usps?: string[]
          is_brief_template?: boolean
          brief_defaults?: Json
          usage_count?: number
          category_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      brief_template_usage: {
        Row: {
          id: string
          template_id: string
          brief_id: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          brief_id?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          brief_id?: string | null
          user_id?: string | null
          created_at?: string
        }
      }
      embedding_cache: {
        Row: {
          id: string
          cache_key: string
          query_text: string
          embedding: number[]
          model: string
          dimensions: number
          hit_count: number
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          cache_key: string
          query_text: string
          embedding: number[]
          model: string
          dimensions: number
          hit_count?: number
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          cache_key?: string
          query_text?: string
          embedding?: number[]
          model?: string
          dimensions?: number
          hit_count?: number
          created_at?: string
          expires_at?: string
        }
      }
      generation_cache: {
        Row: {
          id: string
          cache_key: string
          product_name: string
          keywords: Json
          result: Json
          hit_count: number
          last_accessed_at: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          cache_key: string
          product_name: string
          keywords?: Json
          result: Json
          hit_count?: number
          last_accessed_at?: string
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          cache_key?: string
          product_name?: string
          keywords?: Json
          result?: Json
          hit_count?: number
          last_accessed_at?: string
          created_at?: string
          expires_at?: string
        }
      }
      prompt_versions: {
        Row: {
          id: string
          name: string
          version: string
          engine: 'gemini' | 'perplexity' | 'cohere'
          system_prompt: string
          description: string | null
          is_active: boolean
          performance_score: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          version: string
          engine: 'gemini' | 'perplexity' | 'cohere'
          system_prompt: string
          description?: string | null
          is_active?: boolean
          performance_score?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          version?: string
          engine?: 'gemini' | 'perplexity' | 'cohere'
          system_prompt?: string
          description?: string | null
          is_active?: boolean
          performance_score?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      scoring_weights: {
        Row: {
          id: string
          name: string
          version: string
          weights: Json
          is_active: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          version: string
          weights: Json
          is_active?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          version?: string
          weights?: Json
          is_active?: boolean
          created_by?: string | null
          created_at?: string
        }
      }
      batch_jobs: {
        Row: {
          id: string
          name: string
          type: string
          status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
          total_items: number
          processed_items: number
          successful_items: number
          failed_items: number
          config: Json | null
          results: Json | null
          error_log: string[] | null
          estimated_cost: number | null
          actual_cost: number | null
          started_at: string | null
          completed_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          status?: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
          total_items: number
          processed_items?: number
          successful_items?: number
          failed_items?: number
          config?: Json | null
          results?: Json | null
          error_log?: string[] | null
          estimated_cost?: number | null
          actual_cost?: number | null
          started_at?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          status?: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
          total_items?: number
          processed_items?: number
          successful_items?: number
          failed_items?: number
          config?: Json | null
          results?: Json | null
          error_log?: string[] | null
          estimated_cost?: number | null
          actual_cost?: number | null
          started_at?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      batch_job_items: {
        Row: {
          id: string
          batch_job_id: string
          sequence_number: number
          input_data: Json
          output_data: Json | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          processing_time_ms: number | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          batch_job_id: string
          sequence_number: number
          input_data: Json
          output_data?: Json | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          processing_time_ms?: number | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          batch_job_id?: string
          sequence_number?: number
          input_data?: Json
          output_data?: Json | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          processing_time_ms?: number | null
          created_at?: string
          processed_at?: string | null
        }
      }
      validation_results: {
        Row: {
          id: string
          generation_id: string | null
          prompt_version_id: string | null
          weights_version_id: string | null
          ai_scores: Json
          human_scores: Json | null
          score_diff: number | null
          validation_status: 'pending' | 'approved' | 'rejected'
          validated_by: string | null
          validated_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          generation_id?: string | null
          prompt_version_id?: string | null
          weights_version_id?: string | null
          ai_scores: Json
          human_scores?: Json | null
          score_diff?: number | null
          validation_status?: 'pending' | 'approved' | 'rejected'
          validated_by?: string | null
          validated_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          generation_id?: string | null
          prompt_version_id?: string | null
          weights_version_id?: string | null
          ai_scores?: Json
          human_scores?: Json | null
          score_diff?: number | null
          validation_status?: 'pending' | 'approved' | 'rejected'
          validated_by?: string | null
          validated_at?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string | null
          user_email: string | null
          session_id: string | null
          action_type: string
          action_category: ActivityCategory
          action_description: string | null
          resource_type: string | null
          resource_id: string | null
          resource_name: string | null
          ip_address: string | null
          user_agent: string | null
          request_path: string | null
          request_method: string | null
          metadata: Json
          status: 'success' | 'failure' | 'pending'
          error_message: string | null
          duration_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          session_id?: string | null
          action_type: string
          action_category: ActivityCategory
          action_description?: string | null
          resource_type?: string | null
          resource_id?: string | null
          resource_name?: string | null
          ip_address?: string | null
          user_agent?: string | null
          request_path?: string | null
          request_method?: string | null
          metadata?: Json
          status?: 'success' | 'failure' | 'pending'
          error_message?: string | null
          duration_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          session_id?: string | null
          action_type?: string
          action_category?: ActivityCategory
          action_description?: string | null
          resource_type?: string | null
          resource_id?: string | null
          resource_name?: string | null
          ip_address?: string | null
          user_agent?: string | null
          request_path?: string | null
          request_method?: string | null
          metadata?: Json
          status?: 'success' | 'failure' | 'pending'
          error_message?: string | null
          duration_ms?: number | null
          created_at?: string
        }
      }
      api_call_logs: {
        Row: {
          id: string
          user_id: string | null
          user_email: string | null
          endpoint: string
          method: string
          request_body: Json | null
          request_headers: Json | null
          query_params: Json | null
          response_status: number | null
          response_body: Json | null
          response_size_bytes: number | null
          duration_ms: number | null
          external_apis_called: Json
          error_type: string | null
          error_message: string | null
          error_stack: string | null
          trace_id: string | null
          parent_trace_id: string | null
          estimated_cost: number | null
          tokens_used: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          endpoint: string
          method: string
          request_body?: Json | null
          request_headers?: Json | null
          query_params?: Json | null
          response_status?: number | null
          response_body?: Json | null
          response_size_bytes?: number | null
          duration_ms?: number | null
          external_apis_called?: Json
          error_type?: string | null
          error_message?: string | null
          error_stack?: string | null
          trace_id?: string | null
          parent_trace_id?: string | null
          estimated_cost?: number | null
          tokens_used?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          endpoint?: string
          method?: string
          request_body?: Json | null
          request_headers?: Json | null
          query_params?: Json | null
          response_status?: number | null
          response_body?: Json | null
          response_size_bytes?: number | null
          duration_ms?: number | null
          external_apis_called?: Json
          error_type?: string | null
          error_message?: string | null
          error_stack?: string | null
          trace_id?: string | null
          parent_trace_id?: string | null
          estimated_cost?: number | null
          tokens_used?: Json | null
          created_at?: string
        }
      }
      generation_versions: {
        Row: {
          id: string
          generation_id: string
          user_id: string
          product_id: string
          version_number: number
          version_label: string | null
          description: string | null
          timestamps: string | null
          hashtags: string[]
          faq: Json | null
          usps: Json | null
          case_studies: Json | null
          keywords: Json | null
          chapters: Json | null
          srt_content_hash: string | null
          selected_keywords: string[]
          campaign_tag: string | null
          geo_score_v2: Json | null
          quality_scores: Json | null
          final_score: number | null
          prompt_version_id: string | null
          weights_version_id: string | null
          generation_config: Json | null
          change_summary: string | null
          is_current: boolean
          is_starred: boolean
          created_at: string
        }
        Insert: {
          id?: string
          generation_id: string
          user_id: string
          product_id: string
          version_number?: number
          version_label?: string | null
          description?: string | null
          timestamps?: string | null
          hashtags?: string[]
          faq?: Json | null
          usps?: Json | null
          case_studies?: Json | null
          keywords?: Json | null
          chapters?: Json | null
          srt_content_hash?: string | null
          selected_keywords?: string[]
          campaign_tag?: string | null
          geo_score_v2?: Json | null
          quality_scores?: Json | null
          final_score?: number | null
          prompt_version_id?: string | null
          weights_version_id?: string | null
          generation_config?: Json | null
          change_summary?: string | null
          is_current?: boolean
          is_starred?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          generation_id?: string
          user_id?: string
          product_id?: string
          version_number?: number
          version_label?: string | null
          description?: string | null
          timestamps?: string | null
          hashtags?: string[]
          faq?: Json | null
          usps?: Json | null
          case_studies?: Json | null
          keywords?: Json | null
          chapters?: Json | null
          srt_content_hash?: string | null
          selected_keywords?: string[]
          campaign_tag?: string | null
          geo_score_v2?: Json | null
          quality_scores?: Json | null
          final_score?: number | null
          prompt_version_id?: string | null
          weights_version_id?: string | null
          generation_config?: Json | null
          change_summary?: string | null
          is_current?: boolean
          is_starred?: boolean
          created_at?: string
        }
      }
      generation_event_logs: {
        Row: {
          id: string
          activity_log_id: string | null
          api_call_log_id: string | null
          generation_id: string | null
          user_id: string | null
          event_type: GenerationEventType
          product_id: string | null
          product_name: string | null
          keywords_used: string[] | null
          srt_length: number | null
          video_url: string | null
          pipeline_config: Json | null
          prompt_version_id: string | null
          weights_version_id: string | null
          description_length: number | null
          timestamps_count: number | null
          hashtags_count: number | null
          faq_count: number | null
          quality_scores: Json | null
          final_score: number | null
          grounding_sources_count: number | null
          grounding_citations_count: number | null
          total_duration_ms: number | null
          stage_durations: Json | null
          is_refined: boolean
          refinement_focus: string | null
          refinement_iteration: number
          created_at: string
        }
        Insert: {
          id?: string
          activity_log_id?: string | null
          api_call_log_id?: string | null
          generation_id?: string | null
          user_id?: string | null
          event_type: GenerationEventType
          product_id?: string | null
          product_name?: string | null
          keywords_used?: string[] | null
          srt_length?: number | null
          video_url?: string | null
          pipeline_config?: Json | null
          prompt_version_id?: string | null
          weights_version_id?: string | null
          description_length?: number | null
          timestamps_count?: number | null
          hashtags_count?: number | null
          faq_count?: number | null
          quality_scores?: Json | null
          final_score?: number | null
          grounding_sources_count?: number | null
          grounding_citations_count?: number | null
          total_duration_ms?: number | null
          stage_durations?: Json | null
          is_refined?: boolean
          refinement_focus?: string | null
          refinement_iteration?: number
          created_at?: string
        }
        Update: {
          id?: string
          activity_log_id?: string | null
          api_call_log_id?: string | null
          generation_id?: string | null
          user_id?: string | null
          event_type?: GenerationEventType
          product_id?: string | null
          product_name?: string | null
          keywords_used?: string[] | null
          srt_length?: number | null
          video_url?: string | null
          pipeline_config?: Json | null
          prompt_version_id?: string | null
          weights_version_id?: string | null
          description_length?: number | null
          timestamps_count?: number | null
          hashtags_count?: number | null
          faq_count?: number | null
          quality_scores?: Json | null
          final_score?: number | null
          grounding_sources_count?: number | null
          grounding_citations_count?: number | null
          total_duration_ms?: number | null
          stage_durations?: Json | null
          is_refined?: boolean
          refinement_focus?: string | null
          refinement_iteration?: number
          created_at?: string
        }
      }
      stage_prompts: {
        Row: {
          id: string
          prompt_version_id: string | null
          stage: 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          stage_system_prompt: string | null
          temperature: number
          max_tokens: number
          top_p: number
          model: string
          workflow_status: 'draft' | 'testing' | 'pending_approval' | 'active' | 'archived'
          avg_quality_score: number | null
          test_count: number
          last_tested_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          prompt_version_id?: string | null
          stage: 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          stage_system_prompt?: string | null
          temperature?: number
          max_tokens?: number
          top_p?: number
          model?: string
          workflow_status?: 'draft' | 'testing' | 'pending_approval' | 'active' | 'archived'
          avg_quality_score?: number | null
          test_count?: number
          last_tested_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          prompt_version_id?: string | null
          stage?: 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          stage_system_prompt?: string | null
          temperature?: number
          max_tokens?: number
          top_p?: number
          model?: string
          workflow_status?: 'draft' | 'testing' | 'pending_approval' | 'active' | 'archived'
          avg_quality_score?: number | null
          test_count?: number
          last_tested_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      prompt_test_runs: {
        Row: {
          id: string
          stage_prompt_id: string | null
          test_input: Json
          product_name: string | null
          language: 'en' | 'ko'
          output_content: string | null
          output_parsed: Json | null
          latency_ms: number | null
          input_tokens: number | null
          output_tokens: number | null
          total_tokens: number | null
          quality_score: number | null
          score_breakdown: Json | null
          status: 'pending' | 'running' | 'completed' | 'failed'
          error_message: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          stage_prompt_id?: string | null
          test_input: Json
          product_name?: string | null
          language?: 'en' | 'ko'
          output_content?: string | null
          output_parsed?: Json | null
          latency_ms?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          total_tokens?: number | null
          quality_score?: number | null
          score_breakdown?: Json | null
          status?: 'pending' | 'running' | 'completed' | 'failed'
          error_message?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          stage_prompt_id?: string | null
          test_input?: Json
          product_name?: string | null
          language?: 'en' | 'ko'
          output_content?: string | null
          output_parsed?: Json | null
          latency_ms?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          total_tokens?: number | null
          quality_score?: number | null
          score_breakdown?: Json | null
          status?: 'pending' | 'running' | 'completed' | 'failed'
          error_message?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      stage_test_inputs: {
        Row: {
          id: string
          name: string
          stage: 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          input_data: Json
          is_default: boolean
          is_shared: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          stage: 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          input_data: Json
          is_default?: boolean
          is_shared?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          stage?: 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          input_data?: Json
          is_default?: boolean
          is_shared?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      prompt_refine_sessions: {
        Row: {
          id: string
          stage: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          title: string | null
          messages: Json
          current_prompt: string | null
          improved_prompt: string | null
          is_favorite: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stage: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          title?: string | null
          messages?: Json
          current_prompt?: string | null
          improved_prompt?: string | null
          is_favorite?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stage?: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          title?: string | null
          messages?: Json
          current_prompt?: string | null
          improved_prompt?: string | null
          is_favorite?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      prompt_studio_executions: {
        Row: {
          id: string
          stage: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          session_id: string | null
          input: Json
          output: Json | null
          raw_response: string | null
          latency_ms: number | null
          input_tokens: number | null
          output_tokens: number | null
          status: 'running' | 'completed' | 'failed'
          error_message: string | null
          prompt_version: number
          stage_prompt_id: string | null
          created_by: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          stage: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          session_id?: string | null
          input: Json
          output?: Json | null
          raw_response?: string | null
          latency_ms?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          status?: 'running' | 'completed' | 'failed'
          error_message?: string | null
          prompt_version?: number
          stage_prompt_id?: string | null
          created_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          stage?: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          session_id?: string | null
          input?: Json
          output?: Json | null
          raw_response?: string | null
          latency_ms?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          status?: 'running' | 'completed' | 'failed'
          error_message?: string | null
          prompt_version?: number
          stage_prompt_id?: string | null
          created_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      prompt_studio_feedback: {
        Row: {
          id: string
          execution_id: string
          stage: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          feedback_type: 'user' | 'llm_judge' | 'automated'
          overall_score: number | null
          relevance_score: number | null
          quality_score: number | null
          creativity_score: number | null
          feedback_text: string | null
          strengths: string[] | null
          weaknesses: string[] | null
          suggestions: string[] | null
          judge_model: string | null
          raw_evaluation: Json | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          execution_id: string
          stage: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          feedback_type: 'user' | 'llm_judge' | 'automated'
          overall_score?: number | null
          relevance_score?: number | null
          quality_score?: number | null
          creativity_score?: number | null
          feedback_text?: string | null
          strengths?: string[] | null
          weaknesses?: string[] | null
          suggestions?: string[] | null
          judge_model?: string | null
          raw_evaluation?: Json | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          execution_id?: string
          stage?: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          feedback_type?: 'user' | 'llm_judge' | 'automated'
          overall_score?: number | null
          relevance_score?: number | null
          quality_score?: number | null
          creativity_score?: number | null
          feedback_text?: string | null
          strengths?: string[] | null
          weaknesses?: string[] | null
          suggestions?: string[] | null
          judge_model?: string | null
          raw_evaluation?: Json | null
          created_by?: string | null
          created_at?: string
        }
      }
      prompt_studio_evolution_config: {
        Row: {
          id: string
          stage: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          enabled: boolean
          min_feedback_count: number
          min_improvement_threshold: number
          auto_promote_threshold: number
          require_human_approval: boolean
          max_candidates_per_cycle: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stage: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          enabled?: boolean
          min_feedback_count?: number
          min_improvement_threshold?: number
          auto_promote_threshold?: number
          require_human_approval?: boolean
          max_candidates_per_cycle?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stage?: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          enabled?: boolean
          min_feedback_count?: number
          min_improvement_threshold?: number
          auto_promote_threshold?: number
          require_human_approval?: boolean
          max_candidates_per_cycle?: number
          created_at?: string
          updated_at?: string
        }
      }
      prompt_studio_evolution_cycles: {
        Row: {
          id: string
          stage: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          status: 'pending' | 'analyzing' | 'generating' | 'testing' | 'completed' | 'failed'
          feedback_summary: Json | null
          error_message: string | null
          created_by: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          stage: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          status?: 'pending' | 'analyzing' | 'generating' | 'testing' | 'completed' | 'failed'
          feedback_summary?: Json | null
          error_message?: string | null
          created_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          stage?: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          status?: 'pending' | 'analyzing' | 'generating' | 'testing' | 'completed' | 'failed'
          feedback_summary?: Json | null
          error_message?: string | null
          created_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      prompt_studio_evolution_candidates: {
        Row: {
          id: string
          cycle_id: string
          stage: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          candidate_version: number
          system_prompt: string
          generation_rationale: string | null
          status: 'pending' | 'testing' | 'completed' | 'approved' | 'rejected'
          test_results: Json | null
          baseline_score: number | null
          candidate_score: number | null
          improvement_delta: number | null
          reviewed_by: string | null
          reviewed_at: string | null
          review_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cycle_id: string
          stage: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          candidate_version: number
          system_prompt: string
          generation_rationale?: string | null
          status?: 'pending' | 'testing' | 'completed' | 'approved' | 'rejected'
          test_results?: Json | null
          baseline_score?: number | null
          candidate_score?: number | null
          improvement_delta?: number | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cycle_id?: string
          stage?: 'grounding' | 'description' | 'usp' | 'faq' | 'chapters' | 'case_studies' | 'keywords' | 'hashtags'
          candidate_version?: number
          system_prompt?: string
          generation_rationale?: string | null
          status?: 'pending' | 'testing' | 'completed' | 'approved' | 'rejected'
          test_results?: Json | null
          baseline_score?: number | null
          candidate_score?: number | null
          improvement_delta?: number | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_cache_hit: {
        Args: { row_cache_key: string }
        Returns: void
      }
      increment_generation_cache_hit: {
        Args: { p_cache_key: string }
        Returns: void
      }
      prune_expired_generation_cache: {
        Args: Record<string, never>
        Returns: number
      }
      get_generation_cache_stats: {
        Args: Record<string, never>
        Returns: {
          total_entries: number
          total_hits: number
          expired_entries: number
          avg_hit_count: number
          oldest_entry: string | null
          newest_entry: string | null
        }[]
      }
      get_user_activity_summary: {
        Args: { p_user_id: string; p_days: number }
        Returns: Json[]
      }
      get_recent_api_errors: {
        Args: { p_user_id: string | null; p_limit: number }
        Returns: Json[]
      }
      increment_template_usage: {
        Args: { p_template_id: string }
        Returns: void
      }
      get_popular_brief_templates: {
        Args: { p_limit: number }
        Returns: {
          id: string
          name: string
          description: string | null
          category_id: string | null
          category_name: string | null
          keywords: string[]
          brief_usps: string[]
          brief_defaults: Json
          usage_count: number
          created_at: string
        }[]
      }
      get_active_stage_prompt: {
        Args: { p_stage: string }
        Returns: {
          id: string
          stage: string
          stage_system_prompt: string | null
          temperature: number
          max_tokens: number
          model: string
          prompt_version_id: string | null
          base_system_prompt: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
