# Samsung GEO/AEO Optimization Tool
## Comprehensive Product Specification

---

# PART 1: BUSINESS CONTEXT

## 1.1 The Problem

Samsung Electronics' Global Marketing Center (GMC) at Suwon HQ faces a critical challenge:

**The Rise of AI Search Engines (2025 Research-Backed)**

The search landscape has fundamentally shifted:
- **Google AI Overviews** now appear in 47% of searches (up from 7% in early 2024)
- **Featured snippets dropped 83%** - replaced by AI Overviews
- **AI Overviews cite 5-15 sources** vs. 1 source in traditional snippets
- **ChatGPT citations**: Wikipedia dominates (47.9% of all citations)
- **Gemini/Perplexity citations**: Reddit heavily weighted for user discussions

Traditional SEO (keywords, backlinks) is being supplemented/replaced by:
- **AEO** (Answer Engine Optimization): Optimizing for AI-generated answers
- **GEO** (Generative Engine Optimization): Optimizing for generative AI citations

**Key Insight**: Content must now be optimized for **extraction by AI**, not just ranking.

**Samsung's Current State (from transcript)**
> "아무런 대책이 없었던거죠" (They had no countermeasures)
> "디스크립션 지금 거지같이 되있기 때문에" (Descriptions are currently garbage)

Current problems:
1. YouTube descriptions often just copy video captions
2. No systematic approach to keyword optimization
3. Decisions based on "뇌피셜" (gut feeling) rather than data
4. Manual process is too slow - team can't check everything
5. No evidence to support keyword/feature prioritization decisions

**The Trigger**
> "본부장이 팀장에게 요구하는 순간" (When the division head demanded answers from the team leader)

Leadership asked: "GEO/AEO is hot right now - what's our strategy?" The team had nothing.

---

## 1.2 The Users

### Primary User: Content Upload Specialist
- **Role**: 삼성전자 GMC 담당자 (Samsung GMC content managers)
- **Daily Task**: Upload videos to YouTube and Instagram for Samsung products
- **Pain Points**:
  - Writing descriptions takes too long
  - Don't know which features to emphasize
  - No way to verify if their choices are correct
  - Multiple people might work on same content unknowingly

### Secondary User: Team Lead
- **Role**: Oversees content team
- **Needs**:
  - Visibility into what team members are working on
  - Ability to confirm/approve final versions
  - Evidence to justify decisions to leadership

### Stakeholder: Division Leadership
- **Need**: Proof that GEO/AEO strategy is working
- **Want**: Data-driven justification for marketing priorities

---

## 1.3 The Organizational Context

### Samsung's Content Creation Pipeline

```
제일기획 (Cheil Worldwide) → Creates ads based on brief
         ↓
삼성전자 GMC → Uploads to YouTube/Instagram
         ↓
This Tool → Optimizes descriptions for AI engines
```

### The Brief System

**Critical Understanding**: Samsung operates on a "Brief" system:

1. **One Brief Per Product/Campaign**
   - Example: Galaxy S25 gets ONE brief for entire launch
   - Brief contains USP priorities: "Camera #1, AI Features #2, Design #3"
   - All advertising follows this brief

2. **Brief Timeline**
   - Briefs come out ~3 months before product launch
   - Information is often incomplete/preliminary
   - Features can be cut (e.g., Note 10 pen gesture feature was cut 2 months before launch)

3. **Brief vs Reality Gap**
   > "삼성전자에서 매번 스마트폰을 낼때 미는 피처가 있어요... 근데 그런 기능들이 의외로 커뮤니티에서는 회자가 많이 안되거든요"
   > (Samsung pushes certain features each launch... but those features often don't get discussed much in communities)

   Samsung's marketing priorities often don't match what users actually care about.

---

## 1.4 Why This Tool Matters

### The Grounding Concept

**Grounding** = Using real-world data to validate which features users actually care about

**How it works**:
1. Product launches (e.g., Galaxy Z Flip 7)
2. Wait ~1 week for web content to accumulate
3. Analyze Reddit, blogs, YouTube reviews, Google results
4. Extract which features are being discussed most
5. Compare against Samsung's official brief priorities
6. Let user make informed decision on which keywords to prioritize

**Why this is powerful**:
> "그라운딩을 하는 이유 자체는 그 구글에서 얼마나 어떤 콘텐츠에 사람들이 반응하느냐를 역으로 판단할 수 있는 거잖아요"
> (The reason for grounding is to inversely determine how people are reacting to content on Google)

If something appears in AI search results → AI determined it's highly cited → People care about it

### Evidence for Decision Making

**Before**:
- "We should push Camera because... we think so"
- Only evidence: Google Trends, internal survey of 10,000 panelists

**After**:
- "We should push Camera because it's #1 in grounding results"
- "Here's the data from Reddit/YouTube/blogs showing user interest"
- Provides ammunition for internal discussions and approvals

---

## 1.5 GEO/AEO Best Practices (Research-Backed 2025)

### Critical Success Factors for AI Visibility

Based on 2025 research into how AI engines cite and extract content:

#### 1. First 40-60 Words Are Critical
AI models heavily weight the opening content:
- **ChatGPT**: Extracts opening paragraph for summarization
- **Perplexity**: Prioritizes first few sentences for citations
- **Google AI**: Scans first ~60 words for relevance signals

**Implication**: YouTube descriptions must front-load key product info and keywords.

#### 2. E-E-A-T Signals (Updated from E-A-T)
Google's updated quality criteria now includes **Experience**:
- **Experience**: First-hand or life experience with topic
- **Expertise**: Knowledge/skill in the subject
- **Authoritativeness**: Reputation as go-to source
- **Trustworthiness**: Accuracy, honesty, safety

**Implication**: Descriptions should include Samsung-specific expertise signals and product specifications.

#### 3. Reddit Citation Dominance
Research shows Reddit is heavily cited by AI engines:
- **Gemini**: Reddit threads frequently cited for user opinions
- **Perplexity**: Values authentic user discussions
- **ChatGPT**: References Reddit for product comparisons

**Implication**: Grounding should weight Reddit discussions heavily; FAQ generation should address Reddit-surfaced questions.

#### 4. Structured Data / Schema Markup
AI engines prefer structured, extractable content:
- **FAQ Schema**: Q&A pairs are easily parsed
- **HowTo Schema**: Step-by-step instructions
- **Product Schema**: Specifications, prices, features

**Implication**: Generated content should follow FAQ format for pinned comments; timestamps create implicit structure.

#### 5. Conversational Query Optimization
AI searches are more natural language:
- "What's the best camera phone 2025?" vs "best camera phone 2025"
- "How long does Galaxy S25 battery last?" vs "Galaxy S25 battery"

**Implication**: FAQ questions should match conversational query patterns.

#### 6. Multi-Source Citation Strategy
AI Overviews cite 5-15 sources vs. 1 for featured snippets:
- Being THE source is less important than being ONE of the sources
- Consistent messaging across touchpoints matters

**Implication**: Description, timestamps, hashtags, FAQ all need aligned keyword strategy.

---

# PART 2: FEATURE DEEP-DIVE

## 2.1 Feature: Product Selection

### What
User selects which Samsung product they're creating content for.

### Why
- Loads the correct Brief (knowledge base)
- Determines grounding search queries
- Organizes activity logs

### Structure (from transcript)

```
품목 (Category)
├── Mobile
│   ├── Galaxy S Series
│   │   ├── Galaxy S25
│   │   ├── Galaxy S25+
│   │   └── Galaxy S25 Ultra
│   ├── Galaxy Z Series
│   │   ├── Galaxy Z Flip 7
│   │   └── Galaxy Z Fold 7
│   └── Galaxy A Series
├── Watch
│   ├── Galaxy Watch 7
│   └── Galaxy Watch Ultra
├── Ring
│   └── Galaxy Ring 2
├── Earbuds
│   └── Galaxy Buds 3
├── Laptop
│   └── Galaxy Book 5
└── XR
    └── (Future products)
```

### Key Insight
> "MX본부만 한다" (Only MX division for now)

MX = Mobile eXperience division. All these products fall under MX. Future expansion would follow samsung.com structure for organizational alignment.

### Design Decision
- Show category cards first (Mobile, Watch, etc.)
- Then dropdown for specific product
- Campaign tag field (free text) for additional organization

---

## 2.2 Feature: Content Input

### What
User provides the video content to be optimized.

### Inputs Required

| Input | Source | Purpose |
|-------|--------|---------|
| SRT File | User upload or paste | Primary content for analysis |
| Video URL | YouTube link | Extract existing metadata, title |
| Product Name | Auto-filled from selection | For grounding queries |

### Why SRT File?

> "srt 파일이랑 그들이 가지고 있는 가이드를 넣는게 나은 것 같아요"
> (It's better to input SRT file and their guides)

SRT files contain:
- Timestamped transcript of video
- Actual spoken content
- Timing information for chapters

**Not using**: Video analysis (vision AI)
> "유튜브 영상을 분석을 안해도 된다" (Don't need to analyze YouTube video content)

Video analysis is:
- Computationally expensive
- Unnecessary - text/descriptions contain enough info
- SRT already has the spoken content

### Why Video URL?

Extracts:
- Current title (contains product name)
- Current description (for comparison/reference)
- Video ID for tracking

**Not using**: Comments from Samsung's own videos
- Comments are mostly negative
- Samsung ignores negative feedback anyway
- Grounding uses EXTERNAL sources instead

---

## 2.3 Feature: Grounding System

### What
Analyzes external web content to determine which product features users actually care about.

### Data Sources (Research-Based Priority Weighting)

Based on 2025 GEO research on AI citation patterns:

| Source | Weight | Why | What We Extract |
|--------|--------|-----|-----------------|
| **Reddit** | 🔴 HIGH (3x) | Gemini/Perplexity heavily cite Reddit; authentic user discussions | Feature mentions, real questions, complaints |
| Google Search | 🟡 MEDIUM (2x) | Primary discovery, AI Overview sources | Top results for product queries |
| YouTube Reviewers | 🟡 MEDIUM (2x) | Expert opinions indexed by AI | Description text, NOT video content |
| Tech Blogs | 🟢 STANDARD (1x) | Reviews and comparisons | Feature coverage, comparisons |
| PR Articles | 🟢 STANDARD (1x) | Launch coverage | Initial reactions |

**Reddit Weighting Rationale**:
Research shows Reddit accounts for significant AI citations:
- Perplexity frequently cites r/Android, r/samsung, r/GalaxyS discussions
- Gemini surfaces Reddit threads for "real user" perspectives
- Questions asked on Reddit = questions users will ask AI

### Grounding Algorithm

```
1. Search Google Custom Search for "[Product Name] review/features"
2. Search Reddit API for "[Product Name]" in r/Android, r/samsung, r/GalaxyS
3. Extract mentioned features/keywords from each source
4. Apply source weights (Reddit 3x, Google/YouTube 2x, Blogs 1x)
5. Rank keywords by weighted mention frequency
6. Return top 10 keywords with source attribution
```

### Why NOT These Sources

| Source | Reason to Exclude |
|--------|-------------------|
| YouTube Comments | Mostly negative, Samsung ignores anyway |
| TikTok | Different algorithm, trend-based, not feature-based |
| Samsung's own content | Circular - we're trying to IMPROVE this |
| Pre-launch speculation | Unreliable, often wrong |
| Twitter/X | Lower AI citation rate, noisy signal |

### Timing Consideration

> "오픈 후에 그라운딩을 한번 하고" (Do grounding after [product] opens)

**Recommendation**: Wait ~1 week after product launch
- Day 1: PR flood, but limited user reactions
- Day 2-7: Reviews come out, Reddit discussions start
- Week 2+: Rich data for grounding

**Edge Case**: User runs grounding immediately after launch
- System still works
- May return fewer results
- Brief USPs become more important as fallback

### Output Format (Enhanced for GEO)

```json
{
  "keywords": [
    {
      "term": "카메라",
      "rank": 1,
      "weighted_score": 141,
      "raw_mentions": 47,
      "sources": ["reddit", "youtube", "blogs"],
      "source_breakdown": {
        "reddit": 30,    // 30 mentions × 3x weight = 90
        "youtube": 12,   // 12 mentions × 2x weight = 24
        "blogs": 5       // 5 mentions × 1x weight = 5
      }
    }
  ],
  "questions_from_sources": [
    // Real questions users asked on Reddit/forums
    "Galaxy S25 Ultra 배터리 하루 버티나요?",
    "200MP 카메라 실제로 200MP로 찍히나요?",
    "전작이랑 카메라 차이 체감 되나요?"
  ],
  "raw_sources": [
    {
      "url": "https://reddit.com/r/samsung/...",
      "title": "S25 Ultra First Impressions",
      "snippet": "...",
      "source_type": "reddit",
      "weight": 3
    }
  ],
  "ai_citation_potential": {
    // Estimate likelihood of AI engines citing this topic
    "perplexity_score": 0.85,  // Based on Reddit presence
    "chatgpt_score": 0.72,      // Based on web presence
    "google_ai_score": 0.78     // Based on overall coverage
  }
}
```

### Reddit Question Extraction

Special processing for Reddit sources:
1. Extract actual question posts (titles ending in "?")
2. Extract top questions from comment threads
3. Map questions to FAQ generation input
4. Weight questions by upvote count

---

## 2.4 Feature: Keyword Selection

### What
User chooses which keywords to prioritize (max 3) for content generation.

### The Comparison View

```
┌─────────────────────────────────────────────────────┐
│  Brief USPs              Grounding Results          │
│  (Samsung's priorities)  (User interest)            │
│                                                     │
│  1. 카메라 ──────────────── 카메라 .1               │
│  2. AI 기능                 배터리 .2               │
│  3. 디자인                  원핸드 그립 .3          │
│                                                     │
│  [Selected: 카메라, 배터리]                         │
└─────────────────────────────────────────────────────┘
```

### Why This Matters

> "브리프에는 카메라로 들어가 있는데 그라운딩에서는 배터리로 나올 수 있잖아요"
> (Brief might say Camera, but grounding might show Battery)

This is the core value proposition:
- Samsung says "push Camera"
- Users actually care about "Battery"
- User can now make INFORMED choice to include both

### Decision Authority

> "그거에 대한 판단은 온전히... 사람은 하긴 해야되요. 의사결정"
> (That judgment... humans still need to make the decision)

The tool DOES NOT auto-decide. It provides:
1. Brief priorities (Samsung's official stance)
2. Grounding results (real user interest)
3. User selects final keywords

**Why human decision?**
- Samsung may have strategic reasons for certain priorities
- Legal/compliance considerations
- Launch timing strategies
- Cross-product portfolio management

### Combination Allowed

> "합해도 돼요" (Combining is fine)

User can select:
- Only Brief keywords
- Only Grounding keywords
- Mix of both

---

## 2.5 Feature: Content Generation

### What
AI generates optimized content based on SRT, selected keywords, and playbook.

### Outputs

| Output | Purpose | Destination |
|--------|---------|-------------|
| Description | Main YouTube description | Copy to YouTube |
| Timestamps | Chapter markers | Copy to YouTube |
| Hashtags | Discovery tags | Copy to YouTube/Instagram |
| FAQ | Common questions + answers | Pinned comment |

### Why These Specific Outputs?

**Description**
> "디스크립션 점수를 주는 게 맞는 것 같아요" (Scoring the description makes sense)

The description is the primary SEO/GEO target. Contains:
- Product information
- Keywords for AI to index
- Structured content for featured snippets

**Timestamps**
> "타임 스탬프" (Timestamps)

YouTube chapters improve:
- User experience (jump to sections)
- SEO (Google shows chapter markers in search)
- AI understanding of content structure

**FAQ (Pinned Comment)**
> "댓글에 넣을 수 있는 FAQ" (FAQ that can go in comments)

Strategy: Use pinned comment for FAQ because:
- Comments are indexed by Google
- Provides additional keyword-rich content
- Answers common questions proactively

### Generation Logic (GEO-Optimized)

```
INPUT:
├── SRT Content (what's said in video)
├── Product Brief (official USPs, specs)
├── Common Playbook (brand guidelines, tone)
├── Selected Keywords (user's priority choice)
├── Video URL (for title reference)
└── Grounding Questions (from Reddit/forums)

PROCESS:
├── Extract key points from SRT
├── Map to selected keywords
├── Apply brand guidelines
├── **CRITICAL: Front-load first 40-60 words** ← GEO optimization
│   └── Product name + primary keyword + key spec in opening
├── Generate structured description with E-E-A-T signals
├── Create timestamps from SRT timing
├── Generate relevant hashtags (mix branded + generic)
└── Create FAQ using conversational query patterns

OUTPUT:
├── Description (GEO-optimized, front-loaded)
├── Timestamps (from SRT timing)
├── Hashtags (keyword-based)
└── FAQ (conversational Q&A format)
```

### GEO-Specific Generation Rules

**1. Description First 40-60 Words**
```
❌ BAD: "안녕하세요! 오늘은 새로운 영상을 가져왔습니다..."
✅ GOOD: "Galaxy S25 Ultra 200MP 카메라로 촬영한 야간 사진을
        비교해봤습니다. 전작 대비 노이즈가 40% 감소했고..."
```

**2. E-E-A-T Signal Inclusion**
- Experience: "직접 2주간 사용해본 결과" (actual usage)
- Expertise: Include specifications, technical details
- Authoritativeness: Reference Samsung official specs
- Trustworthiness: Accurate claims, no exaggeration

**3. Conversational FAQ Questions**
```
❌ BAD: "Galaxy S25 Ultra 스펙"
✅ GOOD: "Galaxy S25 Ultra 배터리 얼마나 오래 가나요?"

❌ BAD: "카메라 화소"
✅ GOOD: "Galaxy S25 Ultra 카메라 몇 화소인가요?"
```

**4. FAQ Schema Structure**
Generated FAQ follows schema.org FAQ format for AI extraction:
```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Galaxy S25 Ultra 배터리 얼마나 오래 가나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "5000mAh 배터리로 일반 사용 시 하루 종일..."
      }
    }
  ]
}
```

---

## 2.6 Feature: Activity Dashboard

### What
Log of all generated content, filterable by various criteria.

### Why Needed

> "똑같은 걸 여러 번 작업하면 안 되잖아요"
> (Multiple people shouldn't work on the same thing)

Problems solved:
1. **Duplicate Prevention**: See what teammates have done
2. **Progress Tracking**: What's draft vs confirmed
3. **Audit Trail**: Who did what, when
4. **Team Coordination**: Manager visibility

### Dashboard Columns

| Column | Data | Purpose |
|--------|------|---------|
| Date | Timestamp | Recency sorting |
| User | Who generated | Accountability |
| Product | Galaxy S25, etc. | Filtering |
| Campaign | "Spring Launch 2025" | Grouping |
| Status | Draft / Confirmed | Workflow state |
| Actions | View / Copy / Edit | Operations |

### Confirmation Workflow

> "컨펌이 그냥 최종버전 느낌으로" (Confirmation is like marking final version)

**Status Flow**:
```
Draft → Confirmed
```

- **Draft**: Generated but not yet used
- **Confirmed**: This is the version uploaded to YouTube

**Why Confirmation?**
- Multiple versions might be generated
- Only one gets uploaded
- Need to know which one is "official"
- Prevents confusion

### Access Model

> "등급? 계정 등급? 관리자 등급... 그건 일단 빼시죠"
> (Account tiers/admin levels... let's skip that)

**Decision**: No role-based access control for MVP
- All team members see all content
- No approval workflow (they handle offline)
- Confirmation is informational, not gatekeeping

---

## 2.7 Feature: Brief Management

### What
Admin interface to manage product briefs (knowledge base).

### Brief Structure

```json
{
  "product_id": "galaxy-s25-ultra",
  "version": 1,
  "usps": [
    { "rank": 1, "keyword": "카메라", "description": "200MP 메인 센서..." },
    { "rank": 2, "keyword": "AI 기능", "description": "Galaxy AI..." },
    { "rank": 3, "keyword": "디자인", "description": "티타늄 프레임..." }
  ],
  "full_brief_text": "...",
  "is_active": true
}
```

### Version Control

> "버전이 돼야 될 것 같긴 해요" (Versions are probably needed)

**Why versions?**
> "A 기능이 메인이라고 해가지고... 런칭까지 개발이 안 됐어요. 그래서 광고를 다 바꿨거든요"
> (Feature A was main... but development wasn't done by launch. So all ads changed)

Brief can change because:
- Features get cut before launch
- Priorities shift based on competition
- New information emerges

**Version Management**:
- Only one `is_active = true` per product
- Previous versions kept for history
- User always works with active version

### Brief Per Campaign?

> "캠페인은 브리프 하나에요" (One brief per campaign)

Clarification from transcript:
- Product = Galaxy S25
- Campaign = "Spring Launch 2025"
- Brief = ONE per product (not per campaign)

Campaigns share the same brief:
- Launch campaign uses Brief v1
- Re-launch campaign (4 months later) uses same brief
- Only product changes trigger new briefs

---

## 2.8 Feature: E-E-A-T Scoring (Enhanced)

### What
Evaluate description quality using Google's **updated E-E-A-T criteria** (2023+).

### Why Not Social Metrics?

> "저는 여전히 소셜 반응을 기준으로 점수를 주는 건 조금 위험하다"
> (Using social reactions for scoring is risky)

**Problem with social metrics**:
- Views/likes depend on many factors (timing, ads, trends)
- Outside our control
- Can't attribute success to description alone

### E-E-A-T Approach (Updated 2024)

**E-E-A-T** = **Experience**, Expertise, Authoritativeness, Trustworthiness

| Criterion | Weight | What We Score | Example |
|-----------|--------|---------------|---------|
| **Experience** | 25% | First-hand usage indicators | "직접 테스트 결과", "2주 사용 후기" |
| **Expertise** | 25% | Technical accuracy, specifications | Correct specs, proper terminology |
| **Authoritativeness** | 25% | Source credibility signals | Samsung official data references |
| **Trustworthiness** | 25% | Honesty, accuracy, no exaggeration | Balanced claims, verified facts |

### Scoring Algorithm

```
Total Score = Experience + Expertise + Authority + Trust

Experience (0-25):
├── First-person usage language detected (+5)
├── Specific usage scenarios mentioned (+5)
├── Duration/testing period stated (+5)
├── Comparative statements with prior models (+5)
└── Real-world context provided (+5)

Expertise (0-25):
├── Product specifications included (+5)
├── Technical terms used correctly (+5)
├── Feature explanations present (+5)
├── Industry context provided (+5)
└── Accurate numeric claims (+5)

Authoritativeness (0-25):
├── Official Samsung brand mentions (+5)
├── Links to official sources (+5)
├── Consistent with official specs (+5)
├── Proper product naming (+5)
└── Structured format (+5)

Trustworthiness (0-25):
├── No exaggerated claims (+5)
├── Balanced presentation (+5)
├── Verifiable statements (+5)
├── Proper disclaimers where needed (+5)
└── Professional tone (+5)
```

### GEO-Specific Additions to Scoring

Beyond E-E-A-T, score for AI extraction optimization:

| Factor | Points | Why |
|--------|--------|-----|
| First 60 words keyword density | +10 | AI extracts opening heavily |
| Conversational FAQ format | +10 | Matches AI query patterns |
| Schema-compatible structure | +10 | AI parses structured data |
| Reddit-surfaced questions addressed | +5 | Matches real user queries |
| Timestamp chapters included | +5 | Improves content structure |

**Maximum Score**: 140 points (100 E-E-A-T + 40 GEO)

### Before/After Comparison

> "너네 원래 거는 이 점수 우리가 개선한 건 이 점수"
> (Your original is this score, our improved version is this score)

Show:
1. Score of original description (if any)
2. Score of generated description
3. Improvement delta
4. **Category breakdown** (which E-E-A-T areas improved)

**For skeptics**: "못 믿겠으면 AB 테스트 해봐" (If you don't believe it, do AB testing)

---

# PART 3: USER FLOWS

## 3.0 UI/UX Design Principles (from Transcript)

### Core User Mental Model

The user's workflow is essentially:
> "나는 GMC 담당자야. 오늘 올릴 영상이 있어. 어떤 키워드를 강조해야 할지 모르겠어.
> 그라운딩으로 사람들이 뭘 관심있어하는지 보고, 그걸 기반으로 디스크립션 만들어서 복사해서 올릴래."

### Key UI/UX Requirements (Transcript-Derived)

| Requirement | Source Quote | UI Implication |
|-------------|--------------|----------------|
| **Simple copy workflow** | "복사하기만 하면 되죠?" | Large copy buttons, one-click |
| **Prevent duplicate work** | "똑같은 걸 여러 번 작업하면 안 되잖아요" | Dashboard shows team activity first |
| **Human decision authority** | "그거에 대한 판단은 온전히... 사람은 하긴 해야되요" | User selects keywords, not auto |
| **Grounding is optional** | "없을 때가 있을까요?" | Fall back to Brief if no data |
| **Confirm = Final version** | "컨펌이 그냥 최종버전 느낌으로" | Simple toggle, not workflow |
| **No complex permissions** | "등급?... 그건 일단 빼시죠" | All users equal access |
| **Follow samsung.com structure** | "삼성닷컴 체계로 가는게 좋을것 같아요" | Category → Product hierarchy |

### Navigation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SAMSUNG GEO TOOL                          │
├─────────────────────────────────────────────────────────────────┤
│  [📊 Dashboard]  [✨ Generate]  [📋 Briefs]  [⚙️ Settings]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                        < Page Content >                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Default Landing**: Dashboard (to see team activity and prevent duplicates)
**Primary Action**: Generate (the main workflow)

---

## 3.1 Primary Flow: Generate Content

### Flow Overview (7 Steps)

```
Login → Dashboard Check → Start Generation → Product Selection →
Content Input → Keyword Analysis → Output & Save
```

### Why Dashboard First?

From transcript: "야 이거 얘가 했네 난 다른 거 하면 되겠다"
Users need to see what teammates have done BEFORE starting their own work.

---

### STEP 1: LOGIN

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                      Samsung GEO Tool                             │
│                                                                   │
│                    ┌─────────────────────┐                        │
│                    │    📧 Email         │                        │
│                    │  [_______________]  │                        │
│                    │                     │                        │
│                    │    🔒 Password      │                        │
│                    │  [_______________]  │                        │
│                    │                     │                        │
│                    │     [ Login ]       │                        │
│                    └─────────────────────┘                        │
│                                                                   │
│              Supabase Auth (email/password)                       │
│              No SSO required for MVP                              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Notes**:
- No role-based access ("등급?... 그건 일단 빼시죠")
- All team members see all content
- Email used for activity attribution

---

### STEP 2: DASHBOARD (Landing Page)

**Purpose**: Prevent duplicate work, show team activity

```
┌──────────────────────────────────────────────────────────────────┐
│ 📊 Dashboard                                    [✨ New Generation]│
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Recent Activity                                                  │
│  ────────────────────────────────────────────────────────────────│
│                                                                   │
│  Filters: [All Products ▼] [All Status ▼] [All Users ▼]         │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Today                                                       │  │
│  │ ┌────────────────────────────────────────────────────────┐ │  │
│  │ │ ✅ Galaxy S25 Ultra │ Spring Launch │ 김민수 │ 10:32   │ │  │
│  │ │    └─ "카메라 리뷰 영상" confirmed                      │ │  │
│  │ └────────────────────────────────────────────────────────┘ │  │
│  │ ┌────────────────────────────────────────────────────────┐ │  │
│  │ │ 📝 Galaxy S25 Ultra │ Spring Launch │ 이지은 │ 09:15   │ │  │
│  │ │    └─ "언박싱 영상" draft                               │ │  │
│  │ └────────────────────────────────────────────────────────┘ │  │
│  │                                                             │  │
│  │ Yesterday                                                   │  │
│  │ ┌────────────────────────────────────────────────────────┐ │  │
│  │ │ ✅ Galaxy Watch 7   │ Winter Sale   │ 박철수 │ 16:45   │ │  │
│  │ └────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  💡 Tip: Check if someone already worked on your video!          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Key UX Decision**: Dashboard is landing page because:
> "똑같은 걸 여러 번 작업하면 안 되잖아요"
> "팀장이면은 우리 팀원들이 어떤 캠페인의 로그를 생성했는지를 볼 수 있는 페이지면 될 것 같아요"

---

### STEP 3: SELECT PRODUCT (After clicking "New Generation")

```
┌──────────────────────────────────────────────────────────────────┐
│ ✨ New Generation                                    Step 1 of 4  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  What product is this content for?                               │
│                                                                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐     │
│  │    📱     │  │    ⌚     │  │    💍     │  │    🎧     │     │
│  │  Mobile   │  │   Watch   │  │   Ring    │  │   Buds    │     │
│  │           │  │           │  │           │  │           │     │
│  │  ● active │  │           │  │           │  │           │     │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘     │
│                                                                   │
│  ┌───────────┐  ┌───────────┐                                    │
│  │    💻     │  │    🥽     │                                    │
│  │  Laptop   │  │    XR     │                                    │
│  └───────────┘  └───────────┘                                    │
│                                                                   │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  제품 (Product):                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Galaxy S25 Ultra                                        ▼  │  │
│  └────────────────────────────────────────────────────────────┘  │
│     Options: Galaxy S25 | Galaxy S25+ | Galaxy S25 Ultra         │
│                                                                   │
│  캠페인 태그 (Campaign Tag):  ⓘ For organization only            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Spring 2025 Launch                                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│     Free text - same Brief is used regardless of campaign        │
│                                                                   │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  📋 Active Brief: Galaxy S25 Ultra v2 (2025-01-10)              │
│     USPs: 카메라, AI 기능, 디자인                                │
│                                                                   │
│                                              [Continue →]         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Key Clarifications**:
- "캠페인은 브리프 하나에요" - Campaign tag is just for organization
- Brief is per PRODUCT, shows active version automatically
- Follow samsung.com category structure

---

### STEP 4: CONTENT INPUT

```
┌──────────────────────────────────────────────────────────────────┐
│ ✨ New Generation                                    Step 2 of 4  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Video Information                                                │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  YouTube / Instagram URL (optional):                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ https://youtube.com/watch?v=abc123                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  SRT Subtitle File: *                                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [📁 Upload .srt file]    or    [📝 Paste SRT text]        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Preview:                                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 00:00:00,000 --> 00:00:05,000                              │  │
│  │ 안녕하세요, 오늘은 Galaxy S25 Ultra를 소개합니다          │  │
│  │                                                            │  │
│  │ 00:00:05,000 --> 00:00:12,000                              │  │
│  │ 가장 먼저 살펴볼 것은 200MP 카메라입니다                  │  │
│  │                                                            │  │
│  │ 00:00:12,000 --> 00:00:20,000                              │  │
│  │ 야간 모드에서도 선명한 사진을 촬영할 수 있습니다          │  │
│  │ ...                                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│                                    [← Back]  [Continue →]         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Notes**:
- SRT is the primary input (required)
- URL is optional - used for reference/linking
- Parse SRT to show preview for validation
- Support both file upload and text paste

---

### STEP 5: KEYWORD ANALYSIS (Grounding)

**Key UX Decision**: Grounding is a separate, optional action
> "없을 때가 있을까요?" - "Will there be times without it?"
> User should be able to proceed with just Brief keywords if grounding isn't needed

```
┌──────────────────────────────────────────────────────────────────┐
│ ✨ New Generation                                    Step 3 of 4  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Keyword Selection                                                │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐│
│  │ 📋 Brief USPs               │  │ 🔍 Grounding Results         ││
│  │    (삼성 우선순위)          │  │    (사용자 관심도)           ││
│  │                             │  │                              ││
│  │  1. 카메라                  │  │  ┌─────────────────────────┐ ││
│  │  2. AI 기능                 │  │  │ 1. 카메라     (47 pts)  │ ││
│  │  3. 디자인                  │  │  │ 2. 배터리     (31 pts)  │ ││
│  │                             │  │  │ 3. 원핸드 그립 (23 pts) │ ││
│  │                             │  │  │ 4. AI 기능    (18 pts)  │ ││
│  │                             │  │  │ 5. 디자인     (12 pts)  │ ││
│  │                             │  │  └─────────────────────────┘ ││
│  │                             │  │                              ││
│  │                             │  │  [🔄 Run Grounding]          ││
│  │                             │  │  (searches Reddit, Google...)││
│  └─────────────────────────────┘  └─────────────────────────────┘│
│                                                                   │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  💡 Select up to 3 keywords to emphasize:                         │
│  ⓘ "그거에 대한 판단은 온전히... 사람은 하긴 해야되요"           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [✓] 카메라      [✓] 배터리      [ ] AI 기능               │  │
│  │  [ ] 디자인      [ ] 원핸드 그립                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Selected (2/3): 카메라, 배터리                                   │
│                                                                   │
│                           [← Back]  [⚡ Generate Content]         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**UX Notes**:
- Brief USPs shown by default (no grounding required)
- "Run Grounding" is explicit button action, not automatic
- If grounding fails or returns empty → use Brief only
- Human always makes final keyword selection
- Show point scores to justify recommendations

---

### STEP 6: OUTPUT & SAVE

**Key UX Decision**: Simple copy workflow
> "복사하기만 하면 되죠?" - "I just need to copy, right?"
> Large, prominent copy buttons for each output section

```
┌──────────────────────────────────────────────────────────────────┐
│ ✨ Generated Content                                 Step 4 of 4  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Galaxy S25 Ultra | Spring 2025 Launch                           │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  📝 Description                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Galaxy S25 Ultra | 200MP 카메라의 새로운 기준              │  │
│  │                                                            │  │
│  │ 삼성 Galaxy S25 Ultra의 혁신적인 카메라 시스템을          │  │
│  │ 만나보세요. 200MP 메인 센서와 향상된 배터리 효율로        │  │
│  │ 하루 종일 최고의 순간을 담을 수 있습니다.                 │  │
│  │                                                            │  │
│  │ ✓ 200MP 광각 카메라 - 극도로 선명한 디테일               │  │
│  │ ✓ 5000mAh 배터리 - 하루 종일 걱정 없는 사용              │  │
│  │ ...                                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     [ 📋 Copy Description ]                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ⏱️ Timestamps                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 0:00 인트로                                                │  │
│  │ 0:30 카메라 리뷰                                           │  │
│  │ 2:15 배터리 테스트                                         │  │
│  │ 4:00 마무리                                                │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     [ 📋 Copy Timestamps ]                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  #️⃣ Hashtags                                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ #GalaxyS25Ultra #삼성카메라 #200MP #스마트폰 #배터리       │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      [ 📋 Copy Hashtags ]                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ❓ FAQ (For Pinned Comment)                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Q: Galaxy S25 Ultra 카메라 화소는 몇 MP인가요?             │  │
│  │ A: 200MP 메인 카메라를 탑재했습니다. 야간 모드에서도      │  │
│  │    선명한 사진을 촬영할 수 있습니다.                       │  │
│  │                                                            │  │
│  │ Q: 배터리 용량은 얼마인가요?                               │  │
│  │ A: 5000mAh 대용량 배터리로 하루 종일 걱정 없이            │  │
│  │    사용할 수 있습니다.                                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                        [ 📋 Copy FAQ ]                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  ┌──────────────────────┐    ┌──────────────────────┐            │
│  │   [💾 Save Draft]    │    │  [✅ Mark Confirmed]  │            │
│  │   (수정 가능)         │    │   (최종 버전)         │            │
│  └──────────────────────┘    └──────────────────────┘            │
│                                                                   │
│  ⓘ "컨펌이 그냥 최종버전 느낌으로" - Confirmed means final       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**UX Notes**:
- Each output section has its own large copy button
- Copy buttons are full-width, prominent (easy to click)
- Draft vs Confirmed is simple toggle, not complex workflow
- Shows product + campaign for context
- Can regenerate if needed (back button available)

---

## 3.2 Secondary Flow: Brief Management

```
┌──────────────────────────────────────────────────────────────────┐
│ 📋 Briefs                                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Briefs are per PRODUCT (not per campaign or video)              │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Product          │ Active Brief  │ Version │ Last Updated  │  │
│  │──────────────────│───────────────│─────────│───────────────│  │
│  │ Galaxy S25 Ultra │ ✓ Active      │ v2      │ 2025-01-10    │  │
│  │ Galaxy S25+      │ ✓ Active      │ v1      │ 2025-01-05    │  │
│  │ Galaxy S25       │ ✓ Active      │ v1      │ 2025-01-05    │  │
│  │ Galaxy Watch 7   │ ✓ Active      │ v3      │ 2024-12-20    │  │
│  │ Galaxy Ring 2    │ ⚠️ No Brief   │ -       │ -             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Click row to edit brief                                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Edit Brief View:

```
┌──────────────────────────────────────────────────────────────────┐
│ 📋 Edit Brief: Galaxy S25 Ultra                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Version History: v1 (2025-01-01) → v2 (2025-01-10) [current]    │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  USPs (Priority Order):                                           │
│  ⓘ Drag to reorder, highest priority at top                      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ≡  1. [카메라_______________]                              │  │
│  │ ≡  2. [AI 기능_______________]                             │  │
│  │ ≡  3. [디자인_______________]                              │  │
│  │                                                            │  │
│  │ [+ Add USP]                                                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Brief Content (optional):                                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Galaxy S25 Ultra는 삼성의 2025년 플래그십 스마트폰입니다.  │  │
│  │ 200MP 카메라와 AI 기반 이미지 처리로 최고의 사진 경험을   │  │
│  │ 제공합니다. 티타늄 프레임과 세련된 디자인...               │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│              [Cancel]  [Save as New Version]                      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Key Points**:
- ONE brief per PRODUCT (not per campaign)
- Versioning: changes create new version, old versions preserved
- USPs are ordered by priority (drag to reorder)
- Brief content is optional background info

---

## 3.3 User Flow Summary

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY MAP                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [LOGIN] ──→ [DASHBOARD] ──→ "New Generation" button            │
│                   │                    │                         │
│                   │              ┌─────▼─────┐                   │
│                   │              │  STEP 1   │                   │
│             Check team           │  Select   │                   │
│             activity             │  Product  │                   │
│             first                └─────┬─────┘                   │
│                   │                    │                         │
│              "야 이거              ┌─────▼─────┐                   │
│              얘가 했네"           │  STEP 2   │                   │
│                                   │  Input    │                   │
│                                   │  Content  │                   │
│                                   └─────┬─────┘                   │
│                                         │                         │
│                                   ┌─────▼─────┐                   │
│                                   │  STEP 3   │                   │
│                                   │  Keyword  │                   │
│                                   │  Analysis │◄── Optional:     │
│                                   └─────┬─────┘    Run Grounding │
│                                         │                         │
│                                   ┌─────▼─────┐                   │
│                                   │  STEP 4   │                   │
│                                   │  Output   │                   │
│                                   │  & Save   │                   │
│                                   └─────┬─────┘                   │
│                                         │                         │
│                                   ┌─────▼─────┐                   │
│                                   │   Copy    │                   │
│                                   │ to YT/IG  │                   │
│                                   └───────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Time Expectation

| Step | Action | Expected Time |
|------|--------|---------------|
| Dashboard | Check team activity | 10-30 seconds |
| Step 1 | Select product | 5-10 seconds |
| Step 2 | Upload/paste SRT | 10-30 seconds |
| Step 3 | Run grounding (optional) | 10-15 seconds |
| Step 3 | Select keywords | 10-20 seconds |
| Step 4 | Copy outputs | 20-60 seconds |
| **Total** | End-to-end | **~2-3 minutes** |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| No grounding data | Use Brief USPs only |
| No Brief for product | Prompt to create brief first |
| SRT parse error | Show error, allow re-upload |
| Generation error | Show retry button with error message |
| Duplicate detection | Warn if same product+video exists |

---

# PART 4: TECHNICAL ARCHITECTURE

## 4.1 Why These Technology Choices

### Next.js 15 (App Router)
- **Server Components**: Heavy AI/API calls happen server-side
- **API Routes**: Built-in API endpoints
- **React 19**: Latest React features
- **Vercel-ready**: Easy deployment

### Supabase
- **Auth**: Built-in authentication
- **PostgreSQL**: Relational data (products, briefs, generations)
- **Row Level Security**: Per-user data access
- **Real-time**: Future feature for team collaboration

### shadcn/ui + Tailwind
- **Copy-paste components**: Fast development
- **Customizable**: Samsung brand colors possible
- **Accessible**: WCAG compliance built-in
- **Dark mode**: Easy theming

### OpenAI GPT-4
- **Quality**: Best-in-class text generation
- **Korean**: Strong multilingual support
- **Structured output**: JSON mode for parsing

### Google Custom Search API
- **Coverage**: Comprehensive web results
- **Reliability**: Google's infrastructure
- **Customizable**: Filter by site, language

---

## 4.2 Database Schema Rationale

### Why These Tables?

```sql
-- users: Track who does what
-- categories: Organize products (Mobile, Watch, etc.)
-- products: Individual items (Galaxy S25, etc.)
-- briefs: Knowledge base with versioning
-- generations: Activity log + outputs
-- grounding_cache: Avoid repeated expensive API calls
```

### Key Design Decisions

**1. Brief Versioning**
```sql
briefs (
  version int,
  is_active boolean
)
```
- Multiple versions possible
- Only one active per product
- History preserved

**2. Generation Input/Output Split**
```sql
generations (
  -- Input (what user provided)
  video_url, srt_content, selected_keywords,

  -- Output (what AI generated)
  description, timestamps, hashtags, faq
)
```
- Can regenerate outputs without re-inputting
- Audit trail of exactly what was used

**3. Status Simplicity**
```sql
status text default 'draft' -- draft | confirmed
```
- Only two states needed
- No complex workflow
- User confirmation is informational

**4. Campaign as Tag, Not Table**
```sql
campaign_tag text
```
- Campaigns share briefs
- Just need labeling, not separate entity
- Flexible text field

---

## 4.3 API Design Rationale

### POST /api/grounding

**Why POST not GET?**
- Product name could be long
- Future: might accept additional filters
- Triggers processing, not just retrieval

**Response Design**:
```json
{
  "keywords": [...],
  "sources": [...],
  "cached": false,
  "timestamp": "..."
}
```
- Include cache status for transparency
- Return sources for verification

### POST /api/generate

**Why Single Endpoint?**
- All outputs generated together
- Same input needed for all
- Simpler client code

**Streaming Consideration**:
- Could stream generation for UX
- MVP: Wait for complete response
- Future: SSE for real-time updates

---

# PART 5: EDGE CASES & CONSIDERATIONS

## 5.1 What If Grounding Returns Nothing?

**Scenario**: Brand new product, no web content yet

**Solution**:
1. Show message: "Limited grounding data available"
2. Fall back to Brief USPs only
3. User can still generate with Brief keywords

## 5.2 What If Brief Doesn't Exist?

**Scenario**: New product added before brief uploaded

**Solution**:
1. Allow generation without brief
2. Grounding becomes primary source
3. Admin notification to add brief

## 5.3 Multiple Users Same Content

**Scenario**: Two people work on same video

**Solution**:
1. Dashboard shows existing generations
2. Warning: "Similar content exists by [user]"
3. Allow proceed (might be intentional)

## 5.4 SRT Parsing Errors

**Scenario**: Malformed SRT file

**Solution**:
1. Validate SRT format on upload
2. Show specific error message
3. Allow manual paste as fallback

## 5.5 API Rate Limits

**Scenario**: Google API quota exceeded

**Solution**:
1. Cache grounding results (24 hours)
2. Show cached results with warning
3. Allow generation with Brief only

---

# PART 6: WHAT'S NOT IN MVP

## 6.1 Explicitly Excluded

| Feature | Reason |
|---------|--------|
| Auto-publish to YouTube | Samsung won't grant API access |
| Sentiment analysis | Samsung ignores negative feedback |
| TikTok support | Different algorithm, different tool |
| Video content analysis | Unnecessary, SRT sufficient |
| Role-based permissions | They handle offline |
| Approval workflows | They handle offline |
| Multi-language | Korean only for now |

## 6.2 Future Expansion Ideas

### Phase 2: Enhanced GEO Features

| Feature | Description | Why It Matters |
|---------|-------------|----------------|
| **AI Citation Tracking** | Monitor when Samsung content appears in AI Overviews, Perplexity, ChatGPT | Measure actual GEO success |
| **Reddit Monitor** | Real-time Reddit discussion tracking for products | Reddit is key AI citation source |
| **Schema Markup Generator** | Auto-generate FAQ, Product, HowTo schema for web embedding | Direct AI extraction improvement |
| **Perplexity/Gemini Simulator** | Preview how content appears when cited by AI | Optimize before publishing |
| **Question Gap Analysis** | Identify questions users ask that Samsung doesn't answer | Content opportunity discovery |

### Phase 3: Advanced Features

| Feature | Trigger | Details |
|---------|---------|---------|
| Competitor analysis | "내년도에는 경쟁사까지 끌어옵니다" | Track competitor GEO performance |
| Other Samsung divisions | Beyond MX (CE, Harman) | Expand product coverage |
| Fine-tuning based on confirmations | "선택된 애들을 학습" | Learn from successful content |
| AI exposure tracking | 2-week post-publish check | Measure citation frequency |
| Multi-platform optimization | Instagram Reels, YouTube Shorts | Short-form content support |

### Phase 4: Intelligence Layer

| Feature | Description |
|---------|-------------|
| **Wikipedia Gap Analysis** | Identify missing/outdated Samsung Wikipedia content (47.9% ChatGPT citations) |
| **Reddit Seeding Strategy** | Identify subreddits and topics to engage (ethically) |
| **AI Query Prediction** | Predict what AI users will ask about upcoming products |
| **Competitive Citation Analysis** | Track how often Apple/Google products are cited vs Samsung |

---

# PART 7: SUCCESS CRITERIA

## 7.1 MVP Success

1. **Functional**: User can generate descriptions from SRT
2. **Grounding Works**: Keywords extracted from web search with Reddit weighting
3. **Dashboard Visible**: Team sees all activity
4. **Copy Works**: One-click copy to clipboard
5. **GEO-Optimized Output**: First 40-60 words are front-loaded with keywords

## 7.2 Business Success

1. **Time Saved**: Description creation < 5 minutes (vs 30+ minutes manual)
2. **Adoption**: Team actually uses it daily
3. **Quality**: Generated descriptions score higher on E-E-A-T (target: 100+/140)
4. **Evidence**: Grounding data used in internal discussions
5. **FAQ Quality**: Conversational questions match real user queries

## 7.3 GEO-Specific Success Metrics (Phase 2+)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| AI Overview Appearance | +20% for optimized content | Manual spot-check + future API |
| Perplexity Citation | Samsung content cited in relevant queries | Query Samsung products on Perplexity |
| E-E-A-T Score | 100+/140 average | Built-in scoring system |
| First 60 Words Keyword Density | 3+ keywords | Automated check |
| FAQ Coverage | Address 80%+ of Reddit questions | Question gap analysis |
| Grounding Data Freshness | < 7 days old | Cache timestamp check |

## 7.4 Leading Indicators (Weekly)

Track these to predict GEO success:

1. **Reddit Question Coverage**: % of top Reddit questions addressed in FAQ
2. **Keyword Alignment**: Brief vs Grounding keyword overlap
3. **Description E-E-A-T Score**: Average score of generated content
4. **Team Adoption Rate**: % of uploads using tool-generated content
5. **Confirmation Rate**: % of drafts marked as confirmed (used)

---

# APPENDIX: Key Korean Terms

| Korean | English | Context |
|--------|---------|---------|
| 그라운딩 | Grounding | Data-driven keyword validation |
| 브리프 | Brief | Campaign guidelines document |
| 플레이북 | Playbook | Brand/format guidelines |
| 품목 | Category | Product category (Mobile, Watch) |
| 제품 | Product | Specific item (Galaxy S25) |
| USP | Unique Selling Point | Key feature to highlight |
| 디스크립션 | Description | YouTube description field |
| 제일기획 | Cheil Worldwide | Samsung's ad agency |
| 뇌피셜 | Brain-fficial | Gut feeling (slang) |
| GMC | Global Marketing Center | Samsung's marketing HQ |
| MX | Mobile eXperience | Samsung division |

---

# APPENDIX B: GEO/AEO Research Summary (2025)

## Key Statistics

| Statistic | Source | Implication |
|-----------|--------|-------------|
| AI Overviews in 47% of searches | Ahrefs 2025 | Traditional SEO is insufficient |
| Featured snippets ↓83% | BrightEdge Aug 2025 | AI Overviews replaced snippets |
| Wikipedia = 47.9% of ChatGPT citations | NerdyNav research | Wikipedia presence critical |
| Reddit heavily cited by Gemini/Perplexity | Industry studies | Reddit discussions = AI fuel |
| AI Overviews cite 5-15 sources | Google Search analysis | Multi-source strategy needed |
| First 40-60 words critical | AI extraction studies | Front-load descriptions |
| E-E-A-T (not E-A-T) since 2023 | Google QRG update | Experience now matters |

## AI Engine Citation Patterns

### ChatGPT
- **Primary sources**: Wikipedia (47.9%), authoritative websites
- **Content preference**: Well-structured, factual, comprehensive
- **Citation style**: Often references but doesn't link

### Google AI Overviews
- **Primary sources**: Google's indexed content, especially featured snippet candidates
- **Content preference**: Direct answers, structured data, FAQ format
- **Citation style**: Shows source links in expandable cards

### Perplexity
- **Primary sources**: Web search + Reddit + academic sources
- **Content preference**: Multiple perspectives, discussion threads
- **Citation style**: Always shows sources with links

### Gemini
- **Primary sources**: Google Search + Reddit + YouTube
- **Content preference**: Multimodal content, user discussions
- **Citation style**: References sources contextually

## Content Optimization Checklist

### For AI Extraction
- [ ] Product name in first 20 words
- [ ] Primary keyword in first 40 words
- [ ] Key specification in first 60 words
- [ ] Conversational FAQ questions
- [ ] Schema-compatible structure
- [ ] No fluff/filler content in opening

### For E-E-A-T Signals
- [ ] First-hand experience indicators ("tested", "used for X days")
- [ ] Technical specifications included
- [ ] Samsung official references
- [ ] Balanced, non-exaggerated claims
- [ ] Proper product naming

### For Reddit/Community Alignment
- [ ] Address top questions from Reddit
- [ ] Use natural language phrasing
- [ ] Include comparison points (vs previous model, vs competitors)
- [ ] Answer "is it worth it?" type questions

---

# APPENDIX C: Implementation Notes

## Reddit API Considerations

For Reddit data extraction:
- **Option 1**: Reddit API (requires application approval)
- **Option 2**: Google Custom Search with `site:reddit.com` filter
- **Option 3**: Third-party Reddit search tools

**Recommendation**: Start with Google Custom Search `site:reddit.com` for MVP, migrate to Reddit API for better data in Phase 2.

## AI Content Generation Prompts

### Description Generation Prompt Structure
```
You are a YouTube SEO specialist optimizing for AI search engines.

CRITICAL RULES:
1. First 60 words MUST contain: [product name], [primary keyword], [key spec]
2. Use natural language, not keyword stuffing
3. Include E-E-A-T signals (experience, expertise, authority, trust)
4. Total length: 800-1200 characters

INPUTS:
- Product: {product_name}
- Selected Keywords: {keywords}
- SRT Content: {srt_summary}
- Brief USPs: {brief_usps}

OUTPUT FORMAT:
[Product name + primary keyword hook in first sentence]
[Key specification in second sentence]
[Video content summary]
[Call to action]
```

### FAQ Generation Prompt Structure
```
Generate FAQ for YouTube pinned comment.

CRITICAL RULES:
1. Questions must be CONVERSATIONAL (how users actually ask AI)
2. Include product name in questions
3. Answers should be concise (2-3 sentences max)
4. Address questions from: {reddit_questions}

BAD: "Galaxy S25 Ultra specs"
GOOD: "Galaxy S25 Ultra 배터리 얼마나 오래 가나요?"

Generate 5 Q&A pairs addressing:
1. Primary feature (from keywords)
2. Comparison to previous model
3. Price/value question
4. Most-asked Reddit question
5. Common concern/objection
```
