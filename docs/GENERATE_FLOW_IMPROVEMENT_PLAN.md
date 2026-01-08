# Samsung GEO Tool - /generate Flow Improvement Plan

> **Created**: January 2025
> **Purpose**: Comprehensive improvement plan for better Samsung standard alignment and UX
> **Scope**: All 4 steps of the generation flow

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Step 1: Product Selector Improvements](#step-1-product-selector-improvements)
4. [Step 2: SRT Input Improvements](#step-2-srt-input-improvements)
5. [Step 3: Keyword Selector Improvements](#step-3-keyword-selector-improvements)
6. [Step 4: Output Display Improvements](#step-4-output-display-improvements)
7. [Cross-Cutting Improvements](#cross-cutting-improvements)
8. [Priority Matrix](#priority-matrix)
9. [Implementation Tasks](#implementation-tasks)

---

## Executive Summary

### Current Gaps Identified

| Area | Gap | Impact | Priority |
|------|-----|--------|----------|
| Samsung Settings Visibility | Settings hidden for non-product content | Medium | P1 |
| Hashtag Validation | No Samsung order validation UI | High | P0 |
| Video Format Integration | Shorts format doesn't change output structure | High | P0 |
| YouTube Preview | No combined description preview | Medium | P1 |
| Q&A Format Validation | No visual validation of Q:/A: format | Medium | P1 |
| Vanity Link Auto-Suggest | No auto-generation of vanity code | Low | P2 |
| Content Type Flow | ContentType doesn't influence keyword step | Medium | P1 |

### Key Improvements Needed

1. **Consistency**: Samsung settings should be accessible across all steps
2. **Validation**: Real-time feedback on Samsung format compliance
3. **Preview**: Combined YouTube-ready output preview
4. **Integration**: Content type should influence all downstream steps

---

## Current State Analysis

### Step 1: Product Selector (`product-selector.tsx`)

**Working Features:**
- Product/category selection with icons
- Samsung Content Settings panel (contentType, videoFormat, fixedHashtags, vanityLinkCode)
- Non-product categories (ESG, Documentary, Brand Campaign)
- Template quick-load
- Brief USPs display
- Launch date content filter

**Issues Found:**

| Issue | Description | Line Reference |
|-------|-------------|----------------|
| ISS-1.1 | Samsung Content Settings hidden for non-product mode | Line 545: `{categoryId && !isNonProductMode && (...)}` |
| ISS-1.2 | No hashtag order validation (should warn if not #GalaxyAI first, #Samsung last) | Lines 616-622 |
| ISS-1.3 | Vanity link code not auto-suggested from productName + contentType | Lines 641-650 |
| ISS-1.4 | No visual count indicator for fixed hashtags (3-5 recommended) | Lines 594-631 |
| ISS-1.5 | Video format selection doesn't show format-specific hints | Lines 573-591 |

### Step 2: SRT Input (`srt-input.tsx`)

**Working Features:**
- 3-tab interface (YouTube URL, SRT Upload, Text Input)
- SRT validation with word count, segment count, duration stats
- Parse error and warning display
- Content preview

**Issues Found:**

| Issue | Description | Line Reference |
|-------|-------------|----------------|
| ISS-2.1 | YouTube URL doesn't actually extract subtitles (placeholder only) | Lines 255-270 |
| ISS-2.2 | No content-type-specific hints (e.g., "Shorts content should be brief") | Throughout |
| ISS-2.3 | Plain text mode doesn't strip SRT timestamps for text-only input | Line 317 |
| ISS-2.4 | No indicator showing videoFormat affects expected content length | Throughout |

### Step 3: Keyword Selector (`keyword-selector.tsx`)

**Working Features:**
- Grounding search (Google, Reddit signals)
- Brief USPs display with priority marking
- Keyword selection (max 3) with checkboxes
- Source tier badges (Official, Tech Media, Community, Other)
- Grounding insights summary
- Save as template functionality

**Issues Found:**

| Issue | Description | Line Reference |
|-------|-------------|----------------|
| ISS-3.1 | No display of fixed hashtags from Step 1 | Not present |
| ISS-3.2 | Content type doesn't influence keyword recommendations | Throughout |
| ISS-3.3 | No option to add custom keywords beyond grounding/brief | Lines 331-370 |
| ISS-3.4 | Samsung Content Settings summary not visible | Not present |

### Step 4: Output Display (`output-display.tsx`)

**Working Features:**
- Section cards (Description, Timestamps, Hashtags, FAQ)
- Copy buttons per section
- Export dropdown (YouTube, Markdown, TXT, JSON)
- Save as draft/confirmed
- Generation breakdown with quality scores
- Regeneration with focus areas
- A/B Compare functionality
- Share with unique link

**Issues Found:**

| Issue | Description | Line Reference |
|-------|-------------|----------------|
| ISS-4.1 | No Samsung format compliance indicators | Throughout |
| ISS-4.2 | Hashtags don't show order validation (#GalaxyAI first check) | Lines 686-713 |
| ISS-4.3 | No combined YouTube-ready preview | Not present |
| ISS-4.4 | Q&A format not visually validated (Q:/A: format check) | Lines 716-738 |
| ISS-4.5 | Vanity link not displayed in description | Lines 640-662 |
| ISS-4.6 | No indicator showing if fixed vs AI-generated hashtags | Lines 686-713 |
| ISS-4.7 | Shorts output should hide timestamps/FAQ sections | Throughout |

### Generation Progress (`generation-progress.tsx`)

**Working Features:**
- Step-by-step progress with icons
- Progress bar with percentage
- Stage completion indicators

**Issues Found:**

| Issue | Description | Line Reference |
|-------|-------------|----------------|
| ISS-5.1 | Steps order doesn't match actual API pipeline | Lines 27-35 |
| ISS-5.2 | No real-time updates (simulation only) | Lines 56-94 |
| ISS-5.3 | Doesn't show Samsung-specific stages | Throughout |

---

## Step 1: Product Selector Improvements

### IMP-1.1: Show Samsung Settings for Non-Product Content
**Priority**: P1 | **Effort**: Low

**Current**: Samsung Content Settings only show when `categoryId && !isNonProductMode`

**Proposed**: Always show Samsung Content Settings, with contextual adjustments

```tsx
// Remove the conditional wrapper
// Show Samsung Content Settings for ALL content types
{(categoryId || isNonProductMode) && (
  <div className="p-4 rounded-lg bg-blue-50/50 ...">
    <h3>Samsung Content Settings</h3>
    // Content Type (auto-set for non-product but editable)
    // Video Format (always shown)
    // Fixed Hashtags (always shown)
    // Vanity Link (always shown)
  </div>
)}
```

### IMP-1.2: Add Hashtag Order Validation
**Priority**: P0 | **Effort**: Medium

**Add real-time validation with visual feedback:**

```tsx
// Validate hashtag order
const validateHashtagOrder = (hashtags: string[]): { valid: boolean; issues: string[] } => {
  const issues: string[] = []

  if (hashtags.length > 0 && !hashtags[0].includes('GalaxyAI')) {
    issues.push('#GalaxyAI should be first (if AI features present)')
  }

  if (hashtags.length > 0 && !hashtags[hashtags.length - 1].includes('Samsung')) {
    issues.push('#Samsung should always be last')
  }

  if (hashtags.length < 3 || hashtags.length > 5) {
    issues.push(`Use 3-5 hashtags (currently ${hashtags.length})`)
  }

  return { valid: issues.length === 0, issues }
}

// UI: Show validation status below input
{fixedHashtags.length > 0 && (
  <div className={cn(
    "mt-2 p-2 rounded text-xs",
    hashtagValidation.valid ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
  )}>
    {hashtagValidation.valid ? (
      <span><CheckCircle /> Samsung order compliant</span>
    ) : (
      <ul>{hashtagValidation.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>
    )}
  </div>
)}
```

### IMP-1.3: Auto-Suggest Vanity Link Code
**Priority**: P2 | **Effort**: Low

**Auto-generate suggestion based on product name and content type:**

```tsx
// Auto-suggest vanity link code
useEffect(() => {
  if (productName && contentType && !vanityLinkCode) {
    const suggestion = `${productName.replace(/\s+/g, '')}${contentType === 'intro' ? '_Intro' : contentType === 'how_to' ? '_How-to' : `_${contentType}`}`
    setVanityLinkCode(suggestion)
  }
}, [productName, contentType])

// Add "Auto-suggest" button
<Button variant="ghost" size="sm" onClick={autoSuggestVanityCode}>
  Auto-suggest
</Button>
```

### IMP-1.4: Video Format Hints
**Priority**: P1 | **Effort**: Low

**Show format-specific guidance:**

```tsx
{videoFormat === 'shorts_9x16' && (
  <div className="mt-2 p-2 rounded bg-amber-50 text-amber-700 text-xs">
    <Info className="h-3 w-3 inline mr-1" />
    Shorts format: Output will be brief (under 200 chars), no timestamps, 1-2 hashtags only
  </div>
)}
```

---

## Step 2: SRT Input Improvements

### IMP-2.1: Content Type Guidance
**Priority**: P1 | **Effort**: Low

**Show content-type-specific hints:**

```tsx
// Add at top of SrtInput component
const contentType = useGenerationStore((state) => state.contentType)
const videoFormat = useGenerationStore((state) => state.videoFormat)

// Show contextual hint
<div className="mb-4 p-3 rounded-lg bg-muted/50 border text-sm">
  <div className="flex items-center gap-2 font-medium">
    <Info className="h-4 w-4" />
    Content Guidelines for {CONTENT_TYPE_LABELS[contentType]}
  </div>
  <p className="text-muted-foreground mt-1">
    {videoFormat === 'shorts_9x16'
      ? 'Shorts: Keep content brief. AI will generate a 1-2 sentence hook only.'
      : contentType === 'how_to'
      ? 'How-to: Include clear steps in your transcript for best results.'
      : 'Standard content: Full description with timestamps and Q&A will be generated.'}
  </p>
</div>
```

### IMP-2.2: Word Count Adaptation
**Priority**: P1 | **Effort**: Low

**Adjust word count recommendations based on video format:**

```tsx
// Dynamic minimums based on format
const getMinWordCount = (videoFormat: VideoFormat) => {
  return videoFormat === 'shorts_9x16' ? 20 : 50
}

const getRecommendedWordCount = (videoFormat: VideoFormat) => {
  return videoFormat === 'shorts_9x16' ? 50 : 200
}
```

---

## Step 3: Keyword Selector Improvements

### IMP-3.1: Show Samsung Settings Summary
**Priority**: P1 | **Effort**: Medium

**Add Samsung settings summary card:**

```tsx
// Add Samsung Settings Summary Card
const contentType = useGenerationStore((state) => state.contentType)
const videoFormat = useGenerationStore((state) => state.videoFormat)
const fixedHashtags = useGenerationStore((state) => state.fixedHashtags)

<Card className="mb-4 border-blue-200 bg-blue-50/50">
  <CardHeader className="pb-2">
    <CardTitle className="text-sm flex items-center gap-2">
      <Settings className="h-4 w-4" />
      Samsung Content Settings
    </CardTitle>
  </CardHeader>
  <CardContent className="text-sm space-y-1">
    <div className="flex items-center gap-2">
      <Badge variant="outline">{CONTENT_TYPE_LABELS[contentType]}</Badge>
      <Badge variant="outline">{VIDEO_FORMAT_LABELS[videoFormat]}</Badge>
    </div>
    {fixedHashtags.length > 0 && (
      <div className="text-xs text-muted-foreground">
        Fixed hashtags: {fixedHashtags.join(' ')}
      </div>
    )}
  </CardContent>
</Card>
```

### IMP-3.2: Add Custom Keyword Input
**Priority**: P2 | **Effort**: Medium

**Allow users to add custom keywords:**

```tsx
// Add custom keyword input
const [customKeyword, setCustomKeyword] = useState('')

<div className="flex gap-2 mt-4">
  <Input
    value={customKeyword}
    onChange={(e) => setCustomKeyword(e.target.value)}
    placeholder="Add custom keyword..."
    className="flex-1"
  />
  <Button
    variant="outline"
    onClick={() => {
      if (customKeyword && selectedKeywords.length < 3) {
        toggleKeyword(customKeyword)
        setCustomKeyword('')
      }
    }}
    disabled={!customKeyword || selectedKeywords.length >= 3}
  >
    Add
  </Button>
</div>
```

---

## Step 4: Output Display Improvements

### IMP-4.1: Add Samsung Compliance Indicators
**Priority**: P0 | **Effort**: Medium

**Add visual compliance badges:**

```tsx
// Samsung Compliance Section
const samsungCompliance = useMemo(() => {
  const checks = []

  // Q&A format check
  const qaValid = faq.split('\n').every(line =>
    !line.trim() || line.startsWith('Q:') || line.startsWith('A:') || !line.match(/^[QA][.:]/)
  )
  checks.push({ label: 'Q&A Format', valid: qaValid, tip: 'Using Q: and A: with colon' })

  // Hashtag order check
  const hashtagOrderValid = hashtags.length === 0 ||
    (hashtags[0]?.includes('GalaxyAI') || !hashtags.some(h => h.includes('GalaxyAI'))) &&
    hashtags[hashtags.length - 1]?.includes('Samsung')
  checks.push({ label: 'Hashtag Order', valid: hashtagOrderValid, tip: '#GalaxyAI first, #Samsung last' })

  // Hashtag count check
  const hashtagCountValid = hashtags.length >= 3 && hashtags.length <= 5
  checks.push({ label: 'Hashtag Count', valid: hashtagCountValid, tip: '3-5 hashtags (Samsung standard)' })

  return checks
}, [faq, hashtags])

// Display compliance badges
<div className="flex flex-wrap gap-2 mb-4">
  {samsungCompliance.map((check, i) => (
    <Badge
      key={i}
      variant={check.valid ? "default" : "destructive"}
      className="gap-1"
    >
      {check.valid ? <Check className="h-3 w-3" /> : <Warning className="h-3 w-3" />}
      {check.label}
    </Badge>
  ))}
</div>
```

### IMP-4.2: Add Combined YouTube Preview
**Priority**: P1 | **Effort**: Medium

**Add a "YouTube Preview" tab showing combined output:**

```tsx
// Add YouTube Preview Card
<Card>
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="text-base flex items-center gap-2">
        <YoutubeLogo className="h-4 w-4" />
        YouTube Ready Preview
      </CardTitle>
      <CopyButton text={youtubeReadyContent} label="YouTube Description" />
    </div>
  </CardHeader>
  <CardContent>
    <div className="p-4 rounded-lg bg-muted/50 border font-mono text-sm max-h-[400px] overflow-y-auto">
      <pre className="whitespace-pre-wrap">
        {description}
        {vanityLinkCode && `\n\nLearn more: http://smsng.co/${vanityLinkCode}_yt`}
        {timestamps && `\n\n${timestamps}`}
        {faq && `\n\n${faq}`}
        {hashtags.length > 0 && `\n\n${hashtags.join(' ')}`}
      </pre>
    </div>
    <p className="text-xs text-muted-foreground mt-2">
      Character count: {youtubeReadyContent.length} / 5000
    </p>
  </CardContent>
</Card>
```

### IMP-4.3: Show Fixed vs AI Hashtags Indicator
**Priority**: P1 | **Effort**: Low

**Show badge indicating hashtag source:**

```tsx
const useFixedHashtags = useGenerationStore((state) => state.useFixedHashtags)

// In Hashtags Card Header
<CardTitle className="text-base flex items-center gap-2">
  <Hash className="h-4 w-4" />
  Hashtags
  <Badge variant="outline" className="text-xs">
    {useFixedHashtags ? 'Fixed' : 'AI Generated'}
  </Badge>
</CardTitle>
```

### IMP-4.4: Conditional Sections for Shorts
**Priority**: P1 | **Effort**: Low

**Hide timestamps and FAQ for Shorts format:**

```tsx
const videoFormat = useGenerationStore((state) => state.videoFormat)

// Only show timestamps for Feed format
{videoFormat !== 'shorts_9x16' && timestamps && (
  // Timestamps Card
)}

// Only show FAQ for Feed format
{videoFormat !== 'shorts_9x16' && faq && (
  // FAQ Card
)}
```

---

## Cross-Cutting Improvements

### IMP-X.1: Add Wizard Progress Summary
**Priority**: P1 | **Effort**: Medium

**Add a persistent summary sidebar showing selections:**

```tsx
// In generate/page.tsx - add sidebar summary
<div className="lg:col-span-1 space-y-4">
  <Card className="sticky top-4">
    <CardHeader>
      <CardTitle className="text-sm">Generation Summary</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 text-sm">
      {productName && (
        <div><Label>Product:</Label> {productName}</div>
      )}
      {contentType && (
        <div><Label>Type:</Label> {CONTENT_TYPE_LABELS[contentType]}</div>
      )}
      {videoFormat && (
        <div><Label>Format:</Label> {VIDEO_FORMAT_LABELS[videoFormat]}</div>
      )}
      {selectedKeywords.length > 0 && (
        <div><Label>Keywords:</Label> {selectedKeywords.join(', ')}</div>
      )}
      {fixedHashtags.length > 0 && (
        <div><Label>Hashtags:</Label> {fixedHashtags.length} fixed</div>
      )}
    </CardContent>
  </Card>
</div>
```

### IMP-X.2: Add Validation Before Generation
**Priority**: P0 | **Effort**: Medium

**Validate Samsung compliance before generation:**

```tsx
// In handleGenerate function
const validateBeforeGeneration = () => {
  const issues: string[] = []

  if (useFixedHashtags && fixedHashtags.length > 0) {
    if (fixedHashtags.length < 3 || fixedHashtags.length > 5) {
      issues.push(`Hashtag count (${fixedHashtags.length}) should be 3-5`)
    }
    if (!fixedHashtags[fixedHashtags.length - 1]?.includes('Samsung')) {
      issues.push('Last hashtag should be #Samsung')
    }
  }

  if (videoFormat === 'shorts_9x16' && srtContent.length > 1000) {
    issues.push('Shorts content may be too long - consider shorter transcript')
  }

  return issues
}

// Show confirmation dialog if issues found
const issues = validateBeforeGeneration()
if (issues.length > 0) {
  const proceed = await confirmDialog({
    title: 'Samsung Standard Recommendations',
    message: issues.join('\n'),
    confirmLabel: 'Generate Anyway',
    cancelLabel: 'Fix Issues'
  })
  if (!proceed) return
}
```

---

## Priority Matrix

### P0 - Critical (Immediate)

| Task ID | Description | Effort | Files |
|---------|-------------|--------|-------|
| IMP-1.2 | Hashtag order validation UI | Medium | product-selector.tsx |
| IMP-4.1 | Samsung compliance indicators | Medium | output-display.tsx |
| IMP-X.2 | Validation before generation | Medium | page.tsx |

### P1 - High Priority (This Sprint)

| Task ID | Description | Effort | Files |
|---------|-------------|--------|-------|
| IMP-1.1 | Show Samsung settings for non-product | Low | product-selector.tsx |
| IMP-1.4 | Video format hints | Low | product-selector.tsx |
| IMP-2.1 | Content type guidance in SRT input | Low | srt-input.tsx |
| IMP-2.2 | Adaptive word count for Shorts | Low | srt-input.tsx |
| IMP-3.1 | Samsung settings summary in keyword step | Medium | keyword-selector.tsx |
| IMP-4.2 | Combined YouTube preview | Medium | output-display.tsx |
| IMP-4.3 | Fixed vs AI hashtags indicator | Low | output-display.tsx |
| IMP-4.4 | Conditional sections for Shorts | Low | output-display.tsx |
| IMP-X.1 | Wizard progress summary sidebar | Medium | page.tsx |

### P2 - Medium Priority (Next Sprint)

| Task ID | Description | Effort | Files |
|---------|-------------|--------|-------|
| IMP-1.3 | Auto-suggest vanity link code | Low | product-selector.tsx |
| IMP-3.2 | Custom keyword input | Medium | keyword-selector.tsx |

### P3 - Nice to Have (Backlog)

| Task ID | Description | Effort | Files |
|---------|-------------|--------|-------|
| IMP-2.1 | YouTube subtitle extraction | High | srt-input.tsx, API |
| IMP-5.1 | Real-time generation progress | High | generation-progress.tsx, API |

---

## Implementation Tasks

### Phase 1: P0 Tasks (Critical)

#### Task P0-1: Add Hashtag Order Validation UI
- **File**: `src/components/features/product-selector.tsx`
- **Changes**:
  1. Add `validateHashtagOrder` function
  2. Add validation UI below fixed hashtags input
  3. Show green checkmark or amber warning based on compliance
- **Acceptance Criteria**:
  - Validation runs on every hashtag change
  - Shows specific issues (count, order)
  - Samsung order compliance is visually clear

#### Task P0-2: Add Samsung Compliance Indicators
- **File**: `src/components/features/output-display.tsx`
- **Changes**:
  1. Add compliance calculation logic
  2. Add compliance badges above output sections
  3. Check Q&A format, hashtag order, hashtag count
- **Acceptance Criteria**:
  - Shows compliance status for each Samsung standard
  - Invalid items are highlighted
  - User understands what needs fixing

#### Task P0-3: Add Validation Before Generation
- **File**: `src/app/(dashboard)/generate/page.tsx`
- **Changes**:
  1. Add `validateBeforeGeneration` function
  2. Show confirmation dialog if issues found
  3. Allow user to proceed or go back
- **Acceptance Criteria**:
  - Validation covers all Samsung standards
  - User can choose to proceed or fix
  - Issues are clearly explained

### Phase 2: P1 Tasks (High Priority)

#### Task P1-1: Show Samsung Settings for All Content Types
- **File**: `src/components/features/product-selector.tsx`
- **Changes**:
  1. Update conditional rendering logic
  2. Show Samsung settings for non-product categories
  3. Auto-set content type but allow editing
- **Acceptance Criteria**:
  - Samsung settings visible for ESG/Documentary/Brand
  - Content type auto-selected but editable
  - All fields functional

#### Task P1-2: Add Content Type Guidance to SRT Input
- **File**: `src/components/features/srt-input.tsx`
- **Changes**:
  1. Import contentType and videoFormat from store
  2. Add contextual guidance banner
  3. Adjust word count recommendations
- **Acceptance Criteria**:
  - Shows Shorts-specific guidance when applicable
  - Word count minimums adjusted for format
  - How-to content shows step-related tips

#### Task P1-3: Add Samsung Settings Summary to Keyword Step
- **File**: `src/components/features/keyword-selector.tsx`
- **Changes**:
  1. Import Samsung settings from store
  2. Add summary card at top
  3. Show fixed hashtags preview
- **Acceptance Criteria**:
  - All Samsung settings visible
  - Fixed hashtags displayed
  - Read-only summary (edit in step 1)

#### Task P1-4: Add Combined YouTube Preview
- **File**: `src/components/features/output-display.tsx`
- **Changes**:
  1. Add new YouTube Preview Card
  2. Combine all sections in correct order
  3. Add character count
  4. Add copy button for combined content
- **Acceptance Criteria**:
  - Shows complete YouTube description
  - Includes vanity link if set
  - Character count displayed
  - One-click copy

#### Task P1-5: Add Conditional Sections for Shorts
- **File**: `src/components/features/output-display.tsx`
- **Changes**:
  1. Import videoFormat from store
  2. Conditionally render timestamps section
  3. Conditionally render FAQ section
  4. Show "Shorts format" indicator
- **Acceptance Criteria**:
  - Shorts output only shows description + hashtags
  - Feed format shows all sections
  - Clear indicator of format used

---

## Success Metrics

### User Experience
- [ ] Time to complete generation reduced by 20%
- [ ] Samsung format compliance rate > 95%
- [ ] User confusion reduced (fewer support requests)

### Samsung Alignment
- [ ] All outputs follow Q: A: format
- [ ] All outputs have correct hashtag order
- [ ] Shorts outputs are properly brief
- [ ] Vanity links included when specified

### Quality
- [ ] Zero format validation errors in output
- [ ] Content type matches template structure
- [ ] Fixed hashtags used when enabled

---

## Appendix: Component Dependency Map

```
/generate (page.tsx)
├── Step 1: ProductSelector
│   ├── Category selection
│   ├── Product selection
│   ├── Samsung Content Settings (P1)
│   │   ├── Content Type
│   │   ├── Video Format
│   │   ├── Fixed Hashtags + Validation (P0)
│   │   └── Vanity Link Code
│   └── Template loading
│
├── Step 2: SrtInput
│   ├── Input method tabs
│   ├── Content type guidance (P1)
│   └── SRT validation
│
├── Step 3: KeywordSelector
│   ├── Samsung Settings Summary (P1)
│   ├── Brief USPs
│   ├── Grounding results
│   └── Keyword selection
│
└── Step 4: OutputDisplay
    ├── Samsung Compliance Badges (P0)
    ├── YouTube Preview (P1)
    ├── Description
    ├── Timestamps (conditional)
    ├── Hashtags + indicator
    ├── FAQ (conditional)
    └── Actions (save, export, share)
```

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Author**: Claude Code Analysis
