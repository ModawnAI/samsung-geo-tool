# GEO Solution Brief 분석 및 구현 계획

> **문서 생성일**: 2026-01-30
> **분석 대상**: 
> - GEO Solution Brief_Cheil_0129.pptx (7 슬라이드)
> - 2026 and Miracle MX SEO GEO Strategy_KO_260116.pdf (242 페이지)
> **목적**: 현재 samsung-geo-tool 앱에 필요한 기능/플로우 구현 계획 수립

---

## 📋 Executive Summary

### GEO Solution Brief 핵심 요구사항

| Task | 내용 | 긴급도 |
|------|------|--------|
| **Task 1** | GEO 검수 방식 (사전/사후 검수 워크플로우) | HIGH |
| **Task 2** | GEO 검수 영역 확장 (YT/IG/TT) | CRITICAL |
| **Task 3** | 타임라인: 2/12 베타, 2/13 공유, 2/23 실사용 | DEADLINE |

### 타임라인 (⚠️ 매우 촉박)

```
현재 ──────── 2/12(목) ──── 2/13(금) ──── 2/23(월)
               베타 오픈    광고주 공유    테스트런/실사용
               (13일 남음)  (14일 남음)   (24일 남음)
```

---

## 📊 현재 앱 상태 vs 요구사항 Gap 분석

### ✅ 현재 구현된 기능

| 기능 | 플랫폼 | 상태 |
|------|--------|------|
| Description 생성 | YouTube | ✅ 구현됨 |
| Timestamps 생성 | YouTube | ✅ 구현됨 |
| Hashtags 생성 | YouTube | ✅ 구현됨 |
| FAQ 생성 (Q:/A: 형식) | YouTube | ✅ 구현됨 |
| SRT 파일 입력 | YouTube | ✅ 구현됨 |
| YouTube URL 입력 | YouTube | ✅ 구현됨 |
| 제품 선택 (MX 라인업) | 공통 | ✅ 구현됨 |
| Content Type 선택 | 공통 | ✅ 구현됨 |
| Video Format (16:9/9:16) | 공통 | ✅ 구현됨 |
| Fixed Hashtags 입력 | 공통 | ✅ 구현됨 |
| Activity Dashboard | 공통 | ✅ 구현됨 |
| Playbook RAG | 공통 | ✅ 구현됨 |
| Grounding (Perplexity) | 공통 | ✅ 구현됨 |

### ❌ 새로 구현 필요한 기능

| 기능 | 플랫폼 | 우선순위 | Brief 요구사항 |
|------|--------|----------|----------------|
| **Title 제안** | YouTube | P0 | 타이틀 제안 가능 여부 |
| **메타태그 제안** | YouTube | P0 | 메타태그 제안 가능 여부 |
| **썸네일 제안** | YouTube/TikTok | P1 | 썸네일 제안 가능 여부 |
| **Alt Text 생성** | Instagram | P0 | Alt text 제안 가능 여부 |
| **인게이지먼트 댓글 생성** | Instagram/LinkedIn/X | P1 | 인게이지먼트 댓글 생성 가능 여부 |
| **Instagram Description** | Instagram | P0 | 첫 125자 최적화 |
| **TikTok Description** | TikTok | P2 (TBD) | TT 솔루션 적용 가능한지 확인 필요 |
| **TikTok 커버 텍스트** | TikTok | P2 | 썸네일/커버 텍스트 제안 |
| **검수 워크플로우** | 공통 | P1 | 사전/사후 검수 시스템 |
| **Content Submission Form** | 공통 | P1 | 콘텐츠 제출 양식 |

---

## 📑 GEO Solution Brief 상세 분석 (슬라이드별)

### Slide 1: Cover
- **제목**: MX Social GEO Solution Additional Brief
- **날짜**: 2026.01

### Slide 2: Task 1 - GEO 검수 방식

**채널 범위:**
- 삼성 글로벌 YouTube / Instagram / TikTok 내 무선 콘텐츠
- *향후 로컬 소셜채널 콘텐츠에도 적용 예정*

**검수 방식:**

| 콘텐츠 분류 | 검수 시기 | 입력 자료 |
|-------------|-----------|-----------|
| **UNPK/Event 신제품 관련** | 사후 검수 | 게재된 콘텐츠 링크 |
| **Non UNPK/Event 일반** | 사전 검수 | Content Submission Form |

**Content Submission Form 입력 항목:**
- WIP 디스크립션 카피 (카피 초안~최종)
- 주요 제품 정보 (text 입력 & 플레이북)
- WIP 영상/이미지

**추가 요구사항:**
- 보안이 중요한 콘텐츠: 사후 검수
- 그렇지 않은 콘텐츠: 사전 검수
- 어셋 자체를 넣을지 등도 선택 가능하도록 개발
- **디스크립션 카피 토날리티 검수 진행** (okayed)
- **디스크립션 카피 없는 상태에서도 카피 제안 가능** 

### Slide 3: Task 2 - GEO 검수 영역 (YouTube)

| 점검 요소 | 점검 기준 | Feasibility |
|-----------|-----------|-------------|
| **채널명** | 특정 키워드(브랜드명, 제품명 등) 포함 여부 | 의견 필요 |
| **채널 소개** | 첫 130자 이내 핵심 내용과 키워드(제품명/기능명) 포함 여부 | 의견 필요 |
| **썸네일** | - 글로벌과 동일 썸네일 사용 여부<br>- 핵심주체를 노출하는 이미지와 함께 크고 명확한 텍스트 사용 여부<br>- 고화질 썸네일 파일 사용 여부<br>- 썸네일 이미지 파일 이름에 핵심 키워드 포함 여부 | **영상/링크 입력시 썸네일 제안 가능 여부** |
| **메타태그** | 특정 메타태그 포함하였는지 점검 | **영상/링크 및 카피 입력 시 메타태그 제안 가능 여부** |
| **타이틀** | - 특정 키워드 포함 여부 점검<br>- 특정 구조 사용 여부 점검 (ex: `Galaxy AI \| Feature Name \| Product Name \| Samsung`)<br>- 제품명/기능명 핵심 키워드를 최소 1개 이상 앞쪽에 배치하여 간결하고 명확하게 작성 | **영상/링크 및 카피 입력 시 적절한 타이틀 제안 가능 여부** (단, 삼성 구조를 지키는 선에서) |
| **디스크립션** | - 게시내용 첫 문장 130자 이내에 특정 키워드 (제품명, 기능명) 포함<br>- **1~2개의 Q&A 형식의 FAQ 추가 여부**<br>- 1분 이상의 경우 **Timestamp 추가 여부**<br>  - Timestamp에 핵심 키워드(제품명, 기능명) 포함 여부<br>- How-to 영상의 경우 **Step by Step 내용 추가 여부** | **개발 중** ✅ |
| **자막** | closed caption 형식(SRT) 자막 적용 여부 | SRT 파일 유무 별도 수집 |

### Slide 4: Task 2 - GEO 검수 영역 (Instagram)

| 점검 요소 | 점검 기준 | Feasibility |
|-----------|-----------|-------------|
| **Setting** | 외부 검색을 위한 계정 인덱싱 활성화 여부 | 별도 확인 |
| **채널명** | 특정 키워드(브랜드명, 제품명 등) 조합으로 30자 이내 구성 여부 | 의견 필요 |
| **채널 소개** | 브랜드명 + 제품 키워드 포함 150자 이내 작성 여부 | 의견 필요 |
| **외부 링크** | 공식 웹사이트 포함하여 최대 5개 링크 연결 여부 | 별도 확인 |
| **Alt text** | - 사용 여부<br>- 특정 키워드 사용 여부<br>- 제품명+장면설명+키워드 포함, 150자 이내 여부 | **영상/링크 및 카피 입력 시 Alt text 제안 가능 여부** |
| **자막** | closed caption toggle-on 옵션 활성화 여부 | 별도 확인 |
| **디스크립션** | 첫 125글자에 핵심메시지와 키워드(제품명/기능/브랜드명 등), CTA가 포함되는 구성 여부 | **개발 중** |
| **해시태그** | - 공식 해시태그 사용 여부<br>- 사용한 해시태그 개수 | **영상/링크 및 카피 입력 시 해시태그 제안 가능 여부** (GEO 서치에 유효 + 공식 해시태그 입력 + 해시태그 개수 가이드 적용) |
| **장소 태그** | Location tag 사용 여부 | 별도 확인 |
| **인게이지먼트 댓글** | 소비자 인게이지를 높일 수 있는 댓글 생성 (인플루언서 콜랩) | **영상/링크 입력 시 인게이지먼트 댓글 생성 가능 여부 (IG/LI/X)** |

### Slide 5: Task 2 - GEO 검수 영역 (TikTok)

| 점검 요소 | 점검 기준 | Feasibility |
|-----------|-----------|-------------|
| **채널명** | 특정 키워드(브랜드명, 제품명 등) 조합으로 30자 이내 구성 여부 | 의견 필요 |
| **채널 소개** | 브랜드명 + 제품 키워드 포함 150자 이내 작성 여부 | 의견 필요 |
| **외부 링크** | 공식 웹사이트 포함하여 최대 5개 링크 연결 여부 | 별도 확인 |
| **자막** | closed caption toggle-on 옵션 활성화 여부 | 별도 확인 |
| **디스크립션** | 첫 125글자에 핵심메시지와 키워드(제품명/기능/브랜드명 등), CTA가 포함되는 구성 여부 | **TT도 솔루션 적용 가능한지 확인 필요 (TBD)** |
| **썸네일/커버 텍스트** | 영상 표지에 키워드형 문구 직접 삽입 여부 | **영상/링크 및 카피 입력 시 썸네일/커버 텍스트 제안 가능 여부** |

### Slide 6: Task 3 - Final Notes

**필요 사항:**
1. 솔루션 사용을 위해 콘텐츠 제작팀에게 사전/사후 어떤 자료들을 요청해야하는지 정리
2. 해당 솔루션 개발을 위해 광고주로부터 수급해야하는 추가 자료 (e.g. 인게이지먼트 댓글/가이드)

**타임라인:**
| 일정 | 내용 |
|------|------|
| **2/12(목)** | 베타 버전 오픈 |
| **2/13(금)** | 광고주 공유 |
| **2/23(월)** | 테스트런 및 실사용 시작 |

---

## 📊 GEO Strategy 260116 핵심 인사이트

### Gen AI Search 트렌드

1. **AI Overview가 기본 설정**으로 진화 예상
2. Gen AI 답변에 평균 **13.3개 출처** 노출 (최대 95개)
3. **MX 자산 16.6%** vs **외부 소스 83.4%** 인용 비율

### Gen AI 인용 최적화 전략

1. **검색 의도 기반 콘텐츠 구축**
   - 첫 60 words에 핵심 키워드 배치
   - FAQ Schema 적용으로 LLM 인용에 유리

2. **구조화 데이터 적용**
   - Product, FAQ, Video, Review Schema
   - Question/Answer Schema

3. **콘텐츠 자산별 최적화**
   - YouTube: Title, Description, Chapters, CC
   - Instagram: Alt text, Hashtags, Description
   - Dotcom: PDP, Support, Community

### YouTube 최적화 요소 (GEO Strategy 기준)

| 요소 | 최적화 포인트 |
|------|--------------|
| **A. Video Title** | 핵심 키워드 앞쪽 배치, 삼성 구조 준수 |
| **B. Description** | 첫 130자 키워드 포함, FAQ, CTA |
| **C. Chapter/Timestamp** | 핵심 키워드 포함된 챕터명 |
| **D. Closed Caption** | SRT 자막 적용 |
| **E. Thumbnail** | 키워드형 텍스트, 고화질 이미지 |

---

## 🔧 구현 계획

### Phase 0: Critical (P0) - 2/12 베타까지
> **목표: 핵심 기능 구현 완료**

| 기능 | 설명 | 파일 변경 | 예상 공수 |
|------|------|-----------|----------|
| **Title 생성** | GEO 최적화된 YouTube 타이틀 제안 | `generate-v2/route.ts`, `output-display.tsx` | 1일 |
| **메타태그 생성** | SEO/GEO 최적화 메타태그 제안 | `generate-v2/route.ts`, `output-display.tsx` | 0.5일 |
| **Instagram Description** | 125자 최적화된 IG 디스크립션 | `generate-v2/route.ts`, 새 컴포넌트 | 1일 |
| **Alt Text 생성** | IG 이미지/영상용 대체 텍스트 | `generate-v2/route.ts`, 새 컴포넌트 | 1일 |
| **플랫폼 선택 UI** | YouTube/Instagram/TikTok 선택 | `product-selector.tsx`, store 수정 | 0.5일 |

**P0 총 예상: 4일**

### Phase 1: High Priority (P1) - 2/23 실사용까지
> **목표: 추가 기능 및 워크플로우 완성**

| 기능 | 설명 | 예상 공수 |
|------|------|----------|
| **썸네일 텍스트 제안** | 영상 분석 후 썸네일 텍스트 추천 | 2일 |
| **인게이지먼트 댓글 생성** | IG/LI/X용 참여 유도 댓글 | 1.5일 |
| **검수 워크플로우** | 사전/사후 검수 시스템 | 2일 |
| **Content Submission Form** | 콘텐츠 제출 양식 UI | 1일 |
| **검수 결과 리포트** | 점검 항목별 Pass/Fail 표시 | 1.5일 |

**P1 총 예상: 8일**

### Phase 2: Medium Priority (P2) - 이후
> **목표: TikTok 지원 및 고도화**

| 기능 | 설명 | 예상 공수 |
|------|------|----------|
| **TikTok Description** | TT 최적화 디스크립션 | 1일 |
| **TikTok 커버 텍스트** | 커버 이미지 텍스트 제안 | 1일 |
| **채널명/소개 최적화 제안** | 채널 레벨 최적화 | 2일 |
| **검수 히스토리/분석** | 검수 결과 대시보드 | 2일 |

---

## 📁 상세 구현 명세

### 1. Title 생성 기능

**요구사항:**
- 삼성 타이틀 구조 준수: `Galaxy AI | Feature Name | Product Name | Samsung`
- 핵심 키워드를 최소 1개 이상 앞쪽에 배치
- 간결하고 명확한 작성

**구현:**

```typescript
// src/types/geo-v2.ts - 추가
export interface TitleGenerationResult {
  primary: string      // 권장 타이틀
  alternatives: string[] // 대안 타이틀 2-3개
  keywords: string[]   // 포함된 핵심 키워드
  structure: 'samsung_standard' | 'custom'
}

// API 응답에 추가
export interface GEOv2GenerateResponse {
  // 기존 필드...
  title?: TitleGenerationResult
}
```

**프롬프트 템플릿:**
```
## TITLE GENERATION (Samsung Standard)

Generate an optimized YouTube title following Samsung's structure:
[Primary Keyword] | [Feature/Benefit] | [Product Name] | Samsung

Rules:
- Maximum 60 characters for optimal display
- Place primary keyword (product name or feature) at the beginning
- Include at least one key feature/benefit
- End with "Samsung" for brand consistency
- Use "|" as separator

Product: {productName}
Key Features: {selectedKeywords}
Content Type: {contentType}

Generate 1 primary title and 2 alternatives.
```

### 2. 메타태그 생성 기능

**요구사항:**
- SEO/GEO 최적화된 메타태그 제안
- 브랜드, 제품, 기능 키워드 포함

**구현:**

```typescript
// src/types/geo-v2.ts - 추가
export interface MetaTagResult {
  tags: string[]       // 추천 메타태그 목록
  categories: {
    brand: string[]    // 브랜드 태그
    product: string[]  // 제품 태그
    feature: string[]  // 기능 태그
    generic: string[]  // 일반 태그
  }
}
```

### 3. Instagram Alt Text 생성

**요구사항:**
- 제품명 + 장면설명 + 키워드 포함
- 150자 이내
- 시각적 요소 설명 포함

**구현:**

```typescript
// src/types/geo-v2.ts - 추가
export interface AltTextResult {
  text: string         // 생성된 Alt text
  charCount: number    // 글자 수
  keywords: string[]   // 포함된 키워드
  visualElements: string[] // 설명된 시각 요소
}
```

**프롬프트 템플릿:**
```
## ALT TEXT GENERATION (Instagram GEO)

Generate accessible alt text for Instagram media:

Rules:
- Maximum 150 characters
- Structure: [Product Name] + [Scene Description] + [Key Feature]
- Include at least 1 product keyword
- Describe the main visual elements
- Make it meaningful for screen readers

Product: {productName}
Content Context: {srtContent}
Key Features: {selectedKeywords}

Output format:
- text: "Generated alt text"
- keywords: ["keyword1", "keyword2"]
```

### 4. Instagram Description (125자 최적화)

**요구사항:**
- 첫 125글자에 핵심메시지 + 키워드 + CTA 포함
- 브랜드명, 제품명, 기능명 포함

**구현:**

```typescript
// src/types/geo-v2.ts - 추가
export interface InstagramDescriptionResult {
  primary: string      // 125자 이내 핵심 부분
  extended: string     // 전체 디스크립션
  charCount: number
  containsCTA: boolean
  keywords: string[]
}
```

### 5. 플랫폼 선택 UI

**요구사항:**
- YouTube / Instagram / TikTok 선택
- 플랫폼별 다른 출력 옵션

**구현:**

```typescript
// src/types/geo-v2.ts - 추가
export type Platform = 'youtube' | 'instagram' | 'tiktok'

export interface PlatformConfig {
  platform: Platform
  outputs: {
    youtube: ['title', 'description', 'timestamps', 'hashtags', 'faq', 'metaTags']
    instagram: ['description', 'altText', 'hashtags', 'engagementComment']
    tiktok: ['description', 'coverText', 'hashtags']
  }
}

// src/store/generation-store.ts - 추가
platform: Platform
setPlatform: (platform: Platform) => void
```

### 6. 인게이지먼트 댓글 생성

**요구사항:**
- 소비자 인게이지를 높일 수 있는 댓글
- IG / LinkedIn / X 지원

**구현:**

```typescript
// src/types/geo-v2.ts - 추가
export interface EngagementCommentResult {
  comments: {
    text: string
    platform: 'instagram' | 'linkedin' | 'x'
    type: 'question' | 'cta' | 'highlight' | 'poll'
  }[]
}
```

---

## 📊 UI/UX 변경 사항

### 1. Generate 페이지 플로우 변경

```
현재: Product → Content → Keywords → Output

변경: Platform → Product → Content → Keywords → Output
                                                 ↓
                                    (플랫폼별 다른 출력물)
```

### 2. Output Display 확장

**YouTube 출력:**
- Title (NEW)
- Description (기존)
- Timestamps (기존)
- Hashtags (기존)
- FAQ (기존)
- Meta Tags (NEW)

**Instagram 출력:**
- Description (125자 최적화)
- Alt Text (NEW)
- Hashtags (기존)
- Engagement Comment (NEW)

**TikTok 출력:**
- Description (125자)
- Cover Text (NEW)
- Hashtags

### 3. 검수 모드 추가

```
┌─────────────────────────────────────────────────────┐
│ 검수 모드 선택                                        │
├─────────────────────────────────────────────────────┤
│ ○ 생성 모드 - 새로운 콘텐츠 생성                       │
│ ● 검수 모드 - 기존 콘텐츠 GEO 점검                    │
│                                                     │
│   [사전 검수] - 게시 전 콘텐츠                         │
│   [사후 검수] - 게시된 콘텐츠 링크                     │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Database 스키마 변경

### 새로운 테이블

```sql
-- 검수 결과 저장
CREATE TABLE geo_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES generations(id),
  platform VARCHAR(20) NOT NULL, -- youtube, instagram, tiktok
  review_type VARCHAR(20) NOT NULL, -- pre, post
  content_url TEXT,
  
  -- 검수 항목별 결과
  checks JSONB NOT NULL, -- {title: {pass: true, score: 85, issues: []}, ...}
  overall_score INTEGER,
  
  -- 메타데이터
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 플랫폼별 출력물 저장 (기존 generations 테이블 확장)
ALTER TABLE generations ADD COLUMN platform VARCHAR(20) DEFAULT 'youtube';
ALTER TABLE generations ADD COLUMN title JSONB;
ALTER TABLE generations ADD COLUMN meta_tags JSONB;
ALTER TABLE generations ADD COLUMN alt_text JSONB;
ALTER TABLE generations ADD COLUMN engagement_comments JSONB;
ALTER TABLE generations ADD COLUMN cover_text TEXT;
```

---

## ✅ 체크리스트

### P0 완료 기준 (2/12 베타)

- [ ] Title 생성 기능 구현
- [ ] 메타태그 생성 기능 구현
- [ ] Instagram Description (125자) 구현
- [ ] Alt Text 생성 기능 구현
- [ ] 플랫폼 선택 UI 구현
- [ ] 출력 화면에 새 항목 표시
- [ ] 복사 버튼 동작 확인

### P1 완료 기준 (2/23 실사용)

- [ ] 썸네일 텍스트 제안 기능
- [ ] 인게이지먼트 댓글 생성
- [ ] 검수 워크플로우 (사전/사후)
- [ ] Content Submission Form
- [ ] 검수 결과 리포트

### 테스트 항목

- [ ] YouTube 전체 플로우 테스트
- [ ] Instagram 전체 플로우 테스트
- [ ] 한/영 언어 지원 확인
- [ ] 복사 기능 모든 항목
- [ ] 저장/불러오기 기능
- [ ] 대시보드 표시

---

## 📝 다음 단계

1. **즉시**: 이 문서를 KJ에게 공유하여 우선순위 확인
2. **1일차**: P0 기능 중 Title/메타태그 생성 구현 시작
3. **2일차**: Instagram Description/Alt Text 구현
4. **3일차**: 플랫폼 선택 UI 및 출력 화면 확장
5. **4일차**: 통합 테스트 및 버그 수정
6. **2/12**: 베타 오픈

---

**문서 작성**: Claude (Clawdbot)
**최종 수정**: 2026-01-30 15:55 KST
