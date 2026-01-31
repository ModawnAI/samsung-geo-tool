# Samsung GEO Tool - Project Memory

## Supabase Configuration
Project ID: bizvgdpbuhvvgfihmlgj

## Admin Credentials
- Email: admin@admin.com
- Password: admin123

## Key Architecture
- **Prompt Flow**: Settings UI → `/api/tuning/prompts` → `prompt_versions` table → `loadTuningConfig()` → generate-v2 pipeline
- **3 AI Engines**: gemini (content), perplexity (grounding), cohere (RAG/rerank)
- **7-Stage Pipeline**: description → usp → chapters → faq → case_studies → keywords → hashtags

## AI Model Guidelines (IMPORTANT)
**Always use the latest models when writing or updating code:**
- **Gemini**: `gemini-3-flash-preview` (fast) or `gemini-3-pro-preview` (quality)
- **OpenAI**: `gpt-4o` or `gpt-4o-mini`
- **Anthropic**: `claude-sonnet-4-20250514` or `claude-opus-4-20250514`

Do NOT use outdated models like `gemini-2.0-flash`, `gemini-1.5-pro`, `gpt-4-turbo`, `claude-3-sonnet`, etc.