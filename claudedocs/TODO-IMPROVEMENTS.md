# Samsung GEO Tool - TODO & Improvement Tracking

> Generated: 2026-01-01
> Last Analyzed: Comprehensive UI/UX, User Journey, and Calculation Review

---

## Critical Code TODOs

### 1. Semantic Similarity Score - ✅ RESOLVED
**Location**: `src/app/api/generate-v2/route.ts:535`
**Status**: ✅ Fixed in Phase 2.1
**Solution Implemented**:
- Created `src/lib/scoring/content-quality.ts` with TF-IDF based similarity
- Uses weighted term overlap (40%), key phrase matching (35%), topic alignment (25%)
- Compares generated content against SRT + grounding data

---

### 2. Anti-Fabrication Score - ✅ RESOLVED
**Location**: `src/app/api/generate-v2/route.ts:536`
**Status**: ✅ Fixed in Phase 2.2
**Solution Implemented**:
- Created `src/lib/scoring/content-quality.ts` with pattern-based detection
- Leverages existing `checkForFabrications()` + additional patterns
- Checks all content sections with diminishing penalty for violations

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

## Phase 1: Quick Wins ✅ COMPLETED

### 1.1 Score Threshold Indicators
**Status**: ✅ COMPLETED (2026-01-01)
**Files modified**:
- `src/components/features/generation-breakdown.tsx`
**Changes**: Added `ScoreThresholdLegend` and `OverallScoreIndicator` components with:
- 🟢 80-100: Excellent
- 🟢 60-79: Good
- 🟡 40-59: Needs improvement
- 🔴 0-39: Critical attention required

### 1.2 Auto-Save Wizard State
**Status**: ✅ COMPLETED (2026-01-01)
**Files modified**:
- `src/store/generation-store.ts`
**Changes**: Added Zustand `persist` middleware with `partialize` to save wizard progress (step, product, keywords) to localStorage

### 1.3 Auto-Run Grounding on Step 3
**Status**: ✅ COMPLETED (2026-01-01)
**Files modified**:
- `src/components/features/keyword-selector.tsx`
**Changes**: Added `useEffect` with `hasAutoRun` ref to trigger grounding automatically on Step 3 entry

### 1.4 Stage Progress During Generation
**Status**: ✅ COMPLETED (2026-01-01)
**Files modified**:
- `src/components/features/generation-progress.tsx`
- `src/store/generation-store.ts`
**Changes**:
- Updated 7 pipeline stages matching actual API (usps → faq → case-studies → keywords → hashtags → description → chapters)
- Added `generationStage` state with simulated realistic timing

---

## Phase 2: Core Improvements ✅ COMPLETED

### 2.1 Implement Semantic Similarity Calculation
**Status**: ✅ COMPLETED (2026-01-01)
**Priority**: 🔴 HIGH
**Files created/modified**:
- Created: `src/lib/scoring/content-quality.ts`
- Modified: `src/app/api/generate-v2/route.ts`
**Changes**:
- Created TF-IDF based semantic similarity calculation
- Uses weighted term overlap, key phrase matching, and topic alignment
- Combines source content (SRT) with grounding data for comparison
- Integrated into rawGenerationScores replacing hardcoded 0.75

### 2.2 Implement Anti-Fabrication Scoring
**Status**: ✅ COMPLETED (2026-01-01)
**Priority**: 🔴 HIGH
**Files created/modified**:
- Created: `src/lib/scoring/content-quality.ts` (combined module)
- Modified: `src/app/api/generate-v2/route.ts`
**Changes**:
- Leverages existing `checkForFabrications()` from anti-fabrication.ts
- Added additional fabrication patterns (unverified stats, fake testimonials, superlatives)
- Checks all content sections: description, FAQs, case studies, USPs
- Calculates score based on violation count with diminishing returns
- Integrated into rawGenerationScores replacing hardcoded 0.85

### 2.3 Parallel Stage Execution
**Status**: ✅ COMPLETED (2026-01-01)
**Priority**: 🟡 MEDIUM
**Files modified**:
- `src/app/api/generate-v2/route.ts`
**Changes**:
- Combined stages 2-6 into single Promise.all() block
- Now runs in parallel: Chapters, FAQ, Step-by-step, Case Studies, Keywords
- Hashtags still sequential (depends on keywords result)
- Added timing log for parallel stages performance monitoring
**Expected improvement**: ~30-40% faster generation

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
