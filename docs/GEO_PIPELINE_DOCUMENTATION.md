# Samsung GEO Tool - 전체 분석 프로세스 문서

## 1. 시스템 개요

Samsung GEO Tool은 YouTube 영상 설명문을 AI 검색엔진(ChatGPT, Claude, Gemini, Perplexity)과 전통적인 검색(Google, YouTube)에서 모두 최적화된 형태로 생성하는 도구입니다.

### 핵심 개념
- **GEO (Generative Engine Optimization)**: AI 기반 검색엔진 최적화
- **AEO (Answer Engine Optimization)**: AI 답변 추출 최적화

### 사용하는 AI 엔진 (3개)
| 엔진 | 역할 | 사용 단계 |
|------|------|----------|
| **Gemini** | 콘텐츠 생성 | 모든 7단계 |
| **Perplexity** | 그라운딩/웹 검색 | USP 추출 시 보조 |
| **Cohere** | RAG/리랭킹 | 검색 결과 순위 조정 |

---

## 2. 7단계 파이프라인 흐름

```
[입력] → Stage 1: Description → Stage 2-6 (병렬) → Stage 7: Hashtags → [최종 출력]
              ↓
         Stage 2: USP 추출 ─┐
         Stage 3: Chapters  │
         Stage 4: FAQ      ├→ (동시 실행)
         Stage 5: Case Studies
         Stage 6: Keywords  ─┘
```

### 처리 순서
1. **Stage 1 (Description)**: 먼저 단독 실행
2. **Stage 2-6**: `Promise.all()`로 병렬 실행
3. **Stage 7 (Hashtags)**: 마지막에 실행

---

## 3. 입력 데이터 구조

### API 요청 (POST /api/generate-v2)
```typescript
{
  // 필수 필드
  product_name: string;      // "Galaxy Z Flip7"
  product_category: string;  // "smartphone"
  content_type: string;      // "intro" | "how_to" | "unboxing" | "shorts" 등
  video_description: string; // 영상 설명문 (최소 50단어)
  keywords: string[];        // ["foldable", "AI camera", "FlexWindow"]

  // 선택 필드
  video_transcript?: string; // 자막 텍스트
  language?: 'ko' | 'en';    // 출력 언어
  video_format?: string;     // "feed_16x9" | "shorts_9x16"
  vanity_link_code?: string; // "ZFlip7_Intro"
}
```

---

## 4. 단계별 LLM 프롬프트 상세

### 4.1 공통 시스템 프롬프트 (Gemini 기본)

```
You are a Samsung GEO/AEO Content Optimization Specialist — an expert in crafting
YouTube descriptions, FAQs, and metadata that maximize visibility in both AI-powered
search engines (ChatGPT, Claude, Gemini, Perplexity) and traditional search (Google, YouTube).

## CORE METHODOLOGY

### GEO (Generative Engine Optimization)
- AI assistants parse pages into small chunks, not top-to-bottom reading
- Content must be structured for extraction and citation
- Each section should be independently identifiable and quotable
- 76% of AI overview citations pull from Top 10 pages (Ahrefs data)

### AEO (Answer Engine Optimization)
- Direct Q&A pairs that AI can extract and use in responses
- Passage-level completeness (each answer works standalone)
- Semantic clarity with measurable specifications

## SIGNAL FUSION FRAMEWORK (Equal Weights - 100% Total)
- Brand Guidelines (33%)
- User Intent Signals (33%)
- User Content (34%) - VIDEO CONTENT = GROUND TRUTH

## ANTI-FABRICATION RULES (CRITICAL)
❌ NEVER: Invent statistics, Include features not in video
✅ ALWAYS: Video content = Ground truth, Use hedging language
```

---

### 4.2 Stage 1: Description (설명문 생성)

**목적**: GEO/AEO 최적화된 YouTube 설명문 생성

**프롬프트 핵심 지침**:
```
## DESCRIPTION STRUCTURE (Optimized for AI Extraction)

### Section 1: Opening Hook (First 130 chars) - CRITICAL
Formula: "[Product Name] + [Key Feature] + [User Benefit]"
- Must be exactly 110-130 characters
- Product name within first 50 characters
- Include primary differentiating feature

Examples:
✅ GOOD: "Introducing the all-new Galaxy Z Flip7. Capture stunning 50 MP selfies
         with FlexWindow for hands-free content creation." (123 chars)
❌ BAD: "Check out the new Samsung phone with amazing features." (too vague)

### Section 2: Learn More CTA
"Learn more: http://smsng.co/[VanityLink]"

### Section 3: Body Content (300-700 chars)
Structure: feature → benefit → specification pattern
- 3-5 key features with measurable specs
- 1-2 expert attribution quotes
- Natural keyword integration
```

**출력 형식 (JSON)**:
```json
{
  "first_130": "110-130자 오프닝",
  "full_description": "전체 설명문 300-1000자",
  "vanity_link": "ZFlip7_Intro_yt"
}
```

---

### 4.3 Stage 2: USP 추출

**목적**: 제품 차별화 포인트 2-8개 추출

**2단계 콘텐츠 우선순위 전략**:
```
### STAGE 1 - VIDEO CONTENT (Primary - HIGHEST PRIORITY)
- Extract USPs DIRECTLY from video content
- Focus on features explicitly mentioned or demonstrated
- Use the video's exact terminology and framing
- Prioritize content appearing in BOTH description AND transcript

### STAGE 2 - GROUNDING FALLBACK (Supplementary - LOWEST PRIORITY)
- Use grounding ONLY if Stage 1 provides insufficient detail
- Validate that grounding content MATCHES video emphasis
- DO NOT use grounding content that contradicts video
```

**필수 그라운딩 쿼리 (5개 소스 타입)**:
```
1. Official: "{{product_name}} [feature] site:samsung.com"
2. Community: "{{product_name}} [feature] reddit"
3. Review Sites: "{{product_name}} [feature] site:gsmarena.com"
4. Video Content: "{{product_name}} [feature] site:youtube.com"
5. Competitive: "{{product_name}} [feature] vs [competitor]"
```

**출력 형식**:
```json
{
  "usps": [
    {
      "feature": "50 MP FlexWindow selfies",
      "category": "Camera",
      "differentiation": "Uses 50 MP rear camera for selfies via 3.4-inch cover display",
      "user_benefit": "Professional-quality selfies without opening the phone",
      "evidence": {
        "sources": ["Video transcript: 0:33-0:45"],
        "quotes": ["Use the 50 megapixel rear camera for selfies"]
      },
      "confidence": "high"
    }
  ],
  "competitive_context": "Brief market positioning",
  "extraction_method": "grounded"
}
```

**주의**: confidence 값은 오직 "high"만 허용됩니다. "low"나 "medium"은 사용하지 않습니다.

---

### 4.4 Stage 3: Chapters (타임스탬프)

**목적**: YouTube 챕터 마커 생성 (SEO/GEO 최적화)

**프롬프트 핵심 지침**:
```
## CHAPTER QUALITY CRITERIA

### ✅ INCLUDE chapters that:
- Product Features: "50MP Camera", "FlexWindow", "Galaxy AI"
- Specifications: "Display Specs", "Battery Life"
- Use Cases: "Photo Demo", "Video Call Setup"

### ❌ EXCLUDE chapters that:
- Personal references: "mochi's dog show"
- Vague labels: "Part 1", "More stuff"
- Marketing fluff: "Amazing reveal"

## CHAPTER TITLE RULES
- LENGTH: 2-5 words maximum
- CAPITALIZATION: Title Case
- KEYWORD OPTIMIZATION: Include feature names, searchable specs
```

**챕터 수 가이드라인**:
| 영상 길이 | 권장 챕터 수 |
|----------|-------------|
| 0-2분 | 3-4개 |
| 2-5분 | 5-7개 |
| 5-10분 | 7-10개 |
| 10분+ | 10-15개 |

**출력 형식**:
```json
{
  "chapters": [
    {"time": "00:00", "title": "Intro"},
    {"time": "00:33", "title": "50MP Camera"},
    {"time": "01:37", "title": "Galaxy AI Features"}
  ],
  "total_chapters": 3
}
```

---

### 4.5 Stage 4: FAQ (자주 묻는 질문)

**목적**: AEO 최적화된 Q&A 2-4쌍 생성

**Samsung Q&A 포맷 표준**:
```
## CRITICAL: SAMSUNG Q&A FORMAT STANDARD
Format MUST be:
Q: [question]
A: [answer]

RULES:
- Use COLON (:) after Q and A, NOT period (.) or slash (/)
- NO blank line between Q and A
- 2-4 Q&A pairs total (NOT 5-7)
- Question length: 10-20 words
- Answer length: 50-100 words
```

**Query Fan-Out 전략**:
| Pattern Type | Example Question Format |
|--------------|------------------------|
| Core Feature | "How does {{product}}'s [feature] work?" |
| Benefit | "What are the benefits of [feature]?" |
| How-To | "How do I set up [feature]?" |
| Specification | "What are the specs of [feature]?" |
| Comparison | "How does [feature] compare to [competitor]?" |
| Troubleshooting | "What should I do if [feature] isn't working?" |

**질문 규칙**:
- How/What/Why/When/Where로 시작해야 함
- 10-20 단어 길이
- 제품명 + 기능 + 맥락 포함

**출력 형식**:
```json
{
  "faqs": [
    {
      "question": "How does the Galaxy Z Flip7 FlexWindow camera feature work for taking high-quality selfies?",
      "answer": "The Galaxy Z Flip7 uses its 50 MP rear camera for selfies through the 3.4-inch FlexWindow cover display. Simply close the phone and tap the cover screen to activate camera mode..."
    }
  ],
  "count": 2,
  "query_fan_out_coverage": ["core_feature", "how_to"]
}
```

---

### 4.6 Stage 5: Case Studies (사용 사례)

**목적**: 페르소나별 사용 시나리오 3-5개 생성

**PCSO 모델 (필수 요소)**:
| 요소 | 설명 | 글자 수 |
|------|------|--------|
| **P**ersona | 구체적 사용자 유형 | 30-50자 |
| **C**hallenge | 실제 문제 상황 | 50-100자 |
| **S**olution | 제품이 해결하는 방법 | 80-150자 |
| **O**utcome | 헤징된 결과 진술 | 50-100자 |

**페르소나 유형**:
1. **Content Creators**: YouTubers, 인플루언서
2. **Mobile Professionals**: 비즈니스 임원, 원격 근무자
3. **Tech Enthusiasts**: 얼리 어답터
4. **Everyday Users**: 일반 소비자
5. **Photography Enthusiasts**: 취미 사진가

**Anti-Fabrication Rules**:
```
❌ FORBIDDEN:
- "Saves 2 hours daily" (검증 불가 통계)
- "50% faster workflow" (퍼센트 주장)
- "Best camera ever made" (비교급 최상급)

✅ REQUIRED (헤징 언어):
- "Designed to help users..."
- "Features like [X] can assist with..."
- "Users may find [feature] helpful for..."
- "The [feature] is built to support..."
```

**출력 형식**:
```json
{
  "case_studies": [
    {
      "persona": "Content Creator - YouTube Shorts Producer",
      "challenge": "Needs to capture high-quality vertical video content hands-free while traveling",
      "solution": "Uses Galaxy Z Flip7's FlexWindow with 50 MP rear camera for selfie preview and FlexMode for hands-free recording",
      "outcome": "Can capture professional-quality content anywhere using just the phone",
      "usp_reference": "FlexWindow selfies",
      "query_targets": ["best phone for content creators", "hands-free video recording"]
    }
  ],
  "persona_coverage": ["Content Creator", "Mobile Professional", "Tech Enthusiast"],
  "anti_fabrication_verified": true
}
```

---

### 4.7 Stage 6: Keywords (키워드 분석)

**목적**: GEO/AEO 스코어링 및 키워드 추출

**스코어링 체계 (100점 만점)**:
| Category | Points | Weight | 설명 |
|----------|--------|--------|------|
| Keyword Density | 20 | 20% | 전략적 키워드 배치 |
| Question Patterns | 20 | 20% | FAQ 최적화 |
| Sentence Structure | 15 | 15% | AI 파싱 가능 구조 |
| Length Compliance | 15 | 15% | 글자/단어 수 요구사항 |
| AI Exposure | 30 | 30% | AI 인용 가능성 |

**키워드 카테고리**:
```
1. PRODUCT-SPECIFIC (제품 특화):
   - Model Name: Galaxy Z Flip7
   - Feature Names: FlexWindow, ProVisual Engine
   - Tech Terms: Galaxy AI, Gemini Live
   - Spec Keywords: 50 MP, 3.4-inch

2. GENERIC COMPETITIVE (일반 경쟁):
   - Category Terms: foldable phone, flip phone
   - Feature Generic: AI camera, all-day battery
   - Use Case Terms: selfie camera, content creation
```

**등급 체계**:
| Score | Grade | Assessment |
|-------|-------|------------|
| 90-100 | A+ | Excellent - Highly optimized |
| 85-89 | A | Very Good |
| 75-84 | B | Good |
| 65-74 | C | Average |
| 50-64 | D | Below Average |
| 0-49 | F | Poor |

**출력 형식**:
```json
{
  "product_keywords": [
    {"keyword": "Galaxy Z Flip7", "frequency": 5, "first_position": 0},
    {"keyword": "FlexWindow", "frequency": 3, "first_position": 45}
  ],
  "generic_keywords": [
    {"keyword": "foldable phone", "frequency": 2, "search_volume": "high"}
  ],
  "scoring": {
    "density_score": {"points": 18, "max": 20},
    "question_score": {"points": 17, "max": 20},
    "structure_score": {"points": 14, "max": 15},
    "length_score": {"points": 13, "max": 15},
    "ai_exposure_score": {"points": 25, "max": 30}
  },
  "total_score": 87,
  "grade": "A",
  "improvement_suggestions": [
    "Add more synonym variations for key features",
    "Strengthen answer completeness in FAQ section"
  ]
}
```

---

### 4.8 Stage 7: Hashtags

**목적**: Samsung 표준 해시태그 3-5개 생성

**Samsung 해시태그 표준 순서 (필수)**:
```
REQUIRED ORDER:
1. #GalaxyAI (ALWAYS FIRST if AI features present)
2. #[ProductName] (e.g., #GalaxyZFlip7)
3. #[ProductSeries] (e.g., #GalaxyZ)
4. #Samsung (ALWAYS LAST)

COUNT: 3-5 hashtags total (NOT 5-8)
```

**예시**:
```
✅ CORRECT: #GalaxyAI #GalaxyZFlip7 #GalaxyZ #Samsung
✅ NO AI: #GalaxyBuds3Pro #GalaxyBuds #Samsung
❌ WRONG: #Samsung #GalaxyZFlip7 #GalaxyAI (순서 틀림)
❌ WRONG: #tech #phone #new (너무 일반적)
```

**금지 해시태그**:
| Category | Examples | 이유 |
|----------|----------|------|
| Ultra-generic | #tech, #phone, #new | 발견 가치 없음 |
| Competitor brands | #iPhone, #Pixel | 브랜드 이탈 |
| Overly long | >20자 | 표시 문제 |
| Marketing | #BestPhoneEver | 비전문적 |

**출력 형식**:
```json
{
  "hashtags": ["#GalaxyAI", "#GalaxyZFlip7", "#GalaxyZ", "#Samsung"],
  "categories": {
    "ai_brand": "#GalaxyAI",
    "product": "#GalaxyZFlip7",
    "series": "#GalaxyZ",
    "brand": "#Samsung"
  },
  "metadata": {
    "total_count": 4,
    "samsung_order_compliant": true,
    "has_ai_features": true
  }
}
```

---

## 5. 이미지 Alt 텍스트 생성 (보조 기능)

**목적**: SEO/접근성 최적화된 이미지 대체 텍스트

**가이드라인**:
| 항목 | 요구사항 |
|------|---------|
| 최대 글자 수 | 125자 |
| 최소 글자 수 | 30자 |
| 금지 시작어 | "이미지", "사진", "Image of", "Picture of" |
| 필수 포함 | 제품명, 주요 특징 |

**이미지 카테고리**:
- front_view, back_view, side_view
- camera_closeup, display_closeup
- lifestyle, color_options
- package_contents, feature_highlight
- comparison, accessories

**프롬프트**:
```
Generate optimized alt text templates for Samsung product:

REQUIREMENTS:
1. Each alt text MUST be under 125 characters
2. DO NOT start with "이미지" or "Image of"
3. INCLUDE the product name naturally
4. INTEGRATE 1-2 relevant keywords naturally

EXAMPLES:
- Front view: "갤럭시 S25 울트라 티타늄 블랙, 6.9인치 다이내믹 아몰레드 디스플레이 정면"
- Camera: "갤럭시 S25 울트라 후면 200MP 쿼드 카메라 시스템 클로즈업"
- Lifestyle: "갤럭시 S25 울트라로 야경 촬영하는 모습, AI 카메라 기능 시연"
```

---

## 6. 프롬프트 로딩 시스템

### 우선순위
1. **Database (prompt_versions 테이블)**: 활성화된 커스텀 프롬프트
2. **Default Fallback**: 코드 내 기본 프롬프트

### 프롬프트 구성 흐름
```
loadTuningConfig()
  → loadActivePrompts(['gemini', 'perplexity', 'cohere'])
    → composeStagePrompt({
        stage: 'description',
        basePrompt: gemini_system_prompt,
        language: 'ko',
        contentType: 'intro'
      })
      → [Base Prompt] + [Stage Instructions] + [Content Type Template] + [Language]
```

### 콘텐츠 타입별 템플릿

| Content Type | 설명 | 특징 |
|--------------|------|------|
| intro | 제품 소개 영상 | 전체 구조 포함 |
| how_to | 사용법 가이드 | 단계별 안내 포함 |
| unboxing | 언박싱 영상 | 구성품 리스트 포함 |
| shorts | 숏폼 콘텐츠 | 200자 미만, Q&A 없음 |
| teaser | 티저 영상 | 미스터리 훅, 최소 정보 |
| official_replay | 이벤트 리플레이 | 종합 타임스탬프 |
| esg | ESG/지속가능성 | 환경 영향 중심 |
| documentary | 다큐멘터리 | 스토리 중심 |
| brand | 브랜드 캠페인 | 브랜드 메시지 중심 |

---

## 7. 최종 출력 구조

```json
{
  "description": {
    "first_130": "오프닝 훅 (110-130자)",
    "full_description": "전체 설명문"
  },
  "usps": [
    {
      "feature": "...",
      "category": "...",
      "differentiation": "...",
      "user_benefit": "...",
      "evidence": {...},
      "confidence": "high"
    }
  ],
  "chapters": [
    {"time": "00:00", "title": "Intro"},
    {"time": "00:33", "title": "50MP Camera"}
  ],
  "faqs": [
    {"question": "...", "answer": "..."}
  ],
  "case_studies": [
    {
      "persona": "...",
      "challenge": "...",
      "solution": "...",
      "outcome": "..."
    }
  ],
  "keywords": {
    "product_keywords": [...],
    "generic_keywords": [...],
    "scoring": {...},
    "total_score": 87
  },
  "hashtags": ["#GalaxyAI", "#GalaxyZFlip7", "#Samsung"],
  "image_alt": {
    "templates": [...],
    "metadata": {...}
  },
  "metadata": {
    "generation_time_ms": 65000,
    "geo_score": 87,
    "cache_hit": false
  }
}
```

---

## 8. 주요 원칙 요약

| 원칙 | 설명 |
|------|------|
| **Video = Ground Truth** | 영상 콘텐츠가 최고 우선순위 |
| **No Fabrication** | 통계/퍼센트 조작 금지 |
| **Hedging Language** | "Designed to help..." 등 헤징 표현 사용 |
| **Samsung Standards** | Q: A: 포맷, 해시태그 순서 준수 |
| **GEO/AEO Focus** | AI 추출 가능한 구조화된 콘텐츠 |
| **Measurable Specs** | "50 MP" (O) vs "high-resolution" (X) |
| **Confidence = High Only** | USP confidence는 오직 "high"만 허용 |
| **2-4 FAQs** | 5-7개가 아닌 2-4개 Q&A |
| **3-5 Hashtags** | Samsung 순서 준수 |

---

## 9. 관련 파일 경로

| 파일 | 역할 |
|------|------|
| `src/app/api/generate-v2/route.ts` | 메인 API 핸들러 |
| `src/lib/geo-v2/usp-extraction.ts` | USP 추출 로직 |
| `src/lib/tuning/integration.ts` | 튜닝 설정 통합 |
| `src/lib/tuning/prompt-loader.ts` | 프롬프트 로더 + 기본 프롬프트 |
| `src/lib/geo-v2/grounding-scorer.ts` | 그라운딩 품질 스코어링 |
| `src/lib/geo-v2/image-alt-generator.ts` | 이미지 Alt 텍스트 생성 |

---

*문서 생성일: 2026-01-29*
