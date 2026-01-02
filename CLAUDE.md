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
