# Samsung GEO Tool - TODO & Improvement Tracking

> Generated: 2026-01-01
> Last Analyzed: Comprehensive UI/UX, User Journey, and Calculation Review

---

## Critical Code TODOs

### 1. Semantic Similarity Score - HARDCODED
**Location**: `src/app/api/generate-v2/route.ts:522`
```typescript
semanticSimilarity: 0.75, // TODO: Calculate from content similarity analysis
```
**Priority**: 🔴 HIGH
**Impact**: GEO Score accuracy is compromised - always returns 75% regardless of actual content alignment
**Solution**:
- Implement embedding-based similarity calculation
- Compare generated description against SRT content
- Compare against playbook examples
- Use cosine similarity between vector embeddings

---

### 2. Anti-Fabrication Score - HARDCODED
**Location**: `src/app/api/generate-v2/route.ts:523`
```typescript
antiFabrication: 0.85, // High default due to anti-fabrication guardrails
```
**Priority**: 🔴 HIGH
**Impact**: No actual verification of factual claims
**Solution**:
- Cross-reference generated specs against grounding sources
- Flag statistics/numbers not found in source material
- Verify brand names and product names are accurate
- Check for hallucinated features

---

### 3. Pipeline Placeholder Scores - HARDCODED
**Location**: `src/lib/geo-v2/pipeline.ts:334-339`
```typescript
// Placeholder scores - these will be calculated from actual content
const keywordDensity = 12 // /15
const aiExposure = 20 // /25
const questionPatterns = 16 // /20
const sentenceStructure = 12 // /15
const lengthCompliance = 12 // /15
```
**Priority**: 🟡 MEDIUM
**Impact**: Pipeline class not using actual calculated values
**Note**: The `generate-v2/route.ts` calculates these properly - this is unused legacy code
**Solution**: Either remove pipeline.ts placeholders or integrate with route calculations

---

### 4. Pipeline Stage Placeholders
**Location**: `src/lib/geo-v2/pipeline.ts:208-305`
**Priority**: 🟡 MEDIUM
**Issue**: Multiple stages have placeholder implementations:
- Line 210: "For now, create placeholder that will be filled by integration"
- Lines 267-268: "Chapters stage - generating from transcript structure"
- Lines 275-277: "FAQ stage - generating with USP connection"
- Lines 283-286: "Step-by-step stage - generating tutorial content"
- Lines 292-295: "Case studies stage - generating with evidence"
- Lines 300-304: "Keywords stage - extracting product and generic keywords"

**Note**: Actual implementations exist in `generate-v2/route.ts` - pipeline.ts is partially unused

---

### 5. Error Tracking Service Not Implemented
**Location**: `IMPLEMENTATION_PLAN.md:933`
```typescript
// TODO: Send to error tracking service (Sentry, etc.)
```
**Priority**: 🟢 LOW
**Impact**: No centralized error monitoring
**Solution**: Integrate Sentry or similar APM tool

---

## Phase 1: Quick Wins (1-2 weeks)

### 1.1 Score Threshold Indicators
**Status**: ⏳ PENDING
**Files to modify**:
- `src/components/features/output-display.tsx`
**Description**: Add visual indicators for score quality:
- 🟢 80-100: Excellent
- 🟡 60-79: Needs improvement
- 🔴 0-59: Critical attention required

### 1.2 Auto-Save Wizard State
**Status**: ⏳ PENDING
**Files to modify**:
- `src/store/generation-store.ts`
- `src/app/(dashboard)/generate/page.tsx`
**Description**: Save wizard state to localStorage, restore on page load

### 1.3 Auto-Run Grounding on Step 3
**Status**: ⏳ PENDING
**Files to modify**:
- `src/components/features/keyword-selector.tsx`
**Description**: Automatically trigger grounding when entering keywords step if not already run

### 1.4 Stage Progress During Generation
**Status**: ⏳ PENDING
**Files to modify**:
- `src/app/(dashboard)/generate/page.tsx`
- `src/app/api/generate-v2/route.ts` (for streaming)
**Description**: Show real-time progress:
```
Stage 1/7: Extracting USPs... ✅
Stage 2/7: Generating FAQ... 🔄
Stage 3/7: Creating Case Studies... ⏳
```

---

## Phase 2: Core Improvements (2-4 weeks)

### 2.1 Implement Semantic Similarity Calculation
**Status**: ⏳ PENDING
**Priority**: 🔴 HIGH
**Files to modify**:
- `src/app/api/generate-v2/route.ts`
- Create: `src/lib/scoring/semantic-similarity.ts`
**Description**: Calculate actual similarity between generated content and source material

### 2.2 Implement Anti-Fabrication Scoring
**Status**: ⏳ PENDING
**Priority**: 🔴 HIGH
**Files to modify**:
- `src/app/api/generate-v2/route.ts`
- Create: `src/lib/scoring/anti-fabrication.ts`
**Description**: Verify claims against grounding sources, flag unverified statistics

### 2.3 Parallel Stage Execution
**Status**: ⏳ PENDING
**Priority**: 🟡 MEDIUM
**Files to modify**:
- `src/app/api/generate-v2/route.ts`
**Description**: Run independent stages in parallel:
- FAQ + Case Studies (both depend on USPs, not each other)
- Keywords + Hashtags (both derive from content)
**Estimated improvement**: 30-40% faster generation

### 2.4 Generation Version History
**Status**: ⏳ PENDING
**Priority**: 🟡 MEDIUM
**Files to modify**:
- Create: `src/lib/history/version-manager.ts`
- Update Supabase schema for versions
**Description**: Store multiple generation versions per product, allow rollback

---

## Phase 3: Advanced Features (4-8 weeks)

### 3.1 Streaming Response
**Status**: ⏳ PENDING
**Files to modify**:
- `src/app/api/generate-v2/route.ts`
- `src/components/features/output-display.tsx`
**Description**: Stream each stage's output as it completes

### 3.2 A/B Generation Comparison
**Status**: ⏳ PENDING
**Description**: "Generate Alternative" button using different prompt strategies

### 3.3 Export Functionality
**Status**: ⏳ PENDING
**Description**:
- Export to Google Docs
- Export as Markdown
- Export to CMS format

### 3.4 Admin Weight Tuning Interface
**Status**: ⏳ PENDING
**Files**: Already partially exists in `/tuning/weights`
**Description**: Make weight adjustment more accessible and show impact preview

---

## UI/UX Improvements Backlog

| ID | Issue | Location | Priority | Status |
|----|-------|----------|----------|--------|
| UI-1 | Progress visibility during generation | generate/page.tsx | 🔴 HIGH | ⏳ |
| UI-2 | Score breakdown lacks context | output-display.tsx | 🔴 HIGH | ⏳ |
| UI-3 | Grounding results not actionable | keyword-selector.tsx | 🔴 HIGH | ⏳ |
| UI-4 | Template system hidden | product-selector.tsx | 🟡 MED | ⏳ |
| UI-5 | SRT validation too lenient | srt-input.tsx | 🟡 MED | ⏳ |
| UI-6 | Keyword selection lacks guidance | keyword-selector.tsx | 🟡 MED | ⏳ |

---

## User Journey Improvements Backlog

| ID | Issue | Location | Priority | Status |
|----|-------|----------|----------|--------|
| UJ-1 | Step dependencies not clear | generate/page.tsx | 🔴 HIGH | ⏳ |
| UJ-2 | No way to save draft | generation-store.ts | 🔴 HIGH | ⏳ |
| UJ-3 | Regeneration loop unclear | output-display.tsx | 🔴 HIGH | ⏳ |
| UJ-4 | Brief loading silent failure | product-selector.tsx | 🟡 MED | ⏳ |
| UJ-5 | Campaign tag purpose unclear | product-selector.tsx | 🟡 MED | ⏳ |

---

## Scoring Improvements Backlog

| ID | Issue | Location | Priority | Status |
|----|-------|----------|----------|--------|
| SC-1 | Semantic similarity hardcoded | route.ts:522 | 🔴 HIGH | ⏳ |
| SC-2 | Anti-fabrication hardcoded | route.ts:523 | 🔴 HIGH | ⏳ |
| SC-3 | Grounding tier detection limited | grounding-scorer.ts | 🔴 HIGH | ⏳ |
| SC-4 | Weight system not transparent | weights-loader.ts | 🟡 MED | ⏳ |
| SC-5 | Keyword density simplistic | route.ts | 🟡 MED | ⏳ |

---

## Pipeline Performance Backlog

| ID | Issue | Location | Priority | Status |
|----|-------|----------|----------|--------|
| PP-1 | No caching for repeated generations | route.ts | 🔴 HIGH | ⏳ |
| PP-2 | Sequential LLM calls | route.ts | 🔴 HIGH | ⏳ |
| PP-3 | Playbook search not filtered | route.ts | 🔴 HIGH | ⏳ |
| PP-4 | No streaming response | route.ts | 🟡 MED | ⏳ |
| PP-5 | Retry logic too aggressive | route.ts | 🟡 MED | ⏳ |

---

## Feature Gaps Backlog

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| FG-1 | No A/B testing for outputs | 🔴 HIGH | ⏳ |
| FG-2 | No version history | 🔴 HIGH | ⏳ |
| FG-3 | No export options | 🔴 HIGH | ⏳ |
| FG-4 | No collaboration features | 🟡 MED | ⏳ |
| FG-5 | No analytics dashboard | 🟡 MED | ⏳ |

---

## Quick Reference: File Locations

```
Key Files for Phase 1:
├── src/app/(dashboard)/generate/page.tsx      # Wizard controller
├── src/components/features/output-display.tsx  # Score display
├── src/components/features/keyword-selector.tsx # Grounding trigger
├── src/store/generation-store.ts              # State management
└── src/app/api/generate-v2/route.ts           # Main API (2251 lines)

Scoring System:
├── src/lib/tuning/weights-loader.ts           # Weight loading
├── src/lib/geo-v2/grounding-scorer.ts         # Grounding quality
└── src/lib/tuning/integration.ts              # Tuning config

UI Components:
├── src/components/features/product-selector.tsx
├── src/components/features/srt-input.tsx
└── src/components/features/generation-breakdown.tsx
```

---

## Legend

**Priority**:
- 🔴 HIGH: Critical for accurate functionality
- 🟡 MEDIUM: Important for user experience
- 🟢 LOW: Nice to have

**Status**:
- ⏳ PENDING: Not started
- 🔄 IN PROGRESS: Being worked on
- ✅ COMPLETED: Done and verified
- ❌ BLOCKED: Waiting on dependencies

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-01 | Initial documentation created from comprehensive analysis | Claude |
