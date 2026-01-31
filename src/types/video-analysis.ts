// Video Analysis Types

export interface SceneBreakdown {
  timestamp: string
  visual_description: string
  text_narration: string
}

export interface TechnicalSpec {
  component: string
  specification: string
}

export interface TopicHierarchy {
  core_theme: string
  subtopics: Array<{
    name: string
    description: string
  }>
}

export interface NamedEntity {
  type: 'brand' | 'product' | 'technology' | 'person' | 'other'
  name: string
  context?: string
}

export interface ThumbnailOption {
  timestamp: string
  url: string
  description: string
  recommendation: string
  file_path?: string
}

export interface VideoAnalysis {
  id: string
  user_id: string
  
  // Video info
  video_url: string
  video_name: string
  video_size?: number
  video_duration_seconds?: number
  mime_type?: string
  
  // Analysis status
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  
  // SEO Metadata
  seo_title?: string
  meta_description?: string
  primary_keywords?: string[]
  secondary_keywords?: string[]
  long_tail_keywords?: string[]
  search_intent?: string
  
  // Content breakdown
  scene_breakdown?: SceneBreakdown[]
  technical_specs?: TechnicalSpec[]
  
  // Semantic analysis
  topic_hierarchy?: TopicHierarchy
  named_entities?: NamedEntity[]
  key_claims?: string[]
  target_audience?: string
  tone_sentiment?: string
  
  // Visual analysis
  color_palette?: string[]
  visual_style?: string
  production_quality?: string
  
  // Thumbnails
  thumbnails?: ThumbnailOption[]
  selected_thumbnail_url?: string
  
  // Structured data
  schema_video_object?: Record<string, unknown>
  schema_faq?: Record<string, unknown>
  
  // Content gaps
  content_gaps?: string[]
  follow_up_suggestions?: string[]
  
  // Full analysis text
  full_analysis?: string
  
  // Timestamps
  created_at: string
  completed_at?: string
  
  // Token usage
  prompt_tokens?: number
  completion_tokens?: number
  video_tokens?: number
}

export interface VideoAnalysisRequest {
  video_name: string
  video_size: number
  mime_type: string
}

export interface VideoAnalysisResponse {
  id: string
  upload_url: string
  video_url: string
}

export interface AnalyzeVideoRequest {
  analysis_id: string
}

export interface ExtractThumbnailsRequest {
  analysis_id: string
  timestamps?: string[] // If not provided, extract at regular intervals
}

export const VIDEO_ANALYSIS_PROMPT = `You are an expert SEO/AEO/GEO content analyst. Provide an EXHAUSTIVE analysis of this video for search optimization purposes. Return your analysis as a JSON object with the following structure:

{
  "seo_title": "SEO optimized title (60 chars max)",
  "meta_description": "Meta description (155 chars max)",
  "primary_keywords": ["array", "of", "primary", "keywords"],
  "secondary_keywords": ["array", "of", "secondary", "keywords"],
  "long_tail_keywords": ["long tail keyword phrase 1", "long tail keyword phrase 2"],
  "search_intent": "transactional|informational|navigational|commercial",
  
  "scene_breakdown": [
    {
      "timestamp": "MM:SS - MM:SS",
      "visual_description": "What is shown visually",
      "text_narration": "Any text or speech"
    }
  ],
  
  "technical_specs": [
    {"component": "Component name", "specification": "Spec value"}
  ],
  
  "topic_hierarchy": {
    "core_theme": "Main theme of the video",
    "subtopics": [
      {"name": "Subtopic 1", "description": "Brief description"}
    ]
  },
  
  "named_entities": [
    {"type": "brand|product|technology", "name": "Entity name", "context": "How it's mentioned"}
  ],
  
  "key_claims": ["Claim 1 from video", "Claim 2 from video"],
  "target_audience": "Description of target audience",
  "tone_sentiment": "Description of tone and sentiment",
  
  "color_palette": ["#hex1", "#hex2", "color names"],
  "visual_style": "Description of visual style",
  "production_quality": "Assessment of production quality",
  
  "thumbnail_recommendations": [
    {
      "timestamp": "MM:SS",
      "description": "What's in this frame",
      "recommendation": "Why this would make a good thumbnail"
    }
  ],
  
  "schema_video_object": {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": "Video title",
    "description": "Video description",
    "duration": "PT3M48S"
  },
  
  "schema_faq": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Question from video",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Answer from video"
        }
      }
    ]
  },
  
  "content_gaps": ["Gap 1", "Gap 2"],
  "follow_up_suggestions": ["Suggested follow-up content 1", "Suggested follow-up content 2"]
}

Analyze the video thoroughly and provide comprehensive data for each field. Be extremely detailed in scene_breakdown, covering every 5-10 seconds of the video.`
