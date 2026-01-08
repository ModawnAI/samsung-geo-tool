# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KB생명보험 HO&F Branch - Information sharing/notice board platform. Next.js 15 app with React 19, Tailwind v4, Supabase auth/db/storage.

**Supabase Project ID**: `yuuqflpiojcocchjrpeo` (always use this for MCP tools)

**Brand Colors**:
- Primary Brown: `#7A6760`
- Accent Yellow: `#FBB318`
- Base: Black and White

## Tech Stack

- Next.js 15 + React 19
- Tailwind CSS v4
- Aceternity UI components
- Radix UI primitives
- Framer Motion
- Phosphor Icons
- Noto Sans KR font
- Supabase (Auth, Database, Storage)

## Restrictions

- Do NOT run `npm run dev` or `npm run build` without explicit user permission
- Do NOT create README or markdown files unless explicitly told to
- Do NOT use emojis in the UI
- Do NOT commit or push to git without asking
- Do NOT run typecheck, build, push, or commit without explicit permission

## Database Operations

- ALWAYS use Supabase MCP tools (`mcp__supabase__*`) for database migrations and schema lookups
- Supabase is shared with another app (jisa RAG system) - use table prefixes to separate concerns

## Existing Database Context

The Supabase project contains existing tables from another app:
- `employees` (813 rows) - Employee directory with departments, positions, clearance levels
- `users` - Linked to employees via `employee_id`
- `kakao_profiles` - Kakao OAuth integration
- Document management tables (documents, document_categories, etc.)

This notice board app should:
1. Reuse authentication (employees/users/kakao_profiles)
2. Create separate tables with prefix (TBD) for notice-specific data
3. Use separate storage bucket for attachments

## Code Style

- Biome for linting/formatting (single quotes, semicolons, 2-space indent)
- Path alias: `@/` maps to `src/`
- Use `camelCase` for functions/variables, `PascalCase` for components/types
- Korean as primary language
