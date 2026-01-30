# Samsung GEO Tool - Implementation TODO v2.0

> **업데이트일**: 2026-01-30
> **변경 사유**: GEO Strategy 260116 + Solution Brief 0129와 현재 코드베이스 철저 분석 후 업데이트
> **⚠️ 이 문서는 구현 계획입니다. 실제 코드 변경은 승인 후 진행합니다.**

---

# 🔍 Gap Analysis Summary

## 현재 코드베이스 상태

### ✅ 이미 구현됨
| 기능 | 파일 | 상태 |
|------|------|------|
| Description 생성 | `generate-v2/route.ts` | ✅ 130자 최적화 포함 |
| Timestamps 생성 | `generate-v2/route.ts` | ✅ |
| Hashtags 생성 | `generate-v2/route.ts` | ✅ 기본 구현 |
| FAQ 생성 | `generate-v2/route.ts` | ✅ Q:/A: 형식 |
| Image Alt Text | `image-alt-generator.ts` | ✅ 존재하지만 출력에 미표시 |
| ContentType 선택 | `generation-store.ts` | ✅ 9개 타입 |
| VideoFormat 선택 | `generation-store.ts` | ✅ Feed/Shorts |
| Fixed Hashtags | `generation-store.ts` | ✅ |
| Vanity Link Code | `generation-store.ts` | ✅ |
| USP Extraction | `usp-extraction.ts` | ✅ |
| Grounding (Perplexity) | `generate-v2/route.ts` | ✅ |
| Playbook RAG | `rag/search.ts` | ✅ |
| Anti-Fabrication | `anti-fabrication.ts` | ✅ |

### ❌ 구현 필요 (Strategy + Brief 요구사항)
| 기능 | 요구사항 출처 | 현재 상태 |
|------|--------------|-----------|
| **Platform Selection** | Strategy p.95-104 | ❌ 미구현 |
| **YouTube Title 생성** | Brief Slide 3 | ❌ 미구현 |
| **Meta Tags 생성** | Brief Slide 3 | ❌ 미구현 |
| **Instagram Description (125자)** | Brief Slide 4 | ❌ 미구현 |
| **Instagram Hashtag (GEO 최적화)** | Brief Slide 4 | ⚠️ 기본만 구현 |
| **Thumbnail Text 제안** | Brief Slide 3 | ❌ 미구현 |
| **Engagement Comments** | Brief Slide 4 | ❌ 미구현 |
| **TikTok Description** | Brief Slide 5 | ❌ 미구현 (TBD) |
| **TikTok Cover Text** | Brief Slide 5 | ❌ 미구현 |
| **Review Workflow** | Brief Slide 2 | ❌ 미구현 |
| **Schema.org 추천** | Strategy p.145-146 | ❌ 미구현 |
| **Query Fan-Out 최적화** | Strategy p.17 | ❌ 미구현 |
| **Expert Attribution** | Prompt (GEO 2025 BP) | ⚠️ 프롬프트에만 있음 |

---

# 📊 Priority Matrix (Updated)

| Priority | 정의 | 기한 | TODO 수 |
|----------|------|------|---------|
| **P0** | 베타 필수 - 핵심 생성 기능 | 2/12 | 15개 |
| **P1** | 실사용 필수 - 워크플로우 + 추가 기능 | 2/23 | 12개 |
| **P2** | 향후 - TikTok + 고도화 | TBD | 8개 |

---

# 📑 Part 1: P0 - 베타 필수 (2/12까지)

## 1.1 Platform Selection System [NEW - From Strategy]

### TODO-P0-1: Platform 타입 및 설정
- **파일**: `src/types/geo-v2.ts`
- **작업**:
  ```typescript
  // 추가
  export type Platform = 'youtube' | 'instagram' | 'tiktok';
  
  export const PLATFORM_CONFIG: Record<Platform, {
    name: string;
    nameKo: string;
    icon: string;
    charLimits: {
      firstSection: number;  // YouTube: 130, Instagram/TikTok: 125
      description: number;
      altText?: number;
    };
    outputs: string[];
  }> = {
    youtube: {
      name: 'YouTube',
      nameKo: '유튜브',
      icon: '📺',
      charLimits: { firstSection: 130, description: 5000 },
      outputs: ['title', 'description', 'timestamps', 'hashtags', 'faq', 'metaTags', 'thumbnailText']
    },
    instagram: {
      name: 'Instagram',
      nameKo: '인스타그램',
      icon: '📸',
      charLimits: { firstSection: 125, description: 2200, altText: 150 },
      outputs: ['description', 'altText', 'hashtags', 'engagementComments']
    },
    tiktok: {
      name: 'TikTok',
      nameKo: '틱톡',
      icon: '🎵',
      charLimits: { firstSection: 125, description: 2200 },
      outputs: ['description', 'coverText', 'hashtags']
    }
  };
  ```

### TODO-P0-2: Store에 Platform 상태 추가
- **파일**: `src/store/generation-store.ts`
- **작업**:
  ```typescript
  // State 추가
  platform: Platform;
  
  // Action 추가
  setPlatform: (platform: Platform) => void;
  
  // Default
  platform: 'youtube',
  ```

### TODO-P0-3: Platform Selector UI
- **파일**: `src/components/features/platform-selector.tsx` (신규)
- **위치**: Generate 페이지 Step 1 전에 추가
- **UI 요구사항**:
  - 3개 플랫폼 카드 (YouTube, Instagram, TikTok)
  - 선택 시 해당 플랫폼 출력 항목 미리보기
  - 글자 수 제한 표시

---

## 1.2 YouTube Title Generation [NEW - From Brief Slide 3]

### TODO-P0-4: Title Generator 모듈
- **파일**: `src/lib/geo-v2/title-generator.ts` (신규)
- **Strategy 기반 요구사항** (Page 100):
  - 삼성 구조: `[Primary Keyword] | [Feature] | [Product Name] | Samsung`
  - 핵심 키워드 앞쪽 배치
  - 최대 60자

```typescript
export interface YouTubeTitleResult {
  primary: string;           // 메인 추천 타이틀
  alternatives: string[];    // 대안 2-3개
  keywords: string[];        // 포함된 키워드
  charCount: number;
  validation: {
    structureValid: boolean;        // 삼성 구조 준수
    keywordPosition: 'front' | 'middle' | 'back';
    hasBrandSuffix: boolean;        // Samsung으로 끝나는지
  };
}

export const SAMSUNG_TITLE_TEMPLATES = {
  intro: '[Product Name] | [Key Feature] | Samsung',
  how_to: 'How to [Action] on [Product Name] | Samsung',
  unboxing: '[Product Name] Unboxing | [Highlight] | Samsung',
  shorts: '[Hook] | [Product Name]',  // Shorts는 짧게
};

export async function generateYouTubeTitle(
  productName: string,
  keywords: string[],
  contentType: ContentType,
  srtContent?: string
): Promise<YouTubeTitleResult>;
```

### TODO-P0-5: Title 생성 프롬프트 추가
- **파일**: `src/lib/tuning/prompt-loader.ts`
- **추가할 stage**: `'title'`
- **프롬프트 내용**:
  ```
  ## YOUTUBE TITLE GENERATION (Samsung Standard)
  
  ### STRUCTURE (CRITICAL)
  Use Samsung's official title structure:
  [Primary Keyword] | [Feature/Benefit] | [Product Name] | Samsung
  
  ### RULES
  1. Maximum 60 characters for optimal display
  2. Place primary keyword (product name or feature) at the BEGINNING
  3. Include at least one key feature/benefit
  4. End with "Samsung" for brand consistency
  5. Use "|" as separator (with spaces)
  
  ### CONTENT TYPE VARIATIONS
  - INTRO: "Introducing [Product] | [Key Feature] | Samsung"
  - HOW-TO: "How to [Action] | [Product] | Samsung"
  - UNBOXING: "[Product] Unboxing | [Highlight] | Samsung"
  - SHORTS: "[Hook] #[Product]" (shorter, no Samsung suffix)
  ```

---

## 1.3 Meta Tags Generation [NEW - From Brief Slide 3]

### TODO-P0-6: Meta Tags Generator 모듈
- **파일**: `src/lib/geo-v2/meta-tags-generator.ts` (신규)
- **Brief 요구사항**: "영상/링크 및 카피 입력 시 메타태그 제안 가능 여부"

```typescript
export interface MetaTagsResult {
  tags: string[];
  categories: {
    brand: string[];      // Samsung, Galaxy
    product: string[];    // S26 Ultra, Z Flip 7
    feature: string[];    // AI, Camera, Battery
    generic: string[];    // smartphone, mobile
  };
  totalCount: number;
  seoScore: number;       // 0-100
}

export async function generateMetaTags(
  productName: string,
  keywords: string[],
  contentType: ContentType,
  description: string
): Promise<MetaTagsResult>;
```

---

## 1.4 Instagram Description (125자 최적화) [NEW - From Brief Slide 4]

### TODO-P0-7: Instagram Description Generator
- **파일**: `src/lib/geo-v2/instagram-description-generator.ts` (신규)
- **Brief 요구사항**: "첫 125글자에 핵심메시지와 키워드(제품명/기능/브랜드명 등), CTA가 포함"

```typescript
export interface InstagramDescriptionResult {
  primary: string;           // 첫 125자 (접히기 전)
  extended: string;          // 전체 디스크립션
  charCount: number;
  validation: {
    hasCoreMesage: boolean;
    hasProductName: boolean;
    hasFeatureName: boolean;
    hasBrandName: boolean;
    hasCTA: boolean;
    keywordsFound: string[];
  };
}

// Strategy p.97 기반 - Instagram 콘텐츠 구성
export async function generateInstagramDescription(
  productName: string,
  keywords: string[],
  contentContext: string
): Promise<InstagramDescriptionResult>;
```

---

## 1.5 Instagram/YouTube Alt Text Integration [UPDATE - Existing but hidden]

### TODO-P0-8: Alt Text를 메인 Output에 표시
- **파일**: `src/components/features/output-display.tsx`
- **현재 상태**: `ImageAltDisplay` 컴포넌트 존재하지만 조건부 렌더링
- **작업**:
  - Instagram 플랫폼 선택 시 Alt Text 섹션 항상 표시
  - 복사 버튼 추가
  - Brief 요구사항: "제품명+장면설명+키워드 포함, 150자 이내"

---

## 1.6 Hashtag Enhancement (GEO 최적화) [UPDATE - From Brief Slide 4]

### TODO-P0-9: Hashtag Generator 개선
- **파일**: `src/lib/geo-v2/hashtag-generator.ts` (신규 또는 기존 개선)
- **Brief 요구사항**:
  - 공식 해시태그 사용 여부 확인
  - 해시태그 개수 가이드 (3-5개)
  - GEO 서치에 유효한 해시태그

```typescript
export interface EnhancedHashtagResult {
  hashtags: string[];
  validation: {
    officialIncluded: string[];     // 공식 해시태그
    geoOptimized: string[];         // GEO 유효 해시태그
    totalCount: number;
    orderCorrect: boolean;          // #GalaxyAI first, #Samsung last
  };
  recommendations: {
    add: string[];
    remove: string[];
  };
}

// Strategy에서 언급된 순서
// #GalaxyAI → #ProductName → #ProductSeries → #Samsung
export const HASHTAG_ORDER_RULES = {
  first: ['#GalaxyAI'],           // AI 기능 있으면 첫번째
  middle: ['#ProductName', '#ProductSeries'],
  last: ['#Samsung'],             // 항상 마지막
};
```

---

## 1.7 Generate Flow 수정 [UPDATE]

### TODO-P0-10: Generate Page Step 추가
- **파일**: `src/app/(dashboard)/generate/page.tsx`
- **현재**: `Product → Content → Keywords → Output`
- **변경**: `Platform → Product → Content → Keywords → Output`

```typescript
// Step configs 수정
const stepConfigs: StepConfig[] = [
  { id: 'platform', icon: DeviceMobile },  // 신규
  { id: 'product', icon: Package },
  { id: 'content', icon: FileText },
  { id: 'keywords', icon: Tag },
  { id: 'output', icon: Export },
];
```

---

## 1.8 API Extension [UPDATE]

### TODO-P0-11: generate-v2 API 확장
- **파일**: `src/app/api/generate-v2/route.ts`
- **Request 추가**:
  ```typescript
  interface GEOv2GenerateRequest {
    // 기존...
    platform: Platform;  // 신규
  }
  ```
- **Response 추가**:
  ```typescript
  interface GEOv2GenerateResponse {
    // 기존...
    
    // YouTube 전용
    title?: YouTubeTitleResult;
    metaTags?: MetaTagsResult;
    thumbnailText?: ThumbnailTextResult;
    
    // Instagram 전용
    instagramDescription?: InstagramDescriptionResult;
    // altText already exists via imageAltResult
    engagementComments?: EngagementCommentResult;
    
    // TikTok 전용
    tiktokDescription?: TikTokDescriptionResult;
    coverText?: TikTokCoverTextResult;
    
    // Meta
    platform: Platform;
  }
  ```

### TODO-P0-12: 플랫폼별 파이프라인 분기
- **파일**: `src/app/api/generate-v2/route.ts`
- **작업**:
  ```typescript
  // 플랫폼별 생성 로직 분기
  async function generateForPlatform(platform: Platform, input: PipelineInput) {
    switch (platform) {
      case 'youtube':
        return generateYouTubeContent(input);
        // Title → Description → Timestamps → Hashtags → FAQ → MetaTags
      case 'instagram':
        return generateInstagramContent(input);
        // Description (125) → AltText → Hashtags → EngagementComments
      case 'tiktok':
        return generateTikTokContent(input);
        // Description (125) → CoverText → Hashtags
    }
  }
  ```

---

## 1.9 Output Display 플랫폼별 분기 [UPDATE]

### TODO-P0-13: Output Display 확장
- **파일**: `src/components/features/output-display.tsx`
- **작업**:
  - 플랫폼별 다른 섹션 렌더링
  - 새로운 섹션 컴포넌트 추가

```typescript
function OutputDisplay() {
  const platform = useGenerationStore((state) => state.platform);
  
  return (
    <div>
      {platform === 'youtube' && (
        <>
          <TitleSection />        {/* 신규 */}
          <DescriptionSection />
          <TimestampsSection />
          <HashtagsSection />
          <FAQSection />
          <MetaTagsSection />     {/* 신규 */}
          <ThumbnailTextSection /> {/* 신규 - P1 */}
        </>
      )}
      {platform === 'instagram' && (
        <>
          <InstagramDescriptionSection />  {/* 신규 */}
          <AltTextSection />               {/* 기존 연결 */}
          <HashtagsSection />
          <EngagementCommentsSection />    {/* 신규 - P1 */}
        </>
      )}
      {platform === 'tiktok' && (
        <>
          <TikTokDescriptionSection />  {/* 신규 - P2 */}
          <CoverTextSection />          {/* 신규 - P2 */}
          <HashtagsSection />
        </>
      )}
    </div>
  );
}
```

### TODO-P0-14: 새로운 Output Section 컴포넌트
- **파일들** (신규):
  - `src/components/features/output-sections/title-section.tsx`
  - `src/components/features/output-sections/meta-tags-section.tsx`
  - `src/components/features/output-sections/instagram-description-section.tsx`

---

## 1.10 Database Migration [NEW]

### TODO-P0-15: generations 테이블 확장
- **파일**: `supabase/migrations/xxx_add_platform_fields.sql`
- **작업**:
  ```sql
  ALTER TABLE generations ADD COLUMN platform VARCHAR(20) DEFAULT 'youtube';
  ALTER TABLE generations ADD COLUMN title JSONB;
  ALTER TABLE generations ADD COLUMN meta_tags JSONB;
  ALTER TABLE generations ADD COLUMN instagram_description JSONB;
  ALTER TABLE generations ADD COLUMN engagement_comments JSONB;
  ALTER TABLE generations ADD COLUMN tiktok_description JSONB;
  ALTER TABLE generations ADD COLUMN cover_text JSONB;
  ```

---

# 📑 Part 2: P1 - 실사용 필수 (2/23까지)

## 2.1 Thumbnail Text Suggestion [From Brief Slide 3]

### TODO-P1-1: Thumbnail Text Generator
- **파일**: `src/lib/geo-v2/thumbnail-generator.ts` (신규)
- **Brief 요구사항**: "영상/링크 입력시 썸네일 제안 가능여부"

```typescript
export interface ThumbnailTextResult {
  textOverlay: string;           // 썸네일에 표시할 텍스트
  keywords: string[];            // 포함된 키워드
  fileNameSuggestion: string;    // 파일명 제안 (SEO)
  guidelines: {
    hasKeySubject: boolean;
    hasClearText: boolean;
    isHighQuality: boolean;
    hasKeywordInFilename: boolean;
  };
}
```

## 2.2 Engagement Comments [From Brief Slide 4]

### TODO-P1-2: Engagement Comment Generator
- **파일**: `src/lib/geo-v2/engagement-comment-generator.ts` (신규)
- **Brief 요구사항**: "인게이지먼트 댓글 생성 가능 여부 (IG/LI/X)"

```typescript
export type CommentPlatform = 'instagram' | 'linkedin' | 'x';
export type CommentType = 'question' | 'cta' | 'highlight' | 'engagement';

export interface EngagementComment {
  text: string;
  platform: CommentPlatform;
  type: CommentType;
  isInfluencerCollab: boolean;
}

export interface EngagementCommentResult {
  comments: EngagementComment[];
  byPlatform: Record<CommentPlatform, EngagementComment[]>;
}
```

## 2.3 Review Workflow [From Brief Slide 2]

### TODO-P1-3: Review Mode 타입 정의
- **파일**: `src/types/geo-v2.ts`

```typescript
export type ReviewMode = 'generate' | 'review';
export type ReviewTiming = 'pre' | 'post';
export type ContentClassification = 'unpacked_event' | 'non_unpacked_general';

export interface ContentSubmissionForm {
  classification: ContentClassification;
  reviewTiming: ReviewTiming;
  publishedUrl?: string;        // 사후 검수용
  wipDescription?: string;      // 사전 검수용
  wipMedia?: File;
  includeAsset: boolean;
}
```

### TODO-P1-4: Review Mode Selector UI
- **파일**: `src/components/features/review-mode-selector.tsx` (신규)

### TODO-P1-5: Content Submission Form UI
- **파일**: `src/components/features/content-submission-form.tsx` (신규)

### TODO-P1-6: Review Result Report
- **파일**: `src/components/features/review-result-report.tsx` (신규)
- **작업**: 점검 항목별 Pass/Fail 표시

## 2.4 Schema.org Recommendations [From Strategy p.145-146]

### TODO-P1-7: Schema.org 추천 기능
- **파일**: `src/lib/geo-v2/schema-generator.ts` (신규)
- **Strategy 기반**: TechArticle, FAQPage, Organization, Product Schema

```typescript
export interface SchemaRecommendation {
  type: 'TechArticle' | 'FAQPage' | 'Product' | 'VideoObject';
  jsonLd: object;
  implementationGuide: string;
}

export function generateSchemaRecommendations(
  content: GeneratedContent,
  platform: Platform
): SchemaRecommendation[];
```

## 2.5 Query Fan-Out Optimization [From Strategy p.17]

### TODO-P1-8: Query Fan-Out 분석 및 표시
- **파일**: `src/lib/geo-v2/query-fanout.ts` (신규)
- **Strategy 기반**: "6-8 related subqueries AI systems generate"

```typescript
export interface QueryFanOut {
  primaryQuery: string;
  relatedSubqueries: string[];      // 6-8개
  addressedInContent: string[];     // FAQ에서 다룬 것
  missing: string[];                // 아직 안 다룬 것
}
```

## 2.6 Source Authority Tier Display [From Strategy p.17]

### TODO-P1-9: Source Tier 시각화
- **파일**: `src/components/features/source-tier-display.tsx` (신규)
- **작업**: 그라운딩 결과에서 소스 티어 표시

## 2.7 Additional Output Components

### TODO-P1-10: Thumbnail Section Component
- **파일**: `src/components/features/output-sections/thumbnail-section.tsx`

### TODO-P1-11: Engagement Comments Section
- **파일**: `src/components/features/output-sections/engagement-comments-section.tsx`

### TODO-P1-12: Schema Recommendations Section
- **파일**: `src/components/features/output-sections/schema-section.tsx`

---

# 📑 Part 3: P2 - 향후 (TBD)

## 3.1 TikTok Support [From Brief Slide 5 - TBD]

### TODO-P2-1: TikTok Description Generator
- **파일**: `src/lib/geo-v2/tiktok-description-generator.ts`
- **상태**: Brief에서 "TT도 솔루션 적용 가능한지 확인 필요 (TBD)"

### TODO-P2-2: TikTok Cover Text Generator
- **파일**: `src/lib/geo-v2/tiktok-cover-generator.ts`

### TODO-P2-3: TikTok Description Section
- **파일**: `src/components/features/output-sections/tiktok-description-section.tsx`

### TODO-P2-4: Cover Text Section
- **파일**: `src/components/features/output-sections/cover-text-section.tsx`

## 3.2 Channel Level Optimization [From Brief - 의견 필요]

### TODO-P2-5: Channel Name Validator
- **파일**: `src/lib/geo-v2/channel-validator.ts`
- **작업**: 채널명 키워드 포함 여부 검사

### TODO-P2-6: Channel Description Optimizer
- **파일**: `src/lib/geo-v2/channel-description-optimizer.ts`
- **작업**: 채널 소개 최적화 (YouTube 130자, Instagram 150자)

## 3.3 Advanced Features

### TODO-P2-7: Keyword Search Volume Integration
- **작업**: Strategy p.101의 검색량 데이터 통합

### TODO-P2-8: Expert Attribution Quotes
- **작업**: 프롬프트에서 생성된 전문가 인용문 추출 및 표시

---

# 📊 Updated Summary

## P0 (베타) - 15개 TODO

| ID | 작업 | 예상 공수 |
|----|------|----------|
| P0-1 | Platform 타입 정의 | 0.5일 |
| P0-2 | Store Platform 상태 | 0.25일 |
| P0-3 | Platform Selector UI | 1일 |
| P0-4 | Title Generator 모듈 | 1일 |
| P0-5 | Title 프롬프트 | 0.5일 |
| P0-6 | Meta Tags Generator | 0.5일 |
| P0-7 | Instagram Description | 1일 |
| P0-8 | Alt Text Output 연결 | 0.25일 |
| P0-9 | Hashtag Enhancement | 0.5일 |
| P0-10 | Generate Flow 수정 | 0.5일 |
| P0-11 | API Request/Response | 0.5일 |
| P0-12 | 플랫폼별 파이프라인 | 1일 |
| P0-13 | Output Display 분기 | 1일 |
| P0-14 | Output Section 컴포넌트 | 1일 |
| P0-15 | DB Migration | 0.25일 |
| **합계** | | **9.75일** |

## P1 (실사용) - 12개 TODO

| ID | 작업 | 예상 공수 |
|----|------|----------|
| P1-1 | Thumbnail Generator | 1일 |
| P1-2 | Engagement Comments | 1.5일 |
| P1-3 | Review Mode 타입 | 0.25일 |
| P1-4 | Review Mode Selector | 0.5일 |
| P1-5 | Content Submission Form | 1일 |
| P1-6 | Review Result Report | 1일 |
| P1-7 | Schema.org 추천 | 1일 |
| P1-8 | Query Fan-Out | 0.5일 |
| P1-9 | Source Tier Display | 0.5일 |
| P1-10 | Thumbnail Section | 0.5일 |
| P1-11 | Engagement Section | 0.5일 |
| P1-12 | Schema Section | 0.5일 |
| **합계** | | **8.75일** |

## P2 (향후) - 8개 TODO

- TikTok 지원 (4개)
- 채널 레벨 최적화 (2개)
- 고급 기능 (2개)

---

# 📁 File Changes Summary (Updated)

## 신규 파일 (20개)

```
src/
├── components/features/
│   ├── platform-selector.tsx              [P0-3]
│   ├── review-mode-selector.tsx           [P1-4]
│   ├── content-submission-form.tsx        [P1-5]
│   ├── review-result-report.tsx           [P1-6]
│   ├── source-tier-display.tsx            [P1-9]
│   └── output-sections/
│       ├── title-section.tsx              [P0-14]
│       ├── meta-tags-section.tsx          [P0-14]
│       ├── instagram-description-section.tsx [P0-14]
│       ├── thumbnail-section.tsx          [P1-10]
│       ├── engagement-comments-section.tsx [P1-11]
│       ├── schema-section.tsx             [P1-12]
│       ├── tiktok-description-section.tsx [P2-3]
│       └── cover-text-section.tsx         [P2-4]
├── lib/geo-v2/
│   ├── title-generator.ts                 [P0-4]
│   ├── meta-tags-generator.ts             [P0-6]
│   ├── instagram-description-generator.ts [P0-7]
│   ├── hashtag-generator.ts               [P0-9] (신규 or 개선)
│   ├── thumbnail-generator.ts             [P1-1]
│   ├── engagement-comment-generator.ts    [P1-2]
│   ├── schema-generator.ts                [P1-7]
│   ├── query-fanout.ts                    [P1-8]
│   ├── tiktok-description-generator.ts    [P2-1]
│   ├── tiktok-cover-generator.ts          [P2-2]
│   └── channel-validator.ts               [P2-5]
└── supabase/migrations/
    └── xxx_add_platform_fields.sql        [P0-15]
```

## 수정 파일 (6개)

```
src/
├── types/geo-v2.ts                        [P0-1, P1-3]
├── store/generation-store.ts              [P0-2]
├── app/(dashboard)/generate/page.tsx      [P0-10]
├── app/api/generate-v2/route.ts           [P0-11, P0-12]
├── components/features/output-display.tsx [P0-8, P0-13]
└── lib/tuning/prompt-loader.ts            [P0-5]
```

---

# ✅ Alignment Checklist

## Strategy Document Alignment

| Strategy 요구사항 | TODO | 상태 |
|------------------|------|------|
| YouTube 5요소 (Title, Desc, Timestamp, CC, Thumbnail) | P0-4,5,6,14, P1-1 | ✅ |
| Instagram 요소 (Desc 125자, Alt Text, Hashtags) | P0-7,8,9 | ✅ |
| 삼성 타이틀 구조 | P0-4,5 | ✅ |
| 해시태그 순서 (#GalaxyAI first, #Samsung last) | P0-9 | ✅ |
| Schema.org 적용 권장 | P1-7,12 | ✅ |
| Source Authority Tiers | P1-9 | ✅ |
| Query Fan-Out | P1-8 | ✅ |
| MX vs External 인용 비율 분석 | 기존 grounding-scorer.ts | ✅ |

## Solution Brief Alignment

| Brief 요구사항 | TODO | 상태 |
|---------------|------|------|
| YouTube 타이틀 제안 | P0-4,5 | ✅ |
| YouTube 메타태그 제안 | P0-6 | ✅ |
| YouTube 썸네일 제안 | P1-1,10 | ✅ |
| Instagram Description (125자) | P0-7 | ✅ |
| Instagram Alt Text | P0-8 (기존 연결) | ✅ |
| Instagram 해시태그 GEO 최적화 | P0-9 | ✅ |
| 인게이지먼트 댓글 (IG/LI/X) | P1-2,11 | ✅ |
| TikTok Description | P2-1,3 (TBD) | ✅ |
| TikTok Cover Text | P2-2,4 | ✅ |
| 사전/사후 검수 워크플로우 | P1-3,4,5,6 | ✅ |

## Current Codebase Alignment

| 기존 코드 | 활용 방안 |
|----------|----------|
| `image-alt-generator.ts` | P0-8에서 Output에 연결 |
| `usp-extraction.ts` | 기존 유지, Title/Meta에 활용 |
| `grounding-scorer.ts` | P1-9 Source Tier Display에 활용 |
| `prompt-loader.ts` | P0-5에서 Title 프롬프트 추가 |
| Samsung Standard (ContentType, VideoFormat) | 기존 유지 |

---

**문서 작성**: Claude (Clawdbot)
**v2.0 업데이트**: 2026-01-30 17:00 KST
**변경 사항**: Strategy + Brief 완전 분석 후 27개 → 35개 TODO로 확장
