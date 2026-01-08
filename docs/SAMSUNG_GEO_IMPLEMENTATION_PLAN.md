# Samsung GEO Tool - Comprehensive Implementation Plan

> **Created**: January 2025
> **Purpose**: Complete roadmap for implementing Samsung-specific GEO/AEO optimizations
> **Status**: Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Samsung Writing Style Analysis](#part-1-samsung-writing-style-analysis)
3. [Current Prompt Gaps](#part-2-current-prompt-gaps)
4. [Samsung Feedback Requirements](#part-3-samsung-feedback-requirements)
5. [Recommended App Flow Changes](#part-4-recommended-app-flow-changes)
6. [Specific Code Changes](#part-5-specific-code-changes)
7. [Detailed Implementation Tasks](#part-6-detailed-implementation-tasks)
8. [Priority Matrix](#part-7-priority-matrix)

---

## Executive Summary

### Key Findings

Based on thorough analysis of Samsung's YouTube content data (`2425.csv`, `description_1031.csv`) and SRT files, we identified significant gaps between the current GEO tool prompts and Samsung's actual writing conventions.

### Critical Issues to Address

| Issue | Impact | Priority |
|-------|--------|----------|
| Q&A format uses wrong notation (`Q./A.` vs `Q:/A:`) | High - Brand inconsistency | P0 |
| Hashtag order incorrect (should be `#GalaxyAI` first, `#Samsung` last) | High - Brand compliance | P0 |
| Missing content type differentiation | Medium - Output quality | P1 |
| No fixed hashtag input option | Medium - Operational need | P1 |
| Missing Feed vs Shorts distinction | Medium - Format compliance | P2 |

### Samsung's 4 Key Requests

1. **Category Expansion**: Add ESG, Documentary, Campaign categories
2. **Hashtag Method**: Pre-defined insertion (not AI-generated)
3. **Input Process**: SRT file/text direct input option
4. **Placement Distinction**: 16:9 (Feed) vs 9:16 (Shorts) formatting

---

## Part 1: Samsung Writing Style Analysis

### 1.1 Description Structure Patterns

Based on analysis of 20+ real Samsung YouTube descriptions from `description_1031.csv`:

```
┌────────────────────┬─────────────────────────────────────────────────────────────────┐
│ Section            │ Pattern & Example                                               │
├────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Opening            │ "This is the official [type] for/on [product]."                 │
│                    │ Ex: "This is the official video guide on how to use AI Select   │
│                    │      on Galaxy Book."                                           │
├────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Opening (Alt)      │ "Introducing the [product]."                                    │
│                    │ Ex: "Introducing the new Galaxy Book5 Pro."                     │
├────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Body               │ Feature list + emojis (1-3 max) + benefit                       │
│                    │ Ex: "Search effortlessly without interrupting your flow—drag    │
│                    │      it, draw it, and find it! 🔍"                              │
├────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Timestamps         │ 00:00 format, 2-5 words per entry                               │
│                    │ Ex: "00:00 Intro\n00:16 Search image with AI Select"            │
├────────────────────┼─────────────────────────────────────────────────────────────────┤
│ How-to Steps       │ "Follow these simple steps to use [feature]:"                   │
│                    │ Ex: "Step 1: Open the app\nStep 2: Select feature..."           │
├────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Q&A                │ Q: [10-20 words]?\nA: [50-100 words]                            │
│                    │ CRITICAL: Use COLON (:) not PERIOD (.)                          │
├────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Hashtags           │ #GalaxyAI first, #Samsung last                                  │
│                    │ Ex: "#GalaxyAI #GalaxyBook5Pro #Samsung"                        │
├────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Disclaimer         │ *[Legal text] - placed AFTER hashtags                           │
└────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 1.2 Content Type Templates

| Content Type | Structure | Characteristics |
|--------------|-----------|-----------------|
| **Intro** | Opening → Timestamps → Q&A → Hashtags | Feature-focused, comprehensive |
| **Unboxing** | Opening → Timestamps → "What's new" list → Q&A | Box contents, first impressions |
| **How-to** | Opening → "Follow steps" → Q&A → Hashtags | Step-by-step instructions |
| **Shorts** | Hook only (1-2 sentences) + minimal hashtags | 9:16 format, brief |
| **Teaser** | Minimal, mystery-focused | 15-30 seconds, hook only |
| **Official Replay** | Event context → Timestamps → Hashtags | Long-form, comprehensive |

### 1.3 Placement Distinction

| Format | Aspect | Description Length | Structure |
|--------|--------|-------------------|-----------|
| **Feed (16:9)** | Standard | Full (500-1500 chars) | Complete structure |
| **Shorts (9:16)** | Vertical | Brief (100-200 chars) | Hook + 1-2 hashtags |

### 1.4 Samsung Conventions (Corrections)

| Element | Correct | Incorrect |
|---------|---------|-----------|
| Q&A format | `Q:` and `A:` | `Q.` and `A.` |
| Spacing | `76.1 Wh` | `76.1Wh` |
| Articles | `the all-new` | `All new` |
| Product names | `Buds` | `buds` |
| Disclaimer position | After hashtags | Before hashtags |

### 1.5 Approved Emojis

Limited to 1-3 per description:
```
📦 🌟 ✨ 🔍 ⌨️ 🚀 🎨 🎬 🤖 🖊️
```

### 1.6 Vanity Link Format

```
http://smsng.co/[ProductCode]_[VideoType]_yt

Examples:
- GalaxyBook5Pro_Intro_yt
- ZFlip7_How-to_yt
- S25_Unboxing_yt
```

---

## Part 2: Current Prompt Gaps

### 2.1 Description Stage Gaps

| Current Prompt Says | Samsung Actually Uses | Gap Type |
|---------------------|----------------------|----------|
| No opener template | "This is the official..." | Missing pattern |
| Generic CTA | "Learn more: smsng.co/..." | Missing vanity link |
| No emoji guidance | 1-3 approved emojis | Missing constraint |
| "5-8 strategic hashtags" | 3-5 hashtags, specific order | Wrong count/order |

### 2.2 FAQ Stage Gaps

| Current Prompt Says | Samsung Actually Uses | Gap Type |
|---------------------|----------------------|----------|
| "Q:/A: format" | `Q:` and `A:` (colon only) | Wrong notation |
| "5-7 FAQ items" | 2-4 Q&A pairs typically | Too many specified |
| No length guidance | Q: 10-20 words, A: 50-100 | Missing constraint |

### 2.3 Hashtag Stage Gaps

| Current Prompt Says | Samsung Actually Uses | Gap Type |
|---------------------|----------------------|----------|
| AI-generated hashtags | Pre-defined by campaign | Wrong approach |
| "#ProductName #Feature #Category #Brand" | `#GalaxyAI` first, `#Samsung` last | Wrong order |
| 5-8 hashtags | 3-5 hashtags | Wrong count |

### 2.4 Missing Sections

| Section | Description | Content Type |
|---------|-------------|--------------|
| "What's new in [product]?" | Numbered list | Unboxing |
| "Follow these simple steps" | Step format | How-to |
| Shorts-specific format | Brief hook only | Shorts |
| ESG/Documentary handling | Non-product content | Special categories |

---

## Part 3: Samsung Feedback Requirements

### Requirement 1: Category Expansion

**Current State**: Product-only categories (Galaxy S, Z, Tab, Watch, Buds, TV, Appliances)

**Required Addition**:
```
├── ESG (Sustainability, Environment)
├── Documentary (Documentary Films)
├── Campaign (Brand Campaigns)
└── Event (Unpacked, Announcements)
```

**Implementation**: Add "Content Category" selector separate from product category

### Requirement 2: Hashtag Generation Method

**Current State**: AI auto-generates hashtags

**Samsung Request**: Pre-defined hashtag insertion

**Implementation**:
```
┌─────────────────────────────────────────┐
│ Hashtag Settings                        │
├─────────────────────────────────────────┤
│ ○ Use Fixed Hashtags (Recommended)      │
│   [#GalaxyAI #GalaxyS25 #Samsung    ]   │
│                                         │
│ ○ AI Auto-Generate (Reference only)     │
└─────────────────────────────────────────┘
```

### Requirement 3: Data Input Process

**Current State**: YouTube URL → SRT auto-extraction

**Samsung Request**: Direct SRT file/text input option

**Implementation**:
```
Input Method:
┌──────────────┬──────────────┬──────────────┐
│  YouTube URL │  SRT Upload  │  Text Input  │
└──────────────┴──────────────┴──────────────┘
```

### Requirement 4: Video Format Distinction

**Current State**: No format distinction

**Samsung Request**: 16:9 vs Shorts (9:16) handling

**Implementation**:

| Format | Output | Features |
|--------|--------|----------|
| Feed (16:9) | Full structure | Opening → CTA → Timestamps → Q&A → Hashtags |
| Shorts (9:16) | Brief version | 2-3 sentences + hashtags only |

---

## Part 4: Recommended App Flow Changes

### 4.1 Updated Generation Flow

```
CURRENT:
Product → Content → Keywords → Output

PROPOSED:
Product → Content Type → Video Format → Content → Keywords → Output
              ↓              ↓
    [Intro|How-to|...]   [Feed|Shorts]
```

### 4.2 New UI Fields

| Field | Type | Purpose | Location |
|-------|------|---------|----------|
| Content Type | Select | Intro/How-to/Unboxing/Shorts/Teaser/ESG/Documentary | Product Selector |
| Video Format | Toggle | Feed (16:9) / Shorts (9:16) | Product Selector |
| Fixed Hashtags | Multi-input | Pre-defined hashtags | Keywords section |
| Vanity Link Code | Input | For Learn more CTA | Product Selector |

### 4.3 Category Expansion

**Current categories** (from `product-selector.tsx`):
- Smartphones
- Watches
- Tablets
- Earbuds
- Laptops
- VR

**Add**:
- ESG/Sustainability
- Documentary/Film
- Campaign/Brand
- Accessories

---

## Part 5: Specific Code Changes

### 5.1 Types Update (`src/types/geo-v2.ts`)

```typescript
// ADD: Content type enum
export type ContentType =
  | 'intro'
  | 'unboxing'
  | 'how_to'
  | 'shorts'
  | 'teaser'
  | 'brand'
  | 'esg'
  | 'documentary'
  | 'official_replay'

// ADD: Video format
export type VideoFormat = 'feed_16x9' | 'shorts_9x16'

// ADD: Input method
export type InputMethod = 'youtube_url' | 'srt_upload' | 'text_input'

// EXTEND: Generation request interface
export interface GenerationRequest {
  // existing fields...
  contentType: ContentType
  videoFormat: VideoFormat
  inputMethod: InputMethod
  fixedHashtags?: string[]
  vanityLinkCode?: string
  srtContent?: string
}
```

### 5.2 Generation Store Update (`store/generation-store.ts`)

```typescript
// ADD to store state:
contentType: ContentType
videoFormat: VideoFormat
inputMethod: InputMethod
fixedHashtags: string[]
vanityLinkCode: string
srtContent: string

// ADD corresponding actions:
setContentType: (type: ContentType) => void
setVideoFormat: (format: VideoFormat) => void
setInputMethod: (method: InputMethod) => void
setFixedHashtags: (hashtags: string[]) => void
setVanityLinkCode: (code: string) => void
setSrtContent: (content: string) => void
```

### 5.3 Product Selector Update

Add new sections:
1. Content Type selector (radio/select)
2. Video Format toggle (Feed vs Shorts)
3. Fixed Hashtags multi-input
4. Vanity Link Code input
5. SRT/Text input area

### 5.4 Prompt Loader Update (`src/lib/tuning/prompt-loader.ts`)

Update `composeStagePrompt` to:
1. Accept `contentType` and `videoFormat` parameters
2. Return content-type-specific templates
3. Apply Samsung writing conventions

---

## Part 6: Detailed Implementation Tasks

### Phase 0: Critical Fixes (P0)

#### Task P0-1: Fix Q&A Format in Prompts

**File**: `src/lib/tuning/prompt-loader.ts`

**Current** (line ~180-200 in FAQ stage):
```typescript
// Current incorrect pattern
"Q:/A: format"
```

**Change to**:
```typescript
## Q&A FORMAT (CRITICAL - Samsung Standard)
Format:
Q: [question]
A: [answer]

Rules:
- Use COLON (:) after Q and A, NOT period (.)
- 2-4 Q&A pairs maximum (not 5-7)
- No blank line between Q and A
- Question length: 10-20 words
- Answer length: 50-100 words
- Focus on practical user questions
```

**Validation**: Search for all instances of "Q." or "A." and replace with "Q:" or "A:"

---

#### Task P0-2: Fix Hashtag Order in Prompts

**File**: `src/lib/tuning/prompt-loader.ts`

**Current** (hashtag stage):
```typescript
"#ProductName #KeyFeature #Category #Brand"
```

**Change to**:
```typescript
## HASHTAG ORDER (CRITICAL - Samsung Standard)

Required Order:
1. #GalaxyAI (if AI features present, ALWAYS FIRST)
2. #[ProductName] (e.g., #GalaxyZFlip7, #GalaxyBook5Pro)
3. #[ProductSeries] (e.g., #GalaxyS, #GalaxyBook)
4. #Samsung (ALWAYS LAST)

Constraints:
- Total: 3-5 hashtags only
- No spaces within hashtags
- Capitalize first letter of each word
- If user provides fixed hashtags, use those instead
```

---

### Phase 1: High Priority Features (P1)

#### Task P1-1: Add Content Type Selector UI

**Files to modify**:
- `src/types/geo-v2.ts` - Add ContentType type
- `src/store/generation-store.ts` - Add contentType state
- `src/components/generate/product-selector.tsx` - Add UI selector

**Implementation**:

1. Add to `geo-v2.ts`:
```typescript
export type ContentType =
  | 'intro'
  | 'unboxing'
  | 'how_to'
  | 'shorts'
  | 'teaser'
  | 'brand'
  | 'esg'
  | 'documentary'
  | 'official_replay'

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  intro: 'Introduction Film',
  unboxing: 'Unboxing',
  how_to: 'How-to Guide',
  shorts: 'Shorts',
  teaser: 'Teaser',
  brand: 'Brand Campaign',
  esg: 'ESG/Sustainability',
  documentary: 'Documentary',
  official_replay: 'Official Replay',
}
```

2. Add to store:
```typescript
contentType: 'intro' as ContentType,
setContentType: (type) => set({ contentType: type }),
```

3. Add UI component (RadioGroup or Select)

---

#### Task P1-2: Add Fixed Hashtags Input Field

**Files to modify**:
- `src/store/generation-store.ts` - Add fixedHashtags state
- `src/components/generate/keywords-section.tsx` or new component

**Implementation**:

1. Add to store:
```typescript
fixedHashtags: [] as string[],
useFixedHashtags: true,
setFixedHashtags: (hashtags) => set({ fixedHashtags: hashtags }),
setUseFixedHashtags: (use) => set({ useFixedHashtags: use }),
```

2. Create UI with:
- Toggle: "Use Fixed Hashtags" vs "AI Generate"
- Multi-input field for hashtags
- Preview of final hashtag string

---

#### Task P1-3: Add Samsung Opener Patterns to Prompts

**File**: `src/lib/tuning/prompt-loader.ts`

**Add to description stage**:
```typescript
## OPENING PATTERNS (Samsung Standard)

Use ONE of these patterns based on content type:

### INTRO Content:
"This is the official introduction video for [Product Name]."
OR
"Introducing the [all-new] [Product Name]."

### HOW-TO Content:
"This is the official video guide on how to use [Feature] on [Product]."
OR
"Learn how to [action] with [Product]."

### UNBOXING Content:
"Unbox the [all-new] [Product Name] and discover what's inside."

### SHORTS Content:
[No opener - start with hook directly]

### TEASER Content:
"Something [big/new/exciting] is coming..."
```

---

#### Task P1-4: Update Prompts with Content Type Branching

**File**: `src/lib/tuning/prompt-loader.ts`

**Modify `composeStagePrompt` function**:

```typescript
export function composeStagePrompt(
  stage: string,
  basePrompt: string,
  context: {
    productName: string
    contentType?: ContentType
    videoFormat?: VideoFormat
    // ... other context
  }
): string {
  let prompt = basePrompt

  // Add content-type-specific instructions
  if (context.contentType) {
    prompt += getContentTypeTemplate(context.contentType)
  }

  // Add video-format-specific constraints
  if (context.videoFormat === 'shorts_9x16') {
    prompt += getShortsConstraints()
  }

  return prompt
}

function getContentTypeTemplate(type: ContentType): string {
  const templates: Record<ContentType, string> = {
    intro: `
## INTRO CONTENT STRUCTURE
1. Opening: "This is the official introduction video for [Product]."
2. Feature paragraph (3-4 sentences)
3. Learn more CTA with vanity link
4. Timestamps
5. Q&A section (2-3 pairs)
6. Hashtags (#GalaxyAI first, #Samsung last)
`,
    how_to: `
## HOW-TO CONTENT STRUCTURE
1. Opening: "This is the official video guide on how to use [Feature]."
2. Brief intro sentence
3. Learn more CTA
4. Timestamps
5. "Follow these simple steps to use [Feature]:"
   - Step 1: [Instruction]
   - Step 2: [Instruction]
   - Step 3: [Instruction]
6. Q&A section (2-3 pairs)
7. Hashtags
8. *Disclaimer if needed
`,
    unboxing: `
## UNBOXING CONTENT STRUCTURE
1. Opening: "Unbox the [all-new] [Product] and discover what's inside."
2. Feature highlights
3. Timestamps
4. "What's new in [Product]?"
   1. [Feature]: [Description]
   2. [Feature]: [Description]
   3. [Feature]: [Description]
5. Q&A section
6. Hashtags
`,
    shorts: `
## SHORTS CONTENT STRUCTURE
- Hook only (1-2 sentences maximum)
- No timestamps
- No Q&A
- 1-2 hashtags only: #GalaxyAI #Samsung
- Total length: Under 200 characters
`,
    // ... other types
  }

  return templates[type] || ''
}
```

---

### Phase 2: Medium Priority Features (P2)

#### Task P2-1: Add Video Format Selector

**Files to modify**:
- `src/types/geo-v2.ts` - Add VideoFormat type
- `src/store/generation-store.ts` - Add videoFormat state
- `src/components/generate/product-selector.tsx` - Add toggle UI

**Implementation**:

```typescript
// Types
export type VideoFormat = 'feed_16x9' | 'shorts_9x16'

// Store
videoFormat: 'feed_16x9' as VideoFormat,
setVideoFormat: (format) => set({ videoFormat: format }),

// UI: Simple toggle between "Feed (16:9)" and "Shorts (9:16)"
```

---

#### Task P2-2: Add SRT/Text Direct Input Option

**Files to modify**:
- `src/types/geo-v2.ts` - Add InputMethod type
- `src/store/generation-store.ts` - Add input method state
- `src/components/generate/` - Add input method selector and text area

**Implementation**:

```typescript
// Types
export type InputMethod = 'youtube_url' | 'srt_upload' | 'text_input'

// Store
inputMethod: 'youtube_url' as InputMethod,
srtContent: '',
setInputMethod: (method) => set({ inputMethod: method }),
setSrtContent: (content) => set({ srtContent: content }),

// UI: Tab-based selector
// - YouTube URL (existing)
// - SRT Upload (file input, parse and extract text)
// - Text Input (textarea for pasting)
```

**SRT Parser utility**:
```typescript
export function parseSrtContent(srtText: string): string {
  // Remove BOM if present
  const cleaned = srtText.replace(/^\uFEFF/, '')

  // Parse SRT format
  const lines = cleaned.split('\n')
  const textLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip sequence numbers (just digits)
    if (/^\d+$/.test(line)) continue

    // Skip timestamps (00:00:00,000 --> 00:00:00,000)
    if (/^\d{2}:\d{2}:\d{2}/.test(line)) continue

    // Skip empty lines
    if (!line) continue

    // This is actual content
    textLines.push(line)
  }

  return textLines.join(' ')
}
```

---

#### Task P2-3: Add Step-by-Step Template for How-to

**File**: `src/lib/tuning/prompt-loader.ts`

Already included in Task P1-4. Ensure the how_to template is properly applied.

---

### Phase 3: Lower Priority Features (P3)

#### Task P3-1: Add ESG/Documentary Categories

**Files to modify**:
- `src/components/generate/product-selector.tsx` - Add categories
- `src/lib/tuning/prompt-loader.ts` - Add category-specific prompts

**Implementation**:

```typescript
// Add to product categories
const PRODUCT_CATEGORIES = [
  // Existing...
  { id: 'esg', name: 'ESG/Sustainability', icon: '🌱' },
  { id: 'documentary', name: 'Documentary/Film', icon: '🎬' },
  { id: 'campaign', name: 'Brand Campaign', icon: '📢' },
  { id: 'accessories', name: 'Accessories', icon: '🔌' },
]

// For non-product categories, disable USP extraction
if (['esg', 'documentary', 'campaign'].includes(category)) {
  skipUSPExtraction = true
}
```

---

#### Task P3-2: Add Vanity Link Code Generator

**Files to modify**:
- `src/store/generation-store.ts` - Add vanityLinkCode state
- `src/components/generate/product-selector.tsx` - Add input field
- `src/lib/tuning/prompt-loader.ts` - Use in CTA generation

**Implementation**:

```typescript
// Store
vanityLinkCode: '',
setVanityLinkCode: (code) => set({ vanityLinkCode: code }),

// Generate CTA in prompt
const generateVanityLink = (code: string) => {
  if (!code) return ''
  return `Learn more: http://smsng.co/${code}_yt`
}

// Format examples:
// GalaxyBook5Pro_Intro
// ZFlip7_How-to
// S25_Unboxing
```

---

## Part 7: Priority Matrix

### Implementation Order

| Priority | Task | Description | Effort | Impact |
|----------|------|-------------|--------|--------|
| **P0** | P0-1 | Fix Q&A format (Q: not Q.) | Low | High |
| **P0** | P0-2 | Fix hashtag order | Low | High |
| **P1** | P1-1 | Add Content Type selector | Medium | High |
| **P1** | P1-2 | Add Fixed Hashtags field | Medium | High |
| **P1** | P1-3 | Add Samsung opener patterns | Low | Medium |
| **P1** | P1-4 | Content type branching in prompts | Medium | High |
| **P2** | P2-1 | Add Video Format selector | Low | Medium |
| **P2** | P2-2 | Add SRT/Text input option | Medium | Medium |
| **P2** | P2-3 | Step-by-step template | Low | Medium |
| **P3** | P3-1 | Add ESG/Documentary categories | Medium | Low |
| **P3** | P3-2 | Vanity link generator | Low | Low |

### Estimated Timeline

| Phase | Tasks | Complexity |
|-------|-------|------------|
| P0 | P0-1, P0-2 | Simple prompt text changes |
| P1 | P1-1 to P1-4 | UI components + prompt updates |
| P2 | P2-1 to P2-3 | UI + utility functions |
| P3 | P3-1, P3-2 | Category expansion + minor features |

### Dependencies

```
P0-1, P0-2 (no dependencies - can start immediately)
    ↓
P1-1 (Content Type) → P1-4 (Content Type branching)
P1-2 (Fixed Hashtags) - independent
P1-3 (Opener patterns) - independent
    ↓
P2-1 (Video Format) → Updates to P1-4
P2-2 (SRT Input) - independent
    ↓
P3-1, P3-2 (after core features stable)
```

---

## Appendix A: Samsung Writing Style Quick Reference

### Opening Patterns

| Content Type | Pattern |
|--------------|---------|
| Intro | "This is the official introduction video for [Product]." |
| How-to | "This is the official video guide on how to use [Feature] on [Product]." |
| Unboxing | "Unbox the [all-new] [Product] and discover what's inside." |
| Shorts | [Start with hook - no opener] |

### Q&A Format

```
Q: How do I use [feature] on [product]?
A: To use [feature], simply [instructions]. This allows you to [benefit]. [Additional context if needed].
```

### Hashtag Order

```
#GalaxyAI #[ProductName] #[Series] #Samsung
```

### Approved Emojis

```
📦 🌟 ✨ 🔍 ⌨️ 🚀 🎨 🎬 🤖 🖊️
```

---

## Appendix B: File Reference

| File Path | Purpose |
|-----------|---------|
| `src/types/geo-v2.ts` | Type definitions |
| `src/store/generation-store.ts` | State management |
| `src/lib/tuning/prompt-loader.ts` | Prompt configuration |
| `src/components/generate/product-selector.tsx` | Product/content selection UI |
| `src/components/generate/` | Generation page components |

---

## Appendix C: Testing Checklist

### P0 Verification
- [ ] Q&A output uses "Q:" and "A:" (not "Q." and "A.")
- [ ] Hashtags start with #GalaxyAI and end with #Samsung

### P1 Verification
- [ ] Content Type selector visible and functional
- [ ] Fixed Hashtags field accepts and applies custom hashtags
- [ ] Opener patterns match Samsung standard

### P2 Verification
- [ ] Video Format toggle switches output length/structure
- [ ] SRT upload parses correctly
- [ ] Text input works as expected

### P3 Verification
- [ ] ESG/Documentary categories available
- [ ] Vanity link code generates correct format

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Author**: Claude Code Analysis
