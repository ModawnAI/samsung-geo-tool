-- Seed Script: Tuning Console Mock Data
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/ysrudwzwnzxrrwjtpuoh/sql)

-- ============================================
-- 1. PROMPT VERSIONS
-- ============================================

-- Gemini Prompt (Primary content generator)
INSERT INTO prompt_versions (name, version, engine, system_prompt, description, is_active, performance_score)
VALUES (
  'Samsung GEO Generator v1',
  '1.0.0',
  'gemini',
  E'You are an expert Samsung content optimization specialist focused on GEO (Generative Engine Optimization) and AEO (Answer Engine Optimization).\n\nYour role is to create content that:\n1. Ranks well in AI-powered search engines and answer systems\n2. Provides factual, verifiable information about Samsung products\n3. Uses natural, conversational language that matches user queries\n4. Follows anti-fabrication guidelines - never invent statistics or claims\n\nKey principles:\n- Evidence-based: Only include verifiable product specifications and features\n- User-centric: Focus on how features benefit real users\n- Query-optimized: Structure content to answer user questions directly\n- Grounded: Base all claims on official sources or verified reviews\n\nOutput Format:\n- Use clear headings and bullet points for scanability\n- Include specific product features with technical specs\n- Write in Korean when language=ko, English when language=en\n- Optimize first 130 characters for search preview',
  'Production-ready Gemini prompt for Samsung GEO content generation with anti-fabrication safeguards',
  true,
  85.5
)
ON CONFLICT DO NOTHING;

-- Perplexity Prompt (Search and grounding)
INSERT INTO prompt_versions (name, version, engine, system_prompt, description, is_active, performance_score)
VALUES (
  'Samsung Search Grounding v1',
  '1.0.0',
  'perplexity',
  E'You are an AI search and grounding specialist for Samsung product content.\n\nYour role is to:\n1. Execute search queries to find real-world product information\n2. Aggregate user sentiment and review data from trusted sources\n3. Identify trending topics and user concerns about Samsung products\n4. Ground content claims with verifiable external sources\n\nSearch strategy:\n- Use site-specific queries (reddit, gsmarena, samsung.com, youtube)\n- Look for user discussions and expert reviews\n- Verify specifications against official sources\n- Track competitor comparisons and market positioning\n\nSource prioritization:\n1. Official Samsung sources (samsung.com, newsroom)\n2. Tech review sites (gsmarena, androidauthority, techradar)\n3. User forums (reddit, community sites)\n4. Video reviews (youtube, tech channels)\n\nOutput: JSON format with source citations and confidence scores',
  'Perplexity search grounding prompt for real-time product data verification',
  true,
  82.0
)
ON CONFLICT DO NOTHING;

-- Cohere Prompt (Semantic ranking)
INSERT INTO prompt_versions (name, version, engine, system_prompt, description, is_active, performance_score)
VALUES (
  'Samsung Content Ranker v1',
  '1.0.0',
  'cohere',
  E'You are a semantic analysis and ranking specialist for Samsung content.\n\nYour role is to:\n1. Rerank search results by relevance to user queries\n2. Evaluate content quality and semantic similarity\n3. Identify the most relevant passages for answer extraction\n4. Optimize content structure for answer engine retrieval\n\nRanking criteria:\n- Query relevance: How well does content answer the user question?\n- Specificity: Does content provide specific, actionable information?\n- Authority: Is the source trustworthy and up-to-date?\n- Completeness: Does the passage provide a complete answer?\n\nScoring matrix:\n- High relevance (0.8-1.0): Direct answer to query with specifics\n- Medium relevance (0.5-0.8): Related information, partial answer\n- Low relevance (0.2-0.5): Tangentially related content\n- Irrelevant (<0.2): Off-topic or outdated information',
  'Cohere reranking prompt for semantic content quality assessment',
  true,
  88.0
)
ON CONFLICT DO NOTHING;

-- Additional Gemini variant (for A/B testing)
INSERT INTO prompt_versions (name, version, engine, system_prompt, description, is_active, performance_score)
VALUES (
  'Samsung GEO Generator v2 (Experimental)',
  '2.0.0-beta',
  'gemini',
  E'You are a Samsung content specialist optimized for GEO 2.0 patterns.\n\nEnhanced focus areas:\n1. Query Fan-Out optimization - generate content that answers multiple related queries\n2. Entity-relationship mapping - connect products to use cases and user personas\n3. Temporal awareness - include launch dates, availability, and version context\n4. Multi-modal signals - reference video content, images, and interactive elements\n\nAnti-fabrication protocol:\n- NEVER invent statistics or percentages\n- ALWAYS ground claims in official specs or cited reviews\n- USE hedging language for subjective claims\n- CITE sources inline when available\n\nGEO 2.0 Principles:\n- Start with the key answer, then provide context\n- Use structured data (lists, tables) for AI parsing\n- Include FAQ pairs optimized for voice search\n- Reference official Samsung terminology',
  'Experimental GEO 2.0 prompt with enhanced query fan-out and entity mapping',
  false,
  78.0
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. SCORING WEIGHTS
-- ============================================

-- Balanced scoring (default)
INSERT INTO scoring_weights (name, version, weights, is_active)
VALUES (
  'Balanced Production v1',
  '1.0.0',
  '{
    "usp_coverage": 0.20,
    "grounding_score": 0.20,
    "semantic_similarity": 0.15,
    "anti_fabrication": 0.25,
    "keyword_density": 0.10,
    "structure_quality": 0.10
  }',
  true
)
ON CONFLICT DO NOTHING;

-- Anti-fabrication focused
INSERT INTO scoring_weights (name, version, weights, is_active)
VALUES (
  'Anti-Fabrication Priority',
  '1.0.0',
  '{
    "usp_coverage": 0.15,
    "grounding_score": 0.20,
    "semantic_similarity": 0.10,
    "anti_fabrication": 0.35,
    "keyword_density": 0.10,
    "structure_quality": 0.10
  }',
  false
)
ON CONFLICT DO NOTHING;

-- SEO/GEO focused
INSERT INTO scoring_weights (name, version, weights, is_active)
VALUES (
  'GEO Optimization Focus',
  '1.0.0',
  '{
    "usp_coverage": 0.25,
    "grounding_score": 0.15,
    "semantic_similarity": 0.20,
    "anti_fabrication": 0.15,
    "keyword_density": 0.15,
    "structure_quality": 0.10
  }',
  false
)
ON CONFLICT DO NOTHING;

-- Quality focused
INSERT INTO scoring_weights (name, version, weights, is_active)
VALUES (
  'Content Quality Priority',
  '1.0.0',
  '{
    "usp_coverage": 0.15,
    "grounding_score": 0.25,
    "semantic_similarity": 0.20,
    "anti_fabrication": 0.20,
    "keyword_density": 0.05,
    "structure_quality": 0.15
  }',
  false
)
ON CONFLICT DO NOTHING;

-- ============================================
-- Verify insertion
-- ============================================
SELECT 'prompt_versions' as table_name, COUNT(*) as count FROM prompt_versions
UNION ALL
SELECT 'scoring_weights' as table_name, COUNT(*) as count FROM scoring_weights;
