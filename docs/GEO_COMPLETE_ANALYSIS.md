# Samsung GEO Tool - Complete Analysis & Implementation Guide

> **문서 생성일**: 2026-01-30
> **버전**: 1.0
> **분석 대상**:
> - GEO Solution Brief_Cheil_0129.pptx (7 슬라이드)
> - 2026 and Miracle MX SEO GEO Strategy_KO_260116.pdf (242 페이지)
> **목적**: Samsung GEO Tool 구현을 위한 완벽한 요구사항 분석 및 구현 가이드

---

# 📑 Part 1: GEO Solution Brief 0129 - 슬라이드별 상세 분석

## Slide 1: Cover Page

```
MX Social
GEO Solution Additional Brief
2026. 01 |
```

**해석:**
- MX (Mobile eXperience) Social 팀의 추가 요청 브리프
- 기존 GEO Tool에 대한 확장 요구사항
- 2026년 1월 기준

---

## Slide 2: Task 1 - GEO 검수 방식

### 원문 내용

| 항목 | 내용 |
|------|------|
| **채널** | 삼성 글로벌 YouTube/Instagram/TikTok 내 무선 콘텐츠 |
| **향후 계획** | 로컬 소셜채널 콘텐츠에도 적용 예정 |

### 검수 방식 상세

| 방식 | 설명 |
|------|------|
| **사후 검수** | 보안이 중요한 콘텐츠 (UNPK/Event 신제품 관련) |
| **사전 검수** | 그렇지 않은 콘텐츠 (Non UNPK/Event 일반) |

### 입력 자료 매트릭스

| 콘텐츠 분류 | 활용 시기 | 입력 자료 |
|-------------|-----------|-----------|
| **UNPK/Event 신제품** | 사후 검수 | 게재된 콘텐츠 링크 |
| **Non UNPK/Event 일반** | 사전 검수 | Content Submission Form |

### Content Submission Form 입력 항목

1. **WIP 디스크립션 카피** - 카피 초안 ~ 최종
2. **주요 제품 정보** - text 입력 & 플레이북
3. **WIP 영상/이미지** - 미완성 어셋

### 추가 요구사항

- ✅ **인풋에 어셋 자체를 넣을지 등도 선택 가능하도록 개발**
- ✅ **디스크립션의 경우 카피 토날리티도 검수 진행** (okayed)
- ✅ **디스크립션 카피 없는 상태에서도 카피 제안 가능**

### 🔧 구현 요구사항 (samsung-geo-tool)

```typescript
// 새로운 타입 정의 필요
export type ReviewType = 'pre' | 'post';
export type ContentClassification = 'unpacked_event' | 'non_unpacked_general';

export interface ContentSubmissionForm {
  // 콘텐츠 분류
  classification: ContentClassification;
  
  // 사후 검수용
  publishedContentUrl?: string;
  
  // 사전 검수용
  wipDescription?: string;           // 카피 초안~최종
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
  includeAsset: boolean;             // 어셋 포함 여부 선택
}
```

---

## Slide 3: Task 2 - GEO 검수 영역 (YouTube)

### 전체 점검 요소 매트릭스

| 점검요소 | 점검기준 | Feasibility | 구현 상태 |
|----------|----------|-------------|-----------|
| **채널명** | 특정 키워드(브랜드명, 제품명 등) 포함 여부 | 의견 필요 | ⏸️ 보류 |
| **채널 소개** | 첫 130자 이내 핵심 내용과 키워드(제품명/기능명) 포함 여부 | 의견 필요 | ⏸️ 보류 |
| **썸네일** | (아래 상세) | **영상/링크 입력시 썸네일 제안 가능여부** | 🔴 P1 |
| **메타태그** | 특정 메타태그 포함하였는지 점검 | **영상/링크 및 카피 입력 시 메타태그 제안 가능 여부** | 🔴 P0 |
| **타이틀** | (아래 상세) | **적절한 타이틀 제안 가능 여부** | 🔴 P0 |
| **디스크립션** | (아래 상세) | **개발 중** | ✅ 진행중 |
| **자막** | closed caption 형식(SRT) 자막 적용 여부 | SRT 파일 유무 별도 수집 | ✅ 구현됨 |

### 썸네일 점검 상세

| 점검 항목 | 설명 |
|-----------|------|
| 글로벌 동일 썸네일 | 글로벌과 동일 썸네일 사용 여부 |
| 핵심주체 노출 | 핵심주체를 노출하는 이미지와 함께 크고 명확한 텍스트 사용 여부 |
| 고화질 | 고화질 썸네일 파일 사용 여부 |
| 키워드 파일명 | 썸네일 이미지 파일 이름에 핵심 키워드 포함 여부 |

### 타이틀 점검 상세

| 점검 항목 | 설명 |
|-----------|------|
| 키워드 포함 | 특정 키워드 포함 여부 점검 |
| 삼성 구조 | 특정 구조 사용 여부 점검 |
| 구조 예시 | `Galaxy AI \| Feature Name \| Product Name \| Samsung` |
| 핵심 키워드 위치 | 제품명/기능명과 같은 핵심 키워드를 최소 1개 이상 **앞쪽에 배치** |
| 간결성 | 간결하고 명확하게 작성하였는지 여부 |

### 디스크립션 점검 상세

| 점검 항목 | 설명 | 현재 상태 |
|-----------|------|-----------|
| 첫 130자 키워드 | 게시내용 첫 문장 130자 이내에 특정 키워드 (제품명, 기능명) 포함 | ✅ 구현 |
| FAQ 추가 | 1~2개의 Q&A 형식의 FAQ 추가 여부 | ✅ 구현 |
| Timestamp | 1분 이상의 경우 Timestamp 추가 여부 | ✅ 구현 |
| Timestamp 키워드 | Timestamp에 핵심 키워드(제품명, 기능명) 포함 여부 | ⚠️ 개선필요 |
| Step by Step | How-to 영상의 경우 Step by Step 내용 추가 여부 | ✅ 구현 |

### 🔧 YouTube 구현 명세

```typescript
// Title Generator
export interface YouTubeTitleConfig {
  structure: 'samsung_standard';
  template: '[Primary Keyword] | [Feature] | [Product Name] | Samsung';
  maxLength: 60;
  requiredElements: ['product_name', 'feature_keyword'];
  keywordPosition: 'front'; // 앞쪽 배치 필수
}

export interface YouTubeTitleResult {
  primary: string;
  alternatives: string[];
  keywords: string[];
  structureValid: boolean;
  charCount: number;
}

// Meta Tags Generator
export interface YouTubeMetaTagsResult {
  tags: string[];
  categories: {
    brand: string[];      // Samsung, Galaxy
    product: string[];    // S26 Ultra, Z Flip 7
    feature: string[];    // AI, Camera, Battery
    generic: string[];    // smartphone, mobile
  };
  totalCount: number;
}

// Thumbnail Suggestion (P1)
export interface YouTubeThumbnailSuggestion {
  textOverlay: string;           // 썸네일에 들어갈 텍스트
  keywords: string[];            // 포함 키워드
  fileNameSuggestion: string;    // 파일명 제안 (키워드 포함)
  aspectRatio: '16:9';
  minResolution: '1280x720';
}
```

---

## Slide 4: Task 2 - GEO 검수 영역 (Instagram)

### 전체 점검 요소 매트릭스

| 점검요소 | 점검기준 | Feasibility | 구현 상태 |
|----------|----------|-------------|-----------|
| **Setting** | 외부 검색을 위한 계정 인덱싱 활성화 여부 | 별도 확인 | ⏸️ 외부 |
| **채널명** | 특정 키워드 조합으로 30자 이내 구성 | 의견 필요 | ⏸️ 보류 |
| **채널 소개** | 브랜드명 + 제품 키워드 포함 150자 이내 | 의견 필요 | ⏸️ 보류 |
| **외부 링크** | 공식 웹사이트 포함 최대 5개 링크 연결 | 별도 확인 | ⏸️ 외부 |
| **Alt text** | (아래 상세) | **Alt text 제안 가능 여부** | 🔴 P0 |
| **자막** | closed caption toggle-on 옵션 활성화 | 별도 확인 | ⏸️ 외부 |
| **디스크립션** | 첫 125글자에 핵심메시지+키워드+CTA | **개발 중** | 🔴 P0 |
| **해시태그** | (아래 상세) | **해시태그 제안 가능 여부** | ✅ 개선필요 |
| **장소 태그** | Location tag 사용 여부 | 별도 확인 | ⏸️ 외부 |
| **인게이지먼트 댓글** | 소비자 인게이지를 높일 수 있는 댓글 생성 | **댓글 생성 가능 여부** | 🔴 P1 |

### Alt Text 점검 상세

| 점검 항목 | 설명 |
|-----------|------|
| 사용여부 | Alt text 사용 여부 |
| 키워드 사용 | 특정 키워드 사용 여부 |
| 구조 | 제품명 + 장면설명 + 키워드 포함 |
| 길이 | 150자 이내 |

### 해시태그 점검 상세

| 점검 항목 | 설명 |
|-----------|------|
| 공식 해시태그 | 공식 해시태그 사용 여부 |
| 해시태그 개수 | 사용한 해시태그 개수 |
| GEO 유효성 | GEO 서치에 유효한 해시태그 |

### 인게이지먼트 댓글

| 대상 플랫폼 | 설명 |
|-------------|------|
| Instagram | 소비자 인게이지를 높일 수 있는 댓글 |
| LinkedIn | 동일 |
| X (Twitter) | 동일 |
| 특별 케이스 | 인플루언서 콜랩 영상 |

### 🔧 Instagram 구현 명세

```typescript
// Instagram Description (125자 최적화)
export interface InstagramDescriptionConfig {
  maxFirstSection: 125;  // 첫 125글자 제한
  requiredElements: ['core_message', 'keywords', 'cta'];
  keywordTypes: ['product_name', 'feature', 'brand_name'];
}

export interface InstagramDescriptionResult {
  primary: string;       // 125자 이내 핵심
  extended: string;      // 전체 디스크립션
  charCount: number;
  containsCTA: boolean;
  keywords: string[];
}

// Alt Text Generator
export interface InstagramAltTextConfig {
  maxLength: 150;
  structure: '[Product Name] + [Scene Description] + [Keywords]';
}

export interface InstagramAltTextResult {
  text: string;
  charCount: number;
  keywords: string[];
  visualElements: string[];
}

// Hashtag Generator (개선)
export interface InstagramHashtagConfig {
  officialHashtags: string[];  // 공식 해시태그 목록
  maxCount: number;            // 최대 개수 가이드
  geoOptimized: boolean;       // GEO 서치 유효성 체크
}

export interface InstagramHashtagResult {
  hashtags: string[];
  officialIncluded: string[];
  geoOptimized: string[];
  totalCount: number;
}

// Engagement Comment Generator (P1)
export interface EngagementCommentConfig {
  platforms: ('instagram' | 'linkedin' | 'x')[];
  contentType: 'standard' | 'influencer_collab';
}

export interface EngagementCommentResult {
  comments: {
    text: string;
    platform: string;
    type: 'question' | 'cta' | 'highlight' | 'engagement';
  }[];
}
```

---

## Slide 5: Task 2 - GEO 검수 영역 (TikTok)

### 전체 점검 요소 매트릭스

| 점검요소 | 점검기준 | Feasibility | 구현 상태 |
|----------|----------|-------------|-----------|
| **채널명** | 특정 키워드 조합으로 30자 이내 | 의견 필요 | ⏸️ 보류 |
| **채널 소개** | 브랜드명 + 제품 키워드 150자 이내 | 의견 필요 | ⏸️ 보류 |
| **외부 링크** | 공식 웹사이트 포함 최대 5개 | 별도 확인 | ⏸️ 외부 |
| **자막** | closed caption toggle-on 활성화 | 별도 확인 | ⏸️ 외부 |
| **디스크립션** | 첫 125글자에 핵심메시지+키워드+CTA | **TT도 솔루션 적용 가능한지 확인 필요 (TBD)** | 🟡 P2 |
| **썸네일/커버 텍스트** | 영상 표지에 키워드형 문구 직접 삽입 | **썸네일/커버 텍스트 제안 가능 여부** | 🟡 P2 |

### 🔧 TikTok 구현 명세 (P2)

```typescript
// TikTok Description
export interface TikTokDescriptionResult {
  primary: string;       // 125자 이내
  charCount: number;
  keywords: string[];
  containsCTA: boolean;
}

// TikTok Cover Text Suggestion
export interface TikTokCoverTextResult {
  text: string;          // 커버에 들어갈 텍스트
  keywords: string[];
  maxLength: number;
}
```

---

## Slide 6: Task 3 - Final Notes

### 정리 필요 사항

1. **콘텐츠 제작팀 요청 자료 정리**
   - 사전 검수: Content Submission Form 항목
   - 사후 검수: 게재된 콘텐츠 링크

2. **광고주로부터 수급 필요 자료**
   - 인게이지먼트 댓글 가이드
   - 기타 가이드

### 🚨 타임라인

| 일정 | 내용 | D-Day |
|------|------|-------|
| **2/12(목)** | 베타 버전 오픈 | D-13 |
| **2/13(금)** | 광고주 공유 | D-14 |
| **2/23(월)** | 테스트런 및 실사용 시작 | D-24 |

---

## Slide 7: EOD

문서 종료.

---

# 📑 Part 2: GEO Strategy 260116 - 핵심 페이지별 분석

## Section 1: Gen AI Search 트렌드 (Pages 1-15)

### AI Overview 구조 (Page 2)

```
┌─────────────────────────────────────────────────┐
│              질의형/대화형 키워드: Prompt            │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐    │
│  │         1. 검색결과 요약 정보              │    │
│  │    AI가 답변을 요약하여 제공               │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │         2. 출처 정보                      │    │
│  │    요약의 신뢰를 얻기 위한 출처 표기        │    │
│  │    (양질의 오가닉 트래픽 발생)             │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │         3. 기존 검색결과                  │    │
│  │    AI Overview 하위로 이동                │    │
│  │    (오가닉 트래픽 최소 20% 이상 감소 예상)  │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### AI Mode 진화 (Page 4-5)

- 향후 AI Mode는 **'옵션'이 아닌 '기본 설정'**으로 진화 예상
- 구조:
  1. 답변 요약
  2. 검색 출처 정보
  3. 상세 답변 내용
  4. 구매 정보
  5. 이미지/비디오
  6. 추가 질문 입력

### 사용자 통계 (Page 8)

| 연령대 | 비율 |
|--------|------|
| 18-44 (Gen Z + Millennials) | **65%** |
| 45+ | 35% |

- 70%의 사용자가 AI 검색 사용
- 52%가 정보 탐색에 AI 검색 활용

### GEO 핵심 전략 요소 (Page 10)

1. **주요 키워드/문구 기반 Technical SEO**
2. **검색 의도를 고려한 콘텐츠**
3. **구조화된 데이터 적용**
4. **외부 자산 협력 및 최적화**

### GEO Opportunity (Page 11)

- **AI Agent**: AI가 자동으로 제품 선택 및 구매
- **People Evidence**: 실제 사용자 경험 기반 콘텐츠
- **Multimodality**: 이미지, 영상 등 다양한 형식
- **Locality**: 지역 기반 최적화

---

## Section 2: 2026 SEO/GEO Strategy (Pages 28-40)

### 2025 vs 2026 검색 진화 (Page 29)

| 연도 | 사용자 행동 | AI 역할 |
|------|------------|---------|
| **2025** | 정보 탐색 (What is the Best AI phone 2026?) | AI가 제품 추천 → 사용자가 매장으로 이동 |
| **2026** | 정보 탐색 + 실행 (Find the best AI phone, and add my cart) | AI Agent가 자동으로 제품 선택 → 자동 구매 |

> **"AI에게 선택 받는 것이 가장 중요"**

### Gen AI 답변 출처 (Page 30)

- **평균 13.3개** 출처 노출
- **최대 95개** 출처 가능
- 종합적인 콘텐츠 소스의 구조화 필요

### 2026 전략 확장 (Page 32)

| 카테고리 | 2025 | 2026 |
|----------|------|------|
| 상세 가이드 국가 | US/KR | US/UK/FR/ES/IN/BR/KR/JP/AE/DE/IT/ID |
| 외부 채널 | Tech Media, Wikipedia | + Forum (Reddit), Partner Dotcom, Satellite Media |
| 내부 채널 | S.com (PDP/BUY), Social Media | + Non Product Page/Support, Samsung Mobile Press |

### MX vs 외부 소스 인용 비율 (Page 21-22)

```
┌─────────────────────────────────────┐
│           인용 비율                   │
├─────────────────────────────────────┤
│  MX Asset: 16.6%                    │
│  External Source: 83.4%             │
└─────────────────────────────────────┘
```

### 외부 소스 분포 (Page 21)

| 소스 | 인용 비율 |
|------|----------|
| Media | 높음 |
| Social | 중간 |
| Partner.com | 중간 |
| Forum | 중간 |
| Blog | 낮음 |
| Wiki | 낮음 |
| Others | 낮음 |

### MX 디지털 자산 정비 전략 (Page 22-23)

1. **검색의도 대응 콘텐츠 적용**
   - 더 세분화된 고객 검색어의 의도까지 포괄
   - 최신의, 풍부한 콘텐츠 구축

2. **구조적 기술 설계**
   - Gen AI 인용 가능성 증대

3. **외부자산 최적화 및 파트너십**
   - Gen AI 노출 가능성 높은 외부 채널에 당사 긍정 콘텐츠 확대
   - 전략적 파트너십 강화

---

## Section 3: Social (YouTube) 최적화 (Pages 95-105)

### YouTube 최적화 요소 (Page 100)

```
┌─────────────────────────────────────────────────┐
│  A. Video Title                                 │
│  B. Description                                 │
│  C. Chapter (Timestamp)                         │
│  D. Closed Caption                              │
│  E. Thumbnail                                   │
└─────────────────────────────────────────────────┘
```

### YouTube 채널 소개 최적화 (Page 99)

**예시 (To-Be):**
```
Welcome to Samsung's official YouTube channel.

We are leading the era of the AI Phone, redefining how people
create, connect, and communicate.
Through Galaxy AI, we bring meaningful innovations to billions of
users worldwide — unlocking new possibilities every day.

Discover our latest products, stories, and experiences that shape
the future.

#Samsung #GalaxyAI #AIPhone
```

### 키워드 검색량 분석 (Page 101)

**Miracle Release (제품 출시)**
| 키워드 | 검색량 |
|--------|--------|
| s26 ultra release date | 1,244,800 |
| samsung s26 ultra release date | 1,187,600 |
| samsung galaxy s26 ultra release date | 1,031,800 |
| samsung s26 release date | 773,900 |

**AI Features**
| 키워드 | 검색량 |
|--------|--------|
| ai photo edit | 12,158,000 |
| ai photo editing | 10,553,000 |
| ai agent | 6,637,000 |
| ai assistant | 3,576,500 |

**Support**
| 키워드 | 검색량 |
|--------|--------|
| how to reset samsung phone | 807,000 |
| how to factory reset samsung phone | 392,600 |
| how to use galaxy ai | 26,700 |

### Social Action Item (Page 98)

1. **검색 의도를 반영한 콘텐츠**
2. **구조화된 데이터 반영**

---

## Section 4: Dotcom 최적화 (Pages 105-165)

### Dotcom 전략 구조 (Page 105)

1. **Enrich Content** - 콘텐츠 강화
2. **Structured Data** - 구조화 데이터
3. **Production Efficiency** - 생산 효율성

대상:
- Samsung.com
- Samsung Mobile Press
- Partner.com

### S.com GEO 전략 (Page 106)

**As-Is → To-Be**

| 요소 | As-Is | To-Be |
|------|-------|-------|
| 1 | Readability (가독성) | Credibility (신뢰성) + Engagement (참여) |
| 2 | Comparison + FAQ | AI + Support |

### MKT PDP 자산 인용 분석 (Page 108)

**닷컴 자산 별 Gen AI 인용 건수:**
- MKT PDP: 10.3K
- Buying Guide: 6.6K
- Buy: 3.2K
- Compare/Review: 1.5K

**MKT PDP 자산 노출 인텐트 비중:**
- Smartphone Info: 63%
- Comparison: 20%
- Recommendation: 7%
- Buy: 4%

### Support 최적화 (Page 145-150)

**Schema.org 적용 예시:**

```json
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "How to use the Circle to Search feature on Galaxy devices | Samsung UK",
  "description": "Discover the new Circle to Search feature on the recently released S24.",
  "mainEntityOfPage": "https://www.samsung.com/uk/support/...",
  "url": "https://www.samsung.com/uk/support/..."
}
```

**Support 콘텐츠 작성 가이드 (Page 149):**

1. **콘텐츠 제목(H1)**: 제품명과 타겟 키워드 (e.g. AI Phone) 포함
2. **첫 문단**: Support 콘텐츠 요약, 주요 키워드 서술, 백링크 활용
3. **소제목(H2)**: 연관 키워드 활용, 해당 제목에 대한 답변 제공

---

# 📑 Part 3: Samsung GEO Tool 구현 매핑

## 현재 구현 상태 vs 요구사항 매핑

### YouTube 기능

| 기능 | Solution Brief 요구 | Strategy 참조 | 현재 상태 | 우선순위 |
|------|---------------------|---------------|-----------|----------|
| Title 생성 | "적절한 타이틀 제안 가능 여부" | Page 100 - Video Title | ❌ 미구현 | **P0** |
| Description 생성 | "개발 중" | Page 100 - Description | ✅ 구현됨 | - |
| Timestamps | "Timestamp 추가 여부" | Page 100 - Chapter | ✅ 구현됨 | - |
| FAQ | "1~2개 Q&A FAQ 추가" | FAQ Schema | ✅ 구현됨 | - |
| 메타태그 | "메타태그 제안 가능 여부" | Structured Data | ❌ 미구현 | **P0** |
| 썸네일 텍스트 | "썸네일 제안 가능여부" | Page 100 - Thumbnail | ❌ 미구현 | **P1** |
| SRT 입력 | "SRT 파일 유무 별도 수집" | Closed Caption | ✅ 구현됨 | - |

### Instagram 기능

| 기능 | Solution Brief 요구 | Strategy 참조 | 현재 상태 | 우선순위 |
|------|---------------------|---------------|-----------|----------|
| Description (125자) | "첫 125글자에 핵심메시지+키워드+CTA" | - | ❌ 미구현 | **P0** |
| Alt Text | "Alt text 제안 가능 여부" | 150자, 제품명+장면+키워드 | ❌ 미구현 | **P0** |
| Hashtags | "해시태그 제안 가능 여부" | GEO 유효 + 공식 + 개수 | ⚠️ 개선필요 | **P0** |
| 인게이지먼트 댓글 | "댓글 생성 가능 여부 (IG/LI/X)" | - | ❌ 미구현 | **P1** |

### TikTok 기능

| 기능 | Solution Brief 요구 | Strategy 참조 | 현재 상태 | 우선순위 |
|------|---------------------|---------------|-----------|----------|
| Description (125자) | "TT도 솔루션 적용 가능한지 확인 필요" | - | ❌ 미구현 | **P2** |
| 커버 텍스트 | "썸네일/커버 텍스트 제안 가능 여부" | - | ❌ 미구현 | **P2** |

### 공통 기능

| 기능 | Solution Brief 요구 | 현재 상태 | 우선순위 |
|------|---------------------|-----------|----------|
| 플랫폼 선택 | YouTube/Instagram/TikTok | ❌ 미구현 | **P0** |
| 검수 워크플로우 | 사전/사후 검수 | ❌ 미구현 | **P1** |
| Content Submission Form | WIP 자료 입력 | ❌ 미구현 | **P1** |
| 검수 결과 리포트 | 점검 항목별 Pass/Fail | ❌ 미구현 | **P1** |

---

## 상세 구현 스펙

### 1. 플랫폼 선택 UI

```typescript
// src/types/geo-v2.ts
export type Platform = 'youtube' | 'instagram' | 'tiktok';

export const PLATFORM_CONFIG: Record<Platform, {
  name: string;
  icon: string;
  outputs: string[];
}> = {
  youtube: {
    name: 'YouTube',
    icon: '📺',
    outputs: ['title', 'description', 'timestamps', 'hashtags', 'faq', 'metaTags']
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    outputs: ['description', 'altText', 'hashtags', 'engagementComment']
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    outputs: ['description', 'coverText', 'hashtags']
  }
};
```

### 2. 생성 플로우 변경

```
현재:
Product → Content → Keywords → Output

변경:
Platform → Product → Content → Keywords → Output
    ↓                                      ↓
 (YT/IG/TT)                    (플랫폼별 다른 출력물)
```

### 3. API 응답 확장

```typescript
// src/types/geo-v2.ts
export interface GEOv2GenerateResponse {
  // 기존 (YouTube)
  description: {
    full: string;
    first130: string;      // 첫 130자
  };
  chapters: {
    timestamps: string;
  };
  hashtags: string[];
  faq: {
    faqs: FAQItem[];
  };
  
  // 신규 - YouTube
  title?: {
    primary: string;
    alternatives: string[];
    keywords: string[];
    structureValid: boolean;
  };
  metaTags?: {
    tags: string[];
    categories: {
      brand: string[];
      product: string[];
      feature: string[];
      generic: string[];
    };
  };
  thumbnailSuggestion?: {
    textOverlay: string;
    keywords: string[];
    fileNameSuggestion: string;
  };
  
  // 신규 - Instagram
  instagramDescription?: {
    primary: string;       // 125자 이내
    extended: string;
    charCount: number;
    containsCTA: boolean;
    keywords: string[];
  };
  altText?: {
    text: string;
    charCount: number;
    keywords: string[];
    visualElements: string[];
  };
  engagementComments?: {
    instagram: string[];
    linkedin: string[];
    x: string[];
  };
  
  // 신규 - TikTok
  tiktokDescription?: {
    primary: string;
    charCount: number;
    keywords: string[];
  };
  coverText?: {
    text: string;
    keywords: string[];
  };
  
  // 메타데이터
  platform: Platform;
  generatedAt: string;
}
```

### 4. 프롬프트 템플릿

#### YouTube Title Generation

```
## YOUTUBE TITLE GENERATION (Samsung Standard)

Product: {productName}
Key Features: {selectedKeywords}
Content Type: {contentType}

Generate an optimized YouTube title following Samsung's structure:

**Structure**: [Primary Keyword] | [Feature/Benefit] | [Product Name] | Samsung

**Rules**:
1. Maximum 60 characters for optimal display
2. Place primary keyword (product name or feature) at the BEGINNING
3. Include at least one key feature/benefit
4. End with "Samsung" for brand consistency
5. Use "|" as separator

**Output Format**:
{
  "primary": "Main recommended title",
  "alternatives": ["Alternative 1", "Alternative 2"],
  "keywords": ["keyword1", "keyword2"]
}
```

#### Instagram Alt Text Generation

```
## INSTAGRAM ALT TEXT GENERATION (GEO Optimized)

Product: {productName}
Content Context: {srtContent}
Key Features: {selectedKeywords}

Generate accessible alt text for Instagram media:

**Structure**: [Product Name] + [Scene Description] + [Key Feature]

**Rules**:
1. Maximum 150 characters
2. Include at least 1 product keyword
3. Describe the main visual elements clearly
4. Make it meaningful for screen readers AND AI indexing

**Output Format**:
{
  "text": "Generated alt text",
  "keywords": ["keyword1", "keyword2"],
  "visualElements": ["element1", "element2"]
}
```

#### Engagement Comment Generation

```
## ENGAGEMENT COMMENT GENERATION (Instagram/LinkedIn/X)

Product: {productName}
Content Summary: {srtContent}
Platform: {platform}
Content Type: {contentType} (standard | influencer_collab)

Generate engagement-boosting comments for social media:

**Types to generate**:
1. Question - Prompt user interaction
2. CTA - Call to action
3. Highlight - Feature highlight
4. Engagement - General engagement prompt

**Rules**:
1. Keep natural, conversational tone
2. Include relevant emojis
3. Encourage user response
4. Platform-appropriate length and style

**Output Format**:
{
  "comments": [
    {"text": "Comment text", "type": "question"},
    {"text": "Comment text", "type": "cta"}
  ]
}
```

---

## 구현 일정

### Phase 0: Critical (D-13 까지, 2/12 베타)

| 일차 | 작업 내용 | 담당 파일 |
|------|----------|-----------|
| Day 1 | 플랫폼 선택 UI + Store 수정 | `product-selector.tsx`, `generation-store.ts` |
| Day 2 | Title 생성 API + 프롬프트 | `generate-v2/route.ts`, `prompt-loader.ts` |
| Day 2 | 메타태그 생성 API | `generate-v2/route.ts` |
| Day 3 | Instagram Description (125자) | `generate-v2/route.ts` |
| Day 3 | Alt Text 생성 | `generate-v2/route.ts` |
| Day 4 | Output Display 확장 | `output-display.tsx` |
| Day 4 | 통합 테스트 + 버그 수정 | All |

### Phase 1: High Priority (D-24 까지, 2/23 실사용)

| 일차 | 작업 내용 |
|------|----------|
| Day 5-6 | 썸네일 텍스트 제안 |
| Day 7-8 | 인게이지먼트 댓글 생성 |
| Day 9-10 | 검수 워크플로우 (사전/사후) |
| Day 11 | Content Submission Form |
| Day 12 | 검수 결과 리포트 |

### Phase 2: Medium Priority (이후)

- TikTok Description
- TikTok 커버 텍스트
- 채널명/소개 최적화 제안
- 검수 히스토리/분석 대시보드

---

# ✅ Checklist

## P0 베타 (2/12)

- [ ] 플랫폼 선택 UI (YouTube/Instagram/TikTok)
- [ ] YouTube Title 생성
- [ ] YouTube 메타태그 생성
- [ ] Instagram Description (125자)
- [ ] Instagram Alt Text
- [ ] Instagram Hashtag 개선 (GEO 유효성)
- [ ] Output Display 플랫폼별 분기
- [ ] 복사 버튼 모든 항목

## P1 실사용 (2/23)

- [ ] 썸네일 텍스트 제안
- [ ] 인게이지먼트 댓글 생성 (IG/LI/X)
- [ ] 검수 모드 (사전/사후)
- [ ] Content Submission Form
- [ ] 검수 결과 리포트

## 테스트

- [ ] YouTube 전체 플로우
- [ ] Instagram 전체 플로우
- [ ] TikTok 전체 플로우
- [ ] 한/영 언어 지원
- [ ] 저장/불러오기
- [ ] 대시보드 표시

---

**문서 작성**: Claude (Clawdbot)
**최종 수정**: 2026-01-30 16:00 KST
**파일 위치**: `/Users/paksungho/samsung-geo-tool/docs/GEO_COMPLETE_ANALYSIS.md`
