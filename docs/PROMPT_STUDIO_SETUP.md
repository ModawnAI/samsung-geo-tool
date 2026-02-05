# Prompt Studio Database Setup Guide

## Overview

The Prompt Studio feature requires specific database tables to store stage-specific prompt configurations. This document explains the connection between Settings UI and Prompt Studio, and how to set up the required tables.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Settings UI (/settings)                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                    │
│  │  Gemini   │  │ Perplexity│  │  Cohere   │                    │
│  │ (콘텐츠)  │  │(그라운딩) │  │  (RAG)    │                    │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘                    │
│        │              │              │                           │
│        └──────────────┼──────────────┘                           │
│                       ▼                                          │
│              prompt_versions 테이블                              │
│         (engine별 하나의 active 프롬프트)                        │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    integration.ts                                │
│           loadTuningConfig() - 두 테이블 모두 로드               │
│                                                                  │
│   ┌────────────────────┐     ┌────────────────────┐             │
│   │ loadActivePrompts()│     │loadActiveStagePrompts()│          │
│   │  prompt_versions   │     │    stage_prompts     │            │
│   └─────────┬──────────┘     └──────────┬─────────┘             │
│             │                           │                        │
│             ▼                           ▼                        │
│        getStagePrompt() - 두 소스 결합                           │
│        1. base prompt (Settings UI)                              │
│        2. stage instructions (Prompt Studio OR 하드코딩)         │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Prompt Studio (/admin/prompt-studio)           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │grounding│ │descript-│ │   usp   │ │   faq   │ ...            │
│  │         │ │  ion    │ │         │ │         │               │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘               │
│       └───────────┼───────────┼───────────┘                     │
│                   ▼                                              │
│            stage_prompts 테이블                                  │
│       (stage별 커스텀 프롬프트, workflow_status)                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Settings UI → prompt_versions table

| Field | Description |
|-------|-------------|
| `engine` | gemini, perplexity, cohere |
| `system_prompt` | Engine-specific base system prompt |
| `is_active` | Only one active per engine |

**API**: `/api/tuning/prompts`

### 2. Prompt Studio → stage_prompts table

| Field | Description |
|-------|-------------|
| `stage` | One of 8 stages |
| `stage_system_prompt` | Stage-specific custom instructions |
| `workflow_status` | draft, testing, active, archived |

**API**: `/api/prompt-studio/stages/[stage]`

### 3. Pipeline Execution (integration.ts)

```typescript
// 1. Load both sources
const config = await loadTuningConfig()
// → prompts: from prompt_versions
// → stagePrompts: from stage_prompts

// 2. Compose stage-specific prompt
const result = getStagePrompt(config, {
  stage: 'description',
  engine: 'gemini',
  language: 'en'
})
// → basePrompt (Settings UI) + stageInstructions (Prompt Studio or hardcoded)
```

## Priority

When generating content:
1. **Prompt Studio's active stage prompt** (if exists in stage_prompts table with `workflow_status='active'`)
2. **Hardcoded stage instructions** (fallback in prompt-loader.ts)

## Required Database Tables

The following tables are required for Prompt Studio:

1. **stage_prompts** - Stage-specific prompt configurations
2. **stage_prompt_versions** - Version history for stage prompts
3. **prompt_test_runs** - Test execution records
4. **stage_test_inputs** - Reusable test inputs
5. **prompt_refine_sessions** - AI chat sessions for prompt refinement
6. **prompt_studio_executions** - Stage test execution logs
7. **prompt_studio_feedback** - LLM-as-Judge evaluations
8. **prompt_studio_evolution_config** - Evolution settings per stage
9. **prompt_studio_evolution_cycles** - Evolution iteration tracking
10. **prompt_studio_evolution_candidates** - Candidate prompts

## Setup Instructions

### Step 1: Check Current Database State

Run this query in Supabase SQL Editor:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('stage_prompts', 'stage_prompt_versions', 'prompt_test_runs');
```

### Step 2: Apply Migration

If tables don't exist, apply the consolidated migration:

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/APPLY_PROMPT_STUDIO_TABLES.sql`
3. Run the entire script

### Step 3: Verify Installation

Run this query to verify:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'stage_%' OR table_name LIKE 'prompt_%';

-- Check RPC functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_next_stage_version', 'activate_stage_version', 'get_active_stage_prompt');
```

## Current Behavior Without Tables

If the `stage_prompts` table doesn't exist:

1. **GET /api/prompt-studio/stages/[stage]**: Returns fallback prompt from `prompt_versions` with `tableExists: false`
2. **POST/PATCH /api/prompt-studio/stages/[stage]**: Returns 503 error with `code: 'TABLE_NOT_FOUND'`
3. **Pipeline execution**: Uses hardcoded stage instructions (defined in `prompt-loader.ts`)

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/tuning/prompt-loader.ts` | Prompt loading and composition |
| `src/lib/tuning/integration.ts` | Complete config loading and connection |
| `src/app/api/tuning/prompts/route.ts` | Settings UI API |
| `src/app/api/prompt-studio/stages/[stage]/route.ts` | Prompt Studio API |
| `supabase/migrations/APPLY_PROMPT_STUDIO_TABLES.sql` | Consolidated migration |
