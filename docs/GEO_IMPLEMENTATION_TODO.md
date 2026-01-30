# Samsung GEO Tool - Complete Implementation TODO

> **생성일**: 2026-01-30
> **목적**: GEO Solution Brief 0129 + GEO Strategy 260116 요구사항의 완벽한 구현 가이드
> **⚠️ 이 문서는 구현 계획만 포함합니다. 실제 코드 변경은 승인 후 진행합니다.**

---

# 📅 Timeline Overview

```
현재 (1/30) ─────── 2/12(목) ─────── 2/13(금) ─────── 2/23(월)
                    베타 오픈        광고주 공유       실사용 시작
                    [D-13]          [D-14]           [D-24]
```

---

# 🎯 Priority Matrix

| Priority | 정의 | 기한 |
|----------|------|------|
| **P0** | 베타 필수 기능 | 2/12 |
| **P1** | 실사용 필수 기능 | 2/23 |
| **P2** | 향후 개선 | TBD |

---

# 📑 Part 1: Solution Brief 슬라이드별 TODO

## Slide 2: Task 1 - GEO 검수 방식

### 요구사항 원문
```
채널: 삼성 글로벌 YouTube/Instagram/TikTok 내 무선 콘텐츠
방식: 보안이 중요한 콘텐츠들은 사후, 그렇지 않은 콘텐츠들은 사전 검수 진행
      & 인풋에 어셋 자체를 넣을지 등도 선택 가능하도록 개발
디스크립션의 경우 카피 토날리티도 검수 진행 okayed
디스크립션 카피 없는 상태에서도 카피 제안 가능
```

### TODO List

#### TODO-1.1: 검수 모드 타입 정의 [P1]
- **파일**: `src/types/geo-v2.ts`
- **작업**:
  ```typescript
  // 추가할 타입
  export type ReviewMode = 'generate' | 'review';
  export type ReviewTiming = 'pre' | 'post';
  export type ContentClassification = 'unpacked_event' | 'non_unpacked_general';
  ```

#### TODO-1.2: Content Submission Form 타입 정의 [P1]
- **파일**: `src/types/geo-v2.ts`
- **작업**:
  ```typescript
  export interface ContentSubmissionForm {
    classification: ContentClassification;
    reviewTiming: ReviewTiming;
    
    // 사후 검수용
    publishedUrl?: string;
    
    // 사전 검수용
    wipDescription?: string;
    productInfo?: {
      text: string;
      playbookRef?: string;
    };
    wipMedia?: {
      type: 'video' | 'image';
      file?: File;
      url?: string;
    };
    
    // 공통
    includeAsset: boolean;
  }
  ```

#### TODO-1.3: Store에 검수 모드 상태 추가 [P1]
- **파일**: `src/store/generation-store.ts`
- **작업**:
  ```typescript
  // 추가할 상태
  reviewMode: ReviewMode;
  reviewTiming: ReviewTiming;
  contentClassification: ContentClassification;
  contentSubmissionForm: ContentSubmissionForm | null;
  
  // 추가할 액션
  setReviewMode: (mode: ReviewMode) => void;
  setReviewTiming: (timing: ReviewTiming) => void;
  setContentClassification: (classification: ContentClassification) => void;
  setContentSubmissionForm: (form: ContentSubmissionForm) => void;
  ```

#### TODO-1.4: 검수 모드 선택 UI 컴포넌트 [P1]
- **파일**: `src/components/features/review-mode-selector.tsx` (신규)
- **작업**:
  - 생성 모드 / 검수 모드 라디오 버튼
  - 검수 모드 선택 시 사전/사후 선택 표시
  - 콘텐츠 분류 선택 (UNPK/Event vs 일반)

#### TODO-1.5: Content Submission Form UI [P1]
- **파일**: `src/components/features/content-submission-form.tsx` (신규)
- **작업**:
  - 사후 검수: 콘텐츠 URL 입력 필드
  - 사전 검수: WIP Description, 제품 정보, 미디어 업로드
  - "어셋 포함" 체크박스

#### TODO-1.6: 카피 없이도 제안 가능 로직 [P1]
- **파일**: `src/app/api/generate-v2/route.ts`
- **작업**:
  - `wipDescription`이 비어있어도 제품 정보만으로 생성 가능하도록 수정
  - 플레이북 기반 카피 제안 로직 추가

---

## Slide 3: Task 2 - GEO 검수 영역 (YouTube)

### 요구사항 테이블

| 점검요소 | Feasibility 요청 | TODO ID |
|----------|-----------------|---------|
| 채널명 | 의견 필요 | TODO-2.1 |
| 채널 소개 | 의견 필요 | TODO-2.2 |
| 썸네일 | 썸네일 제안 가능여부 | TODO-2.3 |
| 메타태그 | 메타태그 제안 가능 여부 | TODO-2.4 |
| 타이틀 | 타이틀 제안 가능 여부 | TODO-2.5 |
| 디스크립션 | 개발 중 | TODO-2.6 |
| 자막 | SRT 파일 유무 별도 수집 | TODO-2.7 |

### TODO List

#### TODO-2.1: 채널명 키워드 검사 기능 [P2]
- **파일**: `src/lib/geo-v2/channel-validator.ts` (신규)
- **작업**:
  - 채널명에서 브랜드명, 제품명 키워드 포함 여부 검사
  - 검사 결과 반환 (pass/fail + 권장 키워드)
- **상태**: 의견 필요 → 보류

#### TODO-2.2: 채널 소개 분석 기능 [P2]
- **파일**: `src/lib/geo-v2/channel-validator.ts`
- **작업**:
  - 첫 130자 이내 핵심 내용 분석
  - 키워드(제품명/기능명) 포함 여부 검사
- **상태**: 의견 필요 → 보류

#### TODO-2.3: 썸네일 제안 기능 [P1]
- **파일**: `src/lib/geo-v2/thumbnail-generator.ts` (신규)
- **작업**:
  ```typescript
  export interface ThumbnailSuggestion {
    textOverlay: string;           // 썸네일에 표시할 텍스트
    keywords: string[];            // 포함된 핵심 키워드
    fileNameSuggestion: string;    // ex: "galaxy-s26-ultra-ai-camera-review.jpg"
    guidelines: {
      useGlobalThumbnail: boolean;
      hasKeySubject: boolean;
      hasClearText: boolean;
      isHighQuality: boolean;
    };
  }
  
  export function generateThumbnailSuggestion(
    productName: string,
    keywords: string[],
    contentType: string
  ): ThumbnailSuggestion;
  ```
- **API 변경**: `generate-v2/route.ts`에 썸네일 제안 추가
- **UI 변경**: `output-display.tsx`에 썸네일 섹션 추가

#### TODO-2.4: 메타태그 생성 기능 [P0]
- **파일**: `src/lib/geo-v2/meta-tags-generator.ts` (신규)
- **작업**:
  ```typescript
  export interface MetaTagsResult {
    tags: string[];
    categories: {
      brand: string[];      // Samsung, Galaxy
      product: string[];    // S26 Ultra, Galaxy Z Flip
      feature: string[];    // AI, Camera, Battery
      generic: string[];    // smartphone, mobile phone
    };
    totalCount: number;
    geoOptimized: boolean;
  }
  
  export function generateMetaTags(
    productName: string,
    keywords: string[],
    contentType: string
  ): MetaTagsResult;
  ```
- **프롬프트**: `src/lib/tuning/prompt-loader.ts`에 메타태그 생성 프롬프트 추가
- **API 변경**: `generate-v2/route.ts`에 메타태그 생성 단계 추가
- **UI 변경**: `output-display.tsx`에 메타태그 섹션 추가

#### TODO-2.5: 타이틀 생성 기능 [P0]
- **파일**: `src/lib/geo-v2/title-generator.ts` (신규)
- **작업**:
  ```typescript
  export interface YouTubeTitleResult {
    primary: string;           // 메인 추천 타이틀
    alternatives: string[];    // 대안 2-3개
    keywords: string[];        // 포함된 키워드
    structure: {
      valid: boolean;          // 삼성 구조 준수 여부
      template: string;        // 사용된 템플릿
    };
    charCount: number;
    keywordPosition: 'front' | 'middle' | 'back';
  }
  
  // 삼성 타이틀 구조
  const SAMSUNG_TITLE_STRUCTURE = '[Primary Keyword] | [Feature] | [Product Name] | Samsung';
  
  export function generateYouTubeTitle(
    productName: string,
    keywords: string[],
    contentType: string,
    srtContent?: string
  ): YouTubeTitleResult;
  ```
- **점검 기준 구현**:
  - 특정 키워드 포함 여부 점검
  - 특정 구조 사용 여부 점검 (ex: `Galaxy AI | Feature Name | Product Name | Samsung`)
  - 제품명/기능명 핵심 키워드를 최소 1개 이상 앞쪽에 배치
  - 간결하고 명확한 작성 여부 (60자 이내 권장)
- **프롬프트**: 타이틀 생성 전용 프롬프트 추가
- **API 변경**: `generate-v2/route.ts`에 타이틀 생성 단계 추가
- **UI 변경**: `output-display.tsx`에 타이틀 섹션 추가 (메인 + 대안)

#### TODO-2.6: 디스크립션 개선 [P0]
- **파일**: `src/lib/geo-v2/description-generator.ts` (기존 개선)
- **작업**:
  - 첫 130자 키워드 밀도 검사 추가
  - Timestamp 키워드 포함 여부 검사 추가
  - Step by Step 형식 자동 감지 (How-to 콘텐츠)
- **점검 기준 구현**:
  ```typescript
  export interface DescriptionValidation {
    first130Chars: {
      text: string;
      keywords: string[];
      keywordCount: number;
      hasProductName: boolean;
      hasFeatureName: boolean;
    };
    faq: {
      count: number;
      format: 'Q:/A:';
      valid: boolean;
    };
    timestamp: {
      hasTimestamp: boolean;
      keywordsInTimestamp: string[];
    };
    stepByStep: {
      isHowTo: boolean;
      hasSteps: boolean;
      stepCount: number;
    };
  }
  ```

#### TODO-2.7: SRT 파일 상태 표시 [P0]
- **파일**: `src/components/features/srt-input.tsx`
- **작업**:
  - SRT 파일 유무 상태 명확히 표시
  - SRT 없이도 진행 가능하지만 경고 표시

---

## Slide 4: Task 2 - GEO 검수 영역 (Instagram)

### 요구사항 테이블

| 점검요소 | Feasibility 요청 | TODO ID |
|----------|-----------------|---------|
| Setting | 별도 확인 | N/A (외부) |
| 채널명 | 의견 필요 | TODO-3.1 |
| 채널 소개 | 의견 필요 | TODO-3.2 |
| 외부 링크 | 별도 확인 | N/A (외부) |
| Alt text | Alt text 제안 가능 여부 | TODO-3.3 |
| 자막 | 별도 확인 | N/A (외부) |
| 디스크립션 | 개발 중 | TODO-3.4 |
| 해시태그 | 해시태그 제안 가능 여부 | TODO-3.5 |
| 장소 태그 | 별도 확인 | N/A (외부) |
| 인게이지먼트 댓글 | 댓글 생성 가능 여부 | TODO-3.6 |

### TODO List

#### TODO-3.1: Instagram 채널명 검사 [P2]
- **상태**: 의견 필요 → 보류
- **작업**: 30자 이내, 키워드 조합 검사

#### TODO-3.2: Instagram 채널 소개 검사 [P2]
- **상태**: 의견 필요 → 보류
- **작업**: 150자 이내, 브랜드명+제품 키워드 검사

#### TODO-3.3: Alt Text 생성 기능 [P0]
- **파일**: `src/lib/geo-v2/alt-text-generator.ts` (신규)
- **작업**:
  ```typescript
  export interface AltTextResult {
    text: string;              // 생성된 alt text
    charCount: number;         // 글자 수 (150자 이내)
    keywords: string[];        // 포함된 키워드
    visualElements: string[];  // 설명된 시각 요소
    structure: {
      hasProductName: boolean;
      hasSceneDescription: boolean;
      hasKeywords: boolean;
    };
  }
  
  export function generateAltText(
    productName: string,
    keywords: string[],
    contentContext: string,    // SRT 또는 설명
    mediaType: 'video' | 'image'
  ): AltTextResult;
  ```
- **점검 기준 구현**:
  - 사용 여부 체크
  - 특정 키워드 사용 여부
  - 제품명 + 장면설명 + 키워드 포함
  - 150자 이내 여부
- **프롬프트**: Alt text 생성 전용 프롬프트 추가
- **API 변경**: `generate-v2/route.ts`에 Alt text 생성 단계 추가
- **UI 변경**: `output-display.tsx`에 Alt text 섹션 추가

#### TODO-3.4: Instagram 디스크립션 생성 [P0]
- **파일**: `src/lib/geo-v2/instagram-description-generator.ts` (신규)
- **작업**:
  ```typescript
  export interface InstagramDescriptionResult {
    primary: string;           // 첫 125글자 (접히기 전 표시)
    extended: string;          // 전체 디스크립션
    charCount: number;
    validation: {
      first125Chars: {
        text: string;
        hasCoreMesage: boolean;
        keywords: string[];
        hasCTA: boolean;
        hasBrandName: boolean;
        hasProductName: boolean;
        hasFeatureName: boolean;
      };
    };
  }
  
  export function generateInstagramDescription(
    productName: string,
    keywords: string[],
    contentContext: string
  ): InstagramDescriptionResult;
  ```
- **점검 기준 구현**:
  - 첫 125글자에 핵심메시지 포함
  - 키워드(제품명/기능/브랜드명 등) 포함
  - CTA 포함 여부

#### TODO-3.5: Instagram 해시태그 개선 [P0]
- **파일**: `src/lib/geo-v2/hashtag-generator.ts` (기존 개선)
- **작업**:
  ```typescript
  export interface InstagramHashtagResult {
    hashtags: string[];
    validation: {
      officialHashtagsIncluded: string[];  // 공식 해시태그 포함 여부
      totalCount: number;                   // 사용한 해시태그 개수
      geoOptimized: string[];              // GEO 서치에 유효한 해시태그
    };
    guidelines: {
      recommendedCount: number;            // 권장 개수 (인스타그램 기준)
      maxCount: number;                    // 최대 개수
    };
  }
  
  // 공식 해시태그 목록 (플레이북에서 가져오기)
  const OFFICIAL_HASHTAGS = ['#Samsung', '#GalaxyAI', '#GalaxyS26', ...];
  ```
- **점검 기준 구현**:
  - 공식 해시태그 사용 여부
  - 사용한 해시태그 개수
  - GEO 서치에 유효한 해시태그 + 공식 해시태그 입력 + 해시태그 개수 가이드 적용

#### TODO-3.6: 인게이지먼트 댓글 생성 [P1]
- **파일**: `src/lib/geo-v2/engagement-comment-generator.ts` (신규)
- **작업**:
  ```typescript
  export type CommentPlatform = 'instagram' | 'linkedin' | 'x';
  export type CommentType = 'question' | 'cta' | 'highlight' | 'engagement';
  
  export interface EngagementComment {
    text: string;
    platform: CommentPlatform;
    type: CommentType;
  }
  
  export interface EngagementCommentResult {
    comments: EngagementComment[];
    byPlatform: {
      instagram: EngagementComment[];
      linkedin: EngagementComment[];
      x: EngagementComment[];
    };
  }
  
  export function generateEngagementComments(
    productName: string,
    keywords: string[],
    contentContext: string,
    isInfluencerCollab: boolean,
    platforms: CommentPlatform[]
  ): EngagementCommentResult;
  ```
- **점검 기준**:
  - 소비자 인게이지를 높일 수 있는 댓글 생성
  - 인플루언서 콜랩 영상의 경우 특별 처리
  - IG/LI/X 플랫폼별 톤 조정
- **프롬프트**: 인게이지먼트 댓글 생성 전용 프롬프트 추가
- **API 변경**: `generate-v2/route.ts`에 댓글 생성 단계 추가
- **UI 변경**: `output-display.tsx`에 댓글 섹션 추가 (플랫폼별 탭)

---

## Slide 5: Task 2 - GEO 검수 영역 (TikTok)

### 요구사항 테이블

| 점검요소 | Feasibility 요청 | TODO ID |
|----------|-----------------|---------|
| 채널명 | 의견 필요 | TODO-4.1 |
| 채널 소개 | 의견 필요 | TODO-4.2 |
| 외부 링크 | 별도 확인 | N/A (외부) |
| 자막 | 별도 확인 | N/A (외부) |
| 디스크립션 | TT도 솔루션 적용 가능한지 확인 필요 (TBD) | TODO-4.3 |
| 썸네일/커버 텍스트 | 썸네일/커버 텍스트 제안 가능 여부 | TODO-4.4 |

### TODO List

#### TODO-4.1: TikTok 채널명 검사 [P2]
- **상태**: 의견 필요 → 보류

#### TODO-4.2: TikTok 채널 소개 검사 [P2]
- **상태**: 의견 필요 → 보류

#### TODO-4.3: TikTok 디스크립션 생성 [P2]
- **파일**: `src/lib/geo-v2/tiktok-description-generator.ts` (신규)
- **상태**: TBD - 확인 필요
- **작업** (확인 후):
  ```typescript
  export interface TikTokDescriptionResult {
    primary: string;           // 첫 125글자
    charCount: number;
    validation: {
      first125Chars: {
        text: string;
        hasCoreMesage: boolean;
        keywords: string[];
        hasCTA: boolean;
      };
    };
  }
  ```

#### TODO-4.4: TikTok 커버 텍스트 제안 [P2]
- **파일**: `src/lib/geo-v2/tiktok-cover-generator.ts` (신규)
- **작업**:
  ```typescript
  export interface TikTokCoverTextResult {
    text: string;              // 커버에 삽입할 키워드형 문구
    keywords: string[];
    maxLength: number;
  }
  
  export function generateTikTokCoverText(
    productName: string,
    keywords: string[],
    contentType: string
  ): TikTokCoverTextResult;
  ```
- **점검 기준**:
  - 영상 표지에 키워드형 문구 직접 삽입 여부

---

## Slide 6: Task 3 - Final Notes

### TODO List

#### TODO-5.1: 콘텐츠 제작팀 요청 자료 정리 문서 [P1]
- **파일**: `docs/CONTENT_TEAM_REQUIREMENTS.md` (신규)
- **작업**:
  - 사전 검수 시 필요 자료 목록
  - 사후 검수 시 필요 자료 목록
  - Content Submission Form 사용 가이드

#### TODO-5.2: 광고주 추가 자료 수급 정리 [P1]
- **파일**: `docs/ADVERTISER_REQUIREMENTS.md` (신규)
- **작업**:
  - 인게이지먼트 댓글 가이드 요청
  - 공식 해시태그 목록 요청
  - 기타 가이드 요청

---

# 📑 Part 2: GEO Strategy 기반 추가 TODO

## YouTube 최적화 (Pages 95-105)

#### TODO-6.1: YouTube 채널 소개 템플릿 제공 [P2]
- **참조**: Page 99
- **작업**:
  ```typescript
  // 채널 소개 템플릿 (Strategy 기반)
  const CHANNEL_DESCRIPTION_TEMPLATE = `
  Welcome to Samsung's official YouTube channel.
  
  We are leading the era of the AI Phone, redefining how people
  create, connect, and communicate.
  Through Galaxy AI, we bring meaningful innovations to billions of
  users worldwide — unlocking new possibilities every day.
  
  Discover our latest products, stories, and experiences that shape
  the future.
  
  #Samsung #GalaxyAI #AIPhone
  `;
  ```

#### TODO-6.2: 키워드 검색량 데이터 통합 [P2]
- **참조**: Page 101
- **작업**:
  - 키워드별 검색량 데이터 표시
  - 그라운딩 결과에 검색량 정보 추가

## Dotcom Schema 적용 (Pages 145-150)

#### TODO-6.3: Schema.org 적용 가이드 문서 [P2]
- **참조**: Pages 145-146
- **파일**: `docs/SCHEMA_ORG_GUIDE.md` (신규)
- **작업**:
  - TechArticle Schema 가이드
  - FAQPage Schema 가이드
  - Organization Schema 가이드
  - ContactPoint Schema 가이드

---

# 📑 Part 3: 공통 인프라 TODO

## 플랫폼 선택 시스템

#### TODO-7.1: Platform 타입 및 설정 [P0]
- **파일**: `src/types/geo-v2.ts`
- **작업**:
  ```typescript
  export type Platform = 'youtube' | 'instagram' | 'tiktok';
  
  export const PLATFORM_CONFIG: Record<Platform, {
    name: string;
    nameKo: string;
    icon: string;
    outputs: string[];
    charLimits: {
      title?: number;
      description: number;
      altText?: number;
    };
  }> = {
    youtube: {
      name: 'YouTube',
      nameKo: '유튜브',
      icon: '📺',
      outputs: ['title', 'description', 'timestamps', 'hashtags', 'faq', 'metaTags', 'thumbnailSuggestion'],
      charLimits: {
        title: 60,
        description: 5000,
      }
    },
    instagram: {
      name: 'Instagram',
      nameKo: '인스타그램',
      icon: '📸',
      outputs: ['description', 'altText', 'hashtags', 'engagementComments'],
      charLimits: {
        description: 2200,
        altText: 150,
      }
    },
    tiktok: {
      name: 'TikTok',
      nameKo: '틱톡',
      icon: '🎵',
      outputs: ['description', 'coverText', 'hashtags'],
      charLimits: {
        description: 2200,
      }
    }
  };
  ```

#### TODO-7.2: Store에 Platform 상태 추가 [P0]
- **파일**: `src/store/generation-store.ts`
- **작업**:
  ```typescript
  // 추가할 상태
  platform: Platform;
  
  // 추가할 액션
  setPlatform: (platform: Platform) => void;
  ```

#### TODO-7.3: Platform Selector UI [P0]
- **파일**: `src/components/features/platform-selector.tsx` (신규)
- **작업**:
  - YouTube / Instagram / TikTok 선택 카드
  - 선택된 플랫폼 하이라이트
  - 플랫폼별 출력 항목 미리보기

## Generation Flow 수정

#### TODO-7.4: Generate Page Flow 수정 [P0]
- **파일**: `src/app/(dashboard)/generate/page.tsx`
- **작업**:
  - 현재: Product → Content → Keywords → Output
  - 변경: **Platform** → Product → Content → Keywords → Output
  - Step indicator에 Platform 추가

## API 수정

#### TODO-7.5: generate-v2 API 확장 [P0]
- **파일**: `src/app/api/generate-v2/route.ts`
- **작업**:
  ```typescript
  // Request에 추가
  interface GenerateV2Request {
    // 기존...
    platform: Platform;
  }
  
  // Response 확장
  interface GenerateV2Response {
    // 기존 (YouTube 기본)
    description: { full: string; first130?: string; first125?: string; };
    chapters?: { timestamps: string; };
    hashtags: string[];
    faq?: { faqs: FAQItem[]; };
    
    // 신규 - YouTube
    title?: YouTubeTitleResult;
    metaTags?: MetaTagsResult;
    thumbnailSuggestion?: ThumbnailSuggestion;
    
    // 신규 - Instagram
    instagramDescription?: InstagramDescriptionResult;
    altText?: AltTextResult;
    engagementComments?: EngagementCommentResult;
    
    // 신규 - TikTok
    tiktokDescription?: TikTokDescriptionResult;
    coverText?: TikTokCoverTextResult;
    
    // 메타
    platform: Platform;
    validationResults?: ValidationResults;
  }
  ```

#### TODO-7.6: 플랫폼별 생성 파이프라인 분기 [P0]
- **파일**: `src/app/api/generate-v2/route.ts`
- **작업**:
  ```typescript
  // 플랫폼별 파이프라인 분기
  switch (platform) {
    case 'youtube':
      // Title → Description → Timestamps → Hashtags → FAQ → MetaTags → Thumbnail
      break;
    case 'instagram':
      // Description (125) → AltText → Hashtags → EngagementComments
      break;
    case 'tiktok':
      // Description (125) → CoverText → Hashtags
      break;
  }
  ```

## Output Display 수정

#### TODO-7.7: Output Display 플랫폼별 분기 [P0]
- **파일**: `src/components/features/output-display.tsx`
- **작업**:
  - 플랫폼별 다른 섹션 렌더링
  - YouTube: Title, Description, Timestamps, Hashtags, FAQ, MetaTags, Thumbnail
  - Instagram: Description, AltText, Hashtags, EngagementComments
  - TikTok: Description, CoverText, Hashtags
  - 각 섹션별 복사 버튼

#### TODO-7.8: 새로운 Output 섹션 컴포넌트들 [P0]
- **파일들**:
  - `src/components/features/output-sections/title-section.tsx` (신규)
  - `src/components/features/output-sections/meta-tags-section.tsx` (신규)
  - `src/components/features/output-sections/alt-text-section.tsx` (신규)
  - `src/components/features/output-sections/engagement-comments-section.tsx` (신규)
  - `src/components/features/output-sections/thumbnail-section.tsx` (신규)
  - `src/components/features/output-sections/cover-text-section.tsx` (신규)

## 프롬프트 시스템 확장

#### TODO-7.9: 플랫폼별 프롬프트 템플릿 [P0]
- **파일**: `src/lib/tuning/prompt-loader.ts`
- **작업**:
  - YouTube Title 프롬프트
  - YouTube MetaTags 프롬프트
  - Instagram Description 프롬프트
  - Instagram AltText 프롬프트
  - Instagram/LI/X Engagement Comments 프롬프트
  - TikTok Description 프롬프트
  - TikTok CoverText 프롬프트
  - Thumbnail Suggestion 프롬프트

---

# 📑 Part 4: Database 변경 TODO

#### TODO-8.1: generations 테이블 확장 [P0]
- **파일**: `supabase/migrations/xxx_add_platform_fields.sql` (신규)
- **작업**:
  ```sql
  -- Platform 필드 추가
  ALTER TABLE generations ADD COLUMN platform VARCHAR(20) DEFAULT 'youtube';
  
  -- 새로운 출력물 필드 추가
  ALTER TABLE generations ADD COLUMN title JSONB;
  ALTER TABLE generations ADD COLUMN meta_tags JSONB;
  ALTER TABLE generations ADD COLUMN thumbnail_suggestion JSONB;
  ALTER TABLE generations ADD COLUMN instagram_description JSONB;
  ALTER TABLE generations ADD COLUMN alt_text JSONB;
  ALTER TABLE generations ADD COLUMN engagement_comments JSONB;
  ALTER TABLE generations ADD COLUMN tiktok_description JSONB;
  ALTER TABLE generations ADD COLUMN cover_text JSONB;
  ```

#### TODO-8.2: 검수 결과 테이블 [P1]
- **파일**: `supabase/migrations/xxx_add_reviews_table.sql` (신규)
- **작업**:
  ```sql
  CREATE TABLE geo_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID REFERENCES generations(id),
    platform VARCHAR(20) NOT NULL,
    review_type VARCHAR(20) NOT NULL,  -- 'pre' | 'post'
    content_url TEXT,
    
    -- 점검 항목별 결과
    checks JSONB NOT NULL,
    overall_score INTEGER,
    
    -- 메타데이터
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  CREATE INDEX idx_reviews_generation ON geo_reviews(generation_id);
  CREATE INDEX idx_reviews_platform ON geo_reviews(platform);
  ```

---

# 📑 Part 5: 테스트 TODO

#### TODO-9.1: 유닛 테스트 추가 [P1]
- **파일들**:
  - `src/lib/geo-v2/__tests__/title-generator.test.ts`
  - `src/lib/geo-v2/__tests__/meta-tags-generator.test.ts`
  - `src/lib/geo-v2/__tests__/alt-text-generator.test.ts`
  - `src/lib/geo-v2/__tests__/instagram-description-generator.test.ts`
  - `src/lib/geo-v2/__tests__/engagement-comment-generator.test.ts`

#### TODO-9.2: E2E 테스트 추가 [P1]
- **파일**: `tests/e2e-platform-generation.spec.ts` (신규)
- **작업**:
  - YouTube 전체 플로우 테스트
  - Instagram 전체 플로우 테스트
  - TikTok 전체 플로우 테스트

#### TODO-9.3: 검증 테스트 추가 [P1]
- **작업**:
  - 삼성 타이틀 구조 검증
  - 글자 수 제한 검증 (130자, 125자, 150자)
  - 필수 키워드 포함 검증

---

# 📊 Summary: TODO by Priority

## P0 - 베타 필수 (2/12까지, 13일)

| TODO ID | 설명 | 예상 공수 |
|---------|------|----------|
| TODO-7.1 | Platform 타입 및 설정 | 0.5일 |
| TODO-7.2 | Store에 Platform 상태 추가 | 0.5일 |
| TODO-7.3 | Platform Selector UI | 1일 |
| TODO-7.4 | Generate Page Flow 수정 | 0.5일 |
| TODO-2.5 | 타이틀 생성 기능 | 1일 |
| TODO-2.4 | 메타태그 생성 기능 | 0.5일 |
| TODO-3.4 | Instagram 디스크립션 생성 | 1일 |
| TODO-3.3 | Alt Text 생성 기능 | 1일 |
| TODO-3.5 | Instagram 해시태그 개선 | 0.5일 |
| TODO-7.5 | generate-v2 API 확장 | 1일 |
| TODO-7.6 | 플랫폼별 생성 파이프라인 | 1일 |
| TODO-7.7 | Output Display 플랫폼별 분기 | 1일 |
| TODO-7.8 | 새로운 Output 섹션 컴포넌트 | 1일 |
| TODO-7.9 | 플랫폼별 프롬프트 템플릿 | 1일 |
| TODO-8.1 | DB 테이블 확장 | 0.5일 |
| TODO-2.6 | 디스크립션 개선 | 0.5일 |
| TODO-2.7 | SRT 파일 상태 표시 | 0.5일 |

**P0 총 예상: 12.5일** ⚠️ 촉박함

## P1 - 실사용 필수 (2/23까지, 24일)

| TODO ID | 설명 | 예상 공수 |
|---------|------|----------|
| TODO-1.1~1.6 | 검수 모드 전체 | 3일 |
| TODO-2.3 | 썸네일 제안 기능 | 2일 |
| TODO-3.6 | 인게이지먼트 댓글 생성 | 2일 |
| TODO-5.1~5.2 | 문서화 | 1일 |
| TODO-8.2 | 검수 결과 테이블 | 0.5일 |
| TODO-9.1~9.3 | 테스트 | 2일 |

**P1 총 예상: 10.5일**

## P2 - 향후 개선

| TODO ID | 설명 |
|---------|------|
| TODO-2.1~2.2 | 채널명/소개 검사 (YouTube) |
| TODO-3.1~3.2 | 채널명/소개 검사 (Instagram) |
| TODO-4.1~4.4 | TikTok 전체 |
| TODO-6.1~6.3 | Strategy 기반 추가 기능 |

---

# 📁 File Change Summary

## 신규 파일

```
src/
├── components/features/
│   ├── platform-selector.tsx          [P0]
│   ├── review-mode-selector.tsx       [P1]
│   ├── content-submission-form.tsx    [P1]
│   └── output-sections/
│       ├── title-section.tsx          [P0]
│       ├── meta-tags-section.tsx      [P0]
│       ├── alt-text-section.tsx       [P0]
│       ├── engagement-comments-section.tsx [P1]
│       ├── thumbnail-section.tsx      [P1]
│       └── cover-text-section.tsx     [P2]
├── lib/geo-v2/
│   ├── title-generator.ts             [P0]
│   ├── meta-tags-generator.ts         [P0]
│   ├── alt-text-generator.ts          [P0]
│   ├── instagram-description-generator.ts [P0]
│   ├── hashtag-generator.ts           [P0] (기존 개선)
│   ├── engagement-comment-generator.ts [P1]
│   ├── thumbnail-generator.ts         [P1]
│   ├── tiktok-description-generator.ts [P2]
│   ├── tiktok-cover-generator.ts      [P2]
│   └── channel-validator.ts           [P2]
└── types/
    └── geo-v2.ts                      [P0] (확장)

supabase/migrations/
├── xxx_add_platform_fields.sql        [P0]
└── xxx_add_reviews_table.sql          [P1]

docs/
├── CONTENT_TEAM_REQUIREMENTS.md       [P1]
├── ADVERTISER_REQUIREMENTS.md         [P1]
└── SCHEMA_ORG_GUIDE.md               [P2]
```

## 수정 파일

```
src/
├── store/generation-store.ts          [P0]
├── app/(dashboard)/generate/page.tsx  [P0]
├── app/api/generate-v2/route.ts       [P0]
├── components/features/
│   ├── output-display.tsx             [P0]
│   ├── srt-input.tsx                  [P0]
│   └── product-selector.tsx           [P0]
└── lib/tuning/prompt-loader.ts        [P0]
```

---

**문서 작성**: Claude (Clawdbot)
**최종 수정**: 2026-01-30 16:10 KST
**⚠️ 이 문서는 구현 계획입니다. 승인 후 구현을 진행합니다.**
