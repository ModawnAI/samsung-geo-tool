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

export interface OnScreenText {
  timestamp: string
  text: string
  type: string
}

export interface ProductInfo {
  name?: string
  model?: string
  category?: string
  tagline?: string
  launch_date?: string
  pricing?: {
    price?: string
    currency?: string
    promotion?: string
  }
}

export interface FeatureSpec {
  feature: string
  description: string
  benefit?: string
  timestamp?: string
}

export interface CallToAction {
  cta: string
  timestamp: string
  type?: string
}

export interface TimestampChapter {
  timestamp: string
  title: string
  description?: string
}

export interface CompetitorMention {
  competitor: string
  context: string
  comparison?: string
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

  // Full transcript and on-screen text
  full_transcript?: string
  on_screen_text?: OnScreenText[]

  // Product info
  product_info?: ProductInfo

  // Features and USPs
  features_and_specs?: FeatureSpec[]
  usps?: string[]

  // Content breakdown
  scene_breakdown?: SceneBreakdown[]
  technical_specs?: TechnicalSpec[]

  // CTAs and chapters
  call_to_actions?: CallToAction[]
  timestamps_chapters?: TimestampChapter[]

  // Semantic analysis
  topic_hierarchy?: TopicHierarchy
  named_entities?: NamedEntity[]
  key_claims?: string[]
  target_audience?: string
  tone_sentiment?: string

  // Brand and stats
  brand_voice?: string
  statistics_mentioned?: string[]
  competitor_mentions?: CompetitorMention[]

  // Visual analysis
  color_palette?: string[]
  visual_style?: string
  production_quality?: string

  // Thumbnails
  thumbnails?: ThumbnailOption[]
  selected_thumbnail_url?: string

  // Hashtags
  hashtags_suggested?: string[]

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

export const VIDEO_ANALYSIS_PROMPT = `You are an expert SEO/AEO/GEO content analyst specializing in product marketing videos. 
Your task is to EXHAUSTIVELY extract ALL information from this video for content generation.

## CRITICAL INSTRUCTIONS
1. Extract EVERY piece of text shown on screen (titles, subtitles, labels, prices, specs)
2. Transcribe ALL spoken narration word-for-word
3. Identify ALL product features, specifications, and benefits mentioned
4. Note ALL visual elements, transitions, and product shots
5. Capture pricing, promotions, offers, and call-to-actions
6. Identify competitor mentions or comparisons
7. Extract brand guidelines visible (colors, fonts, logo usage)

Return your analysis as a JSON object:

{
  "seo_title": "SEO optimized title (60 chars max)",
  "meta_description": "Meta description (155 chars max)",
  
  "full_transcript": "Complete word-for-word transcription of all speech and narration in the video",
  
  "on_screen_text": [
    {"timestamp": "MM:SS", "text": "Exact text shown on screen", "type": "title|subtitle|label|cta|price|spec"}
  ],
  
  "product_info": {
    "name": "Product name",
    "model": "Model number if mentioned",
    "category": "Product category",
    "tagline": "Product tagline or slogan",
    "launch_date": "If mentioned",
    "pricing": {
      "price": "Price if mentioned",
      "currency": "Currency",
      "promotion": "Any promotional pricing"
    }
  },
  
  "features_and_specs": [
    {
      "feature": "Feature name",
      "description": "How it's described in the video",
      "benefit": "User benefit mentioned",
      "timestamp": "When it's shown/mentioned"
    }
  ],
  
  "usps": ["Unique selling point 1", "USP 2", "USP 3"],
  
  "primary_keywords": ["high-volume", "search", "keywords"],
  "secondary_keywords": ["supporting", "keywords"],
  "long_tail_keywords": ["specific long tail phrase 1", "long tail phrase 2"],
  "search_intent": "transactional|informational|navigational|commercial",
  
  "scene_breakdown": [
    {
      "timestamp": "MM:SS - MM:SS",
      "visual_description": "Detailed description of what is shown",
      "text_narration": "Exact words spoken or shown",
      "product_focus": "What product/feature is highlighted",
      "emotion_mood": "The mood/emotion conveyed"
    }
  ],
  
  "technical_specs": [
    {"component": "e.g., Display", "specification": "e.g., 6.8-inch Dynamic AMOLED 2X", "context": "How it's presented"}
  ],
  
  "topic_hierarchy": {
    "core_theme": "Main message of the video",
    "subtopics": [
      {"name": "Subtopic", "description": "Brief description", "importance": "high|medium|low"}
    ]
  },
  
  "named_entities": [
    {"type": "brand|product|technology|person|feature|competitor", "name": "Entity name", "context": "How mentioned", "sentiment": "positive|neutral|negative"}
  ],
  
  "key_claims": ["Specific claim 1", "Claim 2 - quote exactly from video"],
  "statistics_mentioned": ["Any numbers, percentages, or stats mentioned"],
  
  "target_audience": {
    "primary": "Primary audience description",
    "secondary": "Secondary audience",
    "use_cases": ["Use case 1", "Use case 2"]
  },
  
  "tone_sentiment": "Detailed description of tone and sentiment",
  "brand_voice": "Description of brand voice characteristics",
  
  "call_to_actions": [
    {"cta": "CTA text", "timestamp": "When shown", "type": "buy|learn_more|subscribe|preorder"}
  ],
  
  "color_palette": ["#hex1", "#hex2"],
  "visual_style": "Detailed visual style description",
  "production_quality": "Assessment with specific observations",
  
  "thumbnail_recommendations": [
    {
      "timestamp": "MM:SS",
      "description": "Frame description",
      "recommendation": "Why this is good for thumbnail",
      "text_overlay_suggestion": "Suggested text for thumbnail"
    }
  ],
  
  "hashtags_suggested": ["#hashtag1", "#hashtag2"],
  
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
        "name": "Question answered in video",
        "acceptedAnswer": {"@type": "Answer", "text": "Answer from video"}
      }
    ]
  },
  
  "content_gaps": ["Information that should have been included but wasn't"],
  "follow_up_suggestions": ["Suggested follow-up content topics"],
  
  "competitor_mentions": [
    {"competitor": "Name", "context": "How mentioned", "comparison": "What was compared"}
  ],
  
  "timestamps_chapters": [
    {"timestamp": "00:00", "title": "Chapter title", "description": "What this section covers"}
  ]
}

## REQUIREMENTS
- Be EXTREMELY thorough in scene_breakdown - cover every 3-5 seconds
- Transcribe speech EXACTLY as spoken in full_transcript
- Extract ALL on-screen text verbatim
- Include EVERY product feature and specification mentioned
- Capture ALL numbers, prices, dates, and statistics
- Note ALL brand/product names mentioned
- Do NOT summarize - extract the actual content`
