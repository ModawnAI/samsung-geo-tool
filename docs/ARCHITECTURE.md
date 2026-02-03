# Samsung GEO Tool - System Architecture

> Last Updated: 2026-02-02

## Overview

Samsung GEO Tool은 Samsung 제품의 마케팅 콘텐츠를 AI를 활용하여 자동 생성하는 플랫폼입니다. 7단계 파이프라인을 통해 YouTube, Instagram, TikTok 등 다양한 플랫폼에 최적화된 콘텐츠를 생성합니다.

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser["Web Browser"]
    end

    subgraph NextJS["Next.js 15 Application"]
        subgraph Pages["Frontend Pages"]
            Dashboard["Dashboard"]
            Generate["Generate"]
            Review["Review"]
            Tuning["Tuning Console"]
            PromptStudio["Prompt Studio"]
            Analytics["Analytics"]
        end

        subgraph API["API Routes (40+)"]
            GenAPI["/api/generate-v2"]
            TuningAPI["/api/tuning/*"]
            PromptAPI["/api/prompt-studio/*"]
            VideoAPI["/api/video-analysis/*"]
            GroundingAPI["/api/grounding"]
            PlaybookAPI["/api/playbook/*"]
        end

        subgraph Core["Core Libraries"]
            Pipeline["GEO-v2 Pipeline"]
            Cache["Hybrid Cache L1/L2"]
            RAG["RAG System"]
            Logging["Activity Logger"]
        end
    end

    subgraph External["External Services"]
        subgraph AI["AI Engines"]
            Gemini["Google Gemini\n(Content Generation)"]
            Perplexity["Perplexity API\n(Grounding)"]
            Cohere["Cohere\n(Re-ranking)"]
        end

        subgraph Search["Search APIs"]
            GoogleSearch["Google Custom Search"]
            YouTube["YouTube Data API"]
        end
    end

    subgraph Data["Data Layer"]
        Supabase["Supabase\n(PostgreSQL + Auth)"]
        Pinecone["Pinecone\n(Vector DB)"]
    end

    Browser --> Pages
    Pages --> API
    API --> Core
    Core --> AI
    Core --> Search
    Core --> Data
    RAG --> Pinecone
    Cache --> Supabase
```

---

## 2. Directory Structure

```
samsung-geo-tool/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth routes (login)
│   │   ├── (dashboard)/              # Protected dashboard routes
│   │   │   ├── generate/             # Content generation UI
│   │   │   ├── review/               # Content review
│   │   │   ├── tuning/               # Prompt tuning console
│   │   │   ├── analytics/            # Analytics dashboard
│   │   │   ├── briefs/               # Product brief management
│   │   │   ├── settings/             # User settings
│   │   │   ├── history/              # Generation history
│   │   │   ├── activity-logs/        # Activity logs
│   │   │   └── dashboard/            # Main dashboard
│   │   ├── admin/
│   │   │   └── prompt-studio/        # Prompt refinement interface
│   │   └── api/                      # REST API routes (40+ endpoints)
│   ├── components/                   # React components
│   │   ├── features/                 # Feature-specific components
│   │   ├── prompt-studio/            # Prompt refinement UI
│   │   ├── tuning/                   # Tuning console UI
│   │   ├── analytics/                # Analytics components
│   │   ├── settings/                 # Settings components
│   │   └── ui/                       # Radix UI + Aceternity UI
│   ├── lib/                          # Core business logic
│   │   ├── geo-v2/                   # 7-stage pipeline (30+ modules)
│   │   ├── tuning/                   # Prompt/weights management
│   │   ├── prompt-studio/            # Prompt refinement logic
│   │   ├── rag/                      # RAG with Pinecone + Cohere
│   │   ├── video-analysis/           # Gemini video analysis
│   │   ├── cache/                    # Hybrid L1/L2 caching
│   │   ├── logging/                  # Activity & API logging
│   │   ├── supabase/                 # Database access
│   │   └── geo-verification/         # Fact verification
│   ├── types/                        # TypeScript type definitions
│   └── data/                         # Configuration data
├── supabase/schema.sql               # Database schema
├── docs/                             # Documentation
└── public/                           # Static assets
```

---

## 3. 7-Stage Pipeline Architecture

### Pipeline Flow

```mermaid
flowchart TD
    Input["Input\n(Product, YouTube URL, SRT)"]

    subgraph CacheCheck["Cache Layer"]
        L1["L1 Cache\n(In-Memory LRU)"]
        L2["L2 Cache\n(Supabase)"]
    end

    subgraph Pipeline["GEO-v2 Pipeline"]
        Config["Load Config\n(Prompts + Weights)"]

        subgraph Stage1["Stage 1: Description"]
            Desc["Generate Description\n+ Preview"]
        end

        subgraph Stage1_5["Stage 1.5: USP"]
            USP["Extract 3-5 USPs\nwith Evidence"]
        end

        subgraph Parallel1["Parallel Batch 1"]
            S2["Stage 2:\nChapters/Timestamps"]
            S3["Stage 3:\nFAQ Generation"]
        end

        subgraph Parallel2["Parallel Batch 2"]
            S4["Stage 4:\nStep-by-Step Tutorial"]
            S5["Stage 5:\nCase Studies"]
        end

        subgraph Stage6["Stage 6: Keywords"]
            KW["Keyword Extraction\n+ Density Score"]
        end

        subgraph Stage7["Stage 7: Grounding"]
            GR["Source Aggregation\n+ Quality Score"]
        end
    end

    subgraph Generators["Platform Generators"]
        YT["YouTube\n(Title, Meta, Hashtags)"]
        IG["Instagram\n(Caption, Alt Text)"]
        TT["TikTok\n(Cover, Hashtags)"]
    end

    subgraph Quality["Quality Gates"]
        AF["Anti-Fabrication"]
        TC["Tonality Checker"]
        SC["Schema.org"]
    end

    Output["Final Output\n+ Quality Score"]

    Input --> L1
    L1 -->|Miss| L2
    L2 -->|Miss| Config
    Config --> Stage1
    Stage1 --> Stage1_5
    Stage1_5 --> Parallel1
    S2 & S3 --> Parallel2
    S4 & S5 --> Stage6
    Stage6 --> Stage7
    Stage7 --> Generators
    Generators --> Quality
    Quality --> Output
    Output -->|Store| L1 & L2
```

### Stage Details

| Stage | Name | Input | Output | Key Module |
|-------|------|-------|--------|------------|
| 1 | Description | SRT, URL, Product | Preview + Full Description | `pipeline.ts` |
| 1.5 | USP Extraction | Description, Keywords | 3-5 USPs with Evidence | `usp-extraction.ts` |
| 2 | Chapters | Description, SRT | Timestamps, Auto-flag | (parallel) |
| 3 | FAQ | Description, USPs | FAQ Items with Answers | (parallel) |
| 4 | Tutorial | Description | Step-by-Step Guide | (parallel) |
| 5 | Case Studies | Description, USPs | 2-3 Case Studies | (parallel) |
| 6 | Keywords | All Previous | Product + Generic Keywords | `pipeline.ts` |
| 7 | Grounding | All Sources | Aggregated Sources, Score | `grounding-scorer.ts` |

### Platform-Specific Generators

| Platform | Generators |
|----------|------------|
| **YouTube** | Title, Meta Tags, Timestamps, Hashtags, Schema.org |
| **Instagram** | Caption, Alt Text, Engagement Comments, Hashtags |
| **TikTok** | Cover Text, Hashtags |

---

## 4. AI Engines Integration

```mermaid
flowchart LR
    subgraph Input["User Input"]
        UI["Generate Page"]
        Brief["Product Brief"]
        SRT["SRT File"]
    end

    subgraph Processing["Processing"]
        API["generate-v2 API"]
        Tuning["Tuning Config"]
        Playbook["Playbook RAG"]
    end

    subgraph AI["AI Processing"]
        G["Gemini 3"]
        P["Perplexity"]
        C["Cohere"]
    end

    subgraph Storage["Data Storage"]
        DB[(Supabase)]
        VDB[(Pinecone)]
        Cache[(Cache)]
    end

    subgraph Output["Output"]
        Result["Generation Result"]
        Review["Review Queue"]
        Export["Export"]
    end

    UI --> API
    Brief --> API
    SRT --> API

    API --> Tuning
    Tuning --> DB

    API --> G
    API --> P
    P --> C

    Playbook --> VDB
    VDB --> C

    G --> Result
    Result --> Cache
    Result --> DB
    Result --> Review
    Review --> Export
```

### AI Engine Specifications

| Engine | Purpose | Model | Role |
|--------|---------|-------|------|
| **Google Gemini** | Content Generation | `gemini-3-flash-preview` / `gemini-3-pro-preview` | Primary generation engine |
| **Perplexity** | Grounding/Fact Verification | `pplx-latest` | Grounding stage (stage 1.5) |
| **Cohere** | Re-ranking (RAG) | `rerank-v3-english` | Search result ranking |
| **Google Search** | Web Search Grounding | Custom CX | Fact checking |
| **YouTube Data API** | Video Grounding | - | Source discovery |

---

## 5. Database Schema

```mermaid
erDiagram
    users ||--o{ generations : creates
    users ||--o{ activity_logs : has
    products ||--o{ generations : generates
    products ||--o{ briefs : has
    categories ||--o{ products : contains

    users {
        uuid id PK
        string email
        string role
        timestamp created_at
    }

    categories {
        uuid id PK
        string name
        string slug
    }

    products {
        uuid id PK
        uuid category_id FK
        string name
        string slug
        jsonb metadata
    }

    briefs {
        uuid id PK
        uuid product_id FK
        text content
        int version
        timestamp created_at
    }

    generations {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        string youtube_url
        jsonb result
        float quality_score
        timestamp created_at
    }

    stage_prompts {
        uuid id PK
        string stage_name
        text prompt_template
        string workflow_status
        int version
    }

    prompt_versions {
        uuid id PK
        uuid stage_prompt_id FK
        text prompt_content
        boolean is_active
        timestamp created_at
    }

    weights_versions {
        uuid id PK
        jsonb weights
        boolean is_active
        timestamp created_at
    }

    grounding_cache {
        uuid id PK
        string cache_key
        jsonb sources
        timestamp expires_at
    }

    activity_logs {
        uuid id PK
        uuid user_id FK
        string action
        jsonb metadata
        timestamp created_at
    }
```

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | Auth synced users |
| `categories` | Product categories (Mobile, Watch, Ring, Buds, Laptop, XR) |
| `products` | Samsung products (Galaxy S25, Watch 7, Ring 2, etc.) |
| `briefs` | Product brief versioning (1 per product) |
| `generations` | Generated content logs |
| `stage_prompts` | Prompt Studio stage configurations |
| `prompt_versions` | Version tracking for prompts |
| `weights_versions` | Version tracking for scoring weights |
| `grounding_cache` | Cached grounding results |
| `activity_logs` | User activity tracking |
| `api_call_logs` | API call tracking |
| `generation_event_logs` | Generation event tracking |
| `generation_cache` | L2 generation cache |

---

## 6. API Routes

### Generation & Content

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate-v2` | POST | 7-stage pipeline main endpoint |
| `/api/generate-v2-stream` | POST | Streaming responses |
| `/api/generations` | GET | List/fetch generations |
| `/api/briefs` | GET/POST | Product brief management |
| `/api/review` | GET/POST | Content review workflow |

### Tuning & Configuration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tuning/prompts` | GET/POST | Load/save prompts |
| `/api/tuning/prompts/test` | POST | Test prompt variants |
| `/api/tuning/weights` | GET/POST | Load/save scoring weights |
| `/api/tuning/batch` | POST | Batch generation processing |
| `/api/tuning/blacklist` | GET/POST | Manage blacklist |

### Prompt Studio

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/prompt-studio/stages` | GET | List pipeline stages |
| `/api/prompt-studio/stages/[stage]` | GET/PUT | Stage configuration |
| `/api/prompt-studio/stages/[stage]/test` | POST | Test stage |
| `/api/prompt-studio/refine` | POST | Refine prompts |
| `/api/prompt-studio/evaluate` | POST | Evaluate refinements |

### Video Analysis

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/video-analysis` | POST | Upload/analyze videos |
| `/api/video-analysis/analyze` | POST | Trigger analysis |
| `/api/video-analysis/[id]` | GET | Fetch analysis results |
| `/api/video-analysis/thumbnails` | GET | Thumbnail generation |

### Grounding & RAG

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/grounding` | POST | Grounding service |
| `/api/geo-verification/run` | POST | Fact verification |
| `/api/playbook/search` | POST | Search Samsung playbook |
| `/api/playbook/ingest` | POST | Ingest playbook docs |
| `/api/playbook/vectors` | GET/DELETE | Manage embeddings |

---

## 7. Caching Architecture

```mermaid
flowchart TD
    Request["Generation Request"]

    subgraph L1["L1 Cache (In-Memory)"]
        LRU["LRU Cache\n~100 entries\nμs latency"]
    end

    subgraph L2["L2 Cache (Supabase)"]
        DB["generation_cache\ngrounding_cache\nms latency"]
    end

    subgraph Compute["Fresh Computation"]
        Pipeline2["GEO-v2 Pipeline\nseconds latency"]
    end

    Request --> L1
    L1 -->|HIT| Response1["Instant Response"]
    L1 -->|MISS| L2
    L2 -->|HIT| Promote["Promote to L1"]
    Promote --> Response2["Fast Response"]
    L2 -->|MISS| Compute
    Compute --> Store["Store in L1 + L2"]
    Store --> Response3["Computed Response"]
```

### Cache Strategy

| Layer | Storage | Latency | Capacity | Persistence |
|-------|---------|---------|----------|-------------|
| **L1** | In-Memory LRU | μs | ~100 entries | No |
| **L2** | Supabase | ms | Unlimited | Yes |

**Cache Key Format**: `[productName]_[youtubeUrl]_[srtHash]_[platform]`

---

## 8. Prompt Tuning Workflow

```mermaid
sequenceDiagram
    participant User as User
    participant UI as Tuning Console
    participant API as /api/tuning
    participant DB as Supabase
    participant Pipeline as GEO Pipeline

    User->>UI: Edit Prompt
    UI->>API: POST /prompts
    API->>DB: Save to prompt_versions
    API-->>UI: Version Created

    User->>UI: Test Prompt
    UI->>API: POST /prompts/test
    API->>Pipeline: Run with test config
    Pipeline-->>API: Test Result
    API-->>UI: Show Result

    User->>UI: Set Active
    UI->>API: PATCH /prompts/{id}
    API->>DB: Update is_active

    Note over Pipeline: Next generation uses new prompt

    User->>UI: Generate Content
    UI->>API: POST /generate-v2
    API->>DB: loadTuningConfig()
    DB-->>API: Active Prompts + Weights
    API->>Pipeline: Execute with config
    Pipeline-->>API: Result
    API-->>UI: Final Output
```

### Configuration Flow

```
Settings UI → /api/tuning/prompts → prompt_versions table → loadTuningConfig() → generate-v2 pipeline
```

---

## 9. Technology Stack

```mermaid
flowchart TB
    subgraph Frontend["Frontend"]
        Next["Next.js 15"]
        React["React 19"]
        TW["Tailwind CSS v4"]
        Radix["Radix UI"]
        Aceternity["Aceternity UI"]
        Framer["Framer Motion"]
        Zustand["Zustand"]
    end

    subgraph Backend["Backend"]
        NodeJS["Node.js"]
        TS["TypeScript"]
        APIRoutes["API Routes"]
    end

    subgraph AI_ML["AI/ML Services"]
        Gemini3["Gemini 3\nFlash/Pro"]
        Perplexity2["Perplexity\npplx-latest"]
        Cohere2["Cohere\nrerank-v3"]
    end

    subgraph Database["Database & Storage"]
        Supa["Supabase\n(PostgreSQL)"]
        Pine["Pinecone\n(Vector DB)"]
        SupaAuth["Supabase Auth"]
        SupaStorage["Supabase Storage"]
    end

    subgraph External2["External APIs"]
        GSearch["Google Search API"]
        YTData["YouTube Data API"]
    end

    subgraph Infra["Infrastructure"]
        Vercel["Vercel"]
        SupaCloud["Supabase Cloud"]
        PineCloud["Pinecone Cloud"]
        GCloud["Google Cloud"]
    end

    Frontend --> Backend
    Backend --> AI_ML
    Backend --> Database
    Backend --> External2
    Frontend --> Infra
    Database --> Infra
```

### Stack Summary

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS v4, Radix UI, Aceternity UI, Framer Motion, Zustand |
| **Backend** | Node.js, TypeScript, Next.js API Routes |
| **AI/ML** | Gemini 3 (Flash/Pro), Perplexity API, Cohere (rerank-v3) |
| **Database** | Supabase (PostgreSQL), Pinecone (Vector DB) |
| **External APIs** | Google Search API, YouTube Data API |
| **Infrastructure** | Vercel, Supabase Cloud, Pinecone Cloud, Google Cloud |

---

## 10. Infrastructure Architecture

### Unified Infrastructure View

Samsung GEO Tool의 전체 인프라와 데이터 흐름을 보여주는 통합 다이어그램입니다.

**목적**: Samsung 제품의 마케팅 콘텐츠를 AI로 자동 생성하여 YouTube, Instagram, TikTok 등에 배포

```mermaid
flowchart TB
    subgraph INPUT["INPUT: 사용자 입력"]
        User["Marketing Team"]
        ProductInfo["제품 정보<br/>Galaxy S25, Watch 7 등"]
        VideoURL["YouTube URL"]
        SRTFile["SRT 자막 파일"]
    end

    subgraph HOSTING["HOSTING: Vercel Platform"]
        subgraph EdgeNetwork["Edge Network - 글로벌 CDN"]
            CDN["정적 자산 캐싱"]
            Middleware["인증 미들웨어"]
        end

        subgraph ServerlessFn["Serverless Functions"]
            NextApp["Next.js 15 App"]
            APIRoutes["API Routes"]
        end
    end

    subgraph APPLICATION["APPLICATION: 핵심 로직"]
        subgraph Pipeline["GEO-v2 7단계 파이프라인"]
            S1["1. Description 생성"]
            S2["2. USP 추출"]
            S3["3. Chapters/FAQ"]
            S4["4. Case Studies"]
            S5["5. Keywords"]
            S6["6. Grounding 검증"]
            S7["7. 플랫폼별 콘텐츠"]
        end

        subgraph Cache["하이브리드 캐시"]
            L1["L1: 메모리 캐시"]
            L2["L2: DB 캐시"]
        end
    end

    subgraph DATABASE["DATABASE: Supabase Cloud"]
        Auth["Auth Service<br/>JWT + RLS"]
        PostgreSQL["PostgreSQL<br/>users, products,<br/>generations, prompts"]
        Storage["Storage<br/>비디오, SRT 파일"]
    end

    subgraph VECTOR["VECTOR DB: Pinecone"]
        Playbook["Samsung Playbook<br/>제품 스펙, 마케팅 가이드"]
        Embeddings["Vector Embeddings<br/>RAG 검색용"]
    end

    subgraph AI["AI SERVICES: 콘텐츠 생성"]
        subgraph Google["Google Cloud"]
            Gemini["Gemini 3<br/>콘텐츠 생성 엔진"]
            Search["Custom Search<br/>웹 검색 그라운딩"]
            YouTube["YouTube API<br/>비디오 메타데이터"]
        end

        subgraph External["External AI"]
            Perplexity["Perplexity<br/>실시간 팩트체크"]
            Cohere["Cohere<br/>검색 결과 리랭킹"]
        end
    end

    subgraph OUTPUT["OUTPUT: 생성 결과물"]
        YTContent["YouTube<br/>제목, 설명, 해시태그, 타임스탬프"]
        IGContent["Instagram<br/>캡션, 대체텍스트, 댓글"]
        TTContent["TikTok<br/>커버 텍스트, 해시태그"]
        Schema["Schema.org<br/>구조화된 데이터"]
    end

    subgraph DEVOPS["DEVOPS: CI/CD"]
        GitHub["GitHub Repository"]
        VercelCI["Vercel 자동 배포"]
        Envs["환경: Dev / Preview / Prod"]
    end

    %% 입력 흐름
    User --> ProductInfo & VideoURL & SRTFile
    ProductInfo & VideoURL & SRTFile --> EdgeNetwork

    %% 호스팅 흐름
    EdgeNetwork --> ServerlessFn
    Middleware --> Auth

    %% 애플리케이션 흐름
    APIRoutes --> Pipeline
    Pipeline --> Cache
    S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7

    %% 데이터베이스 흐름
    APIRoutes --> PostgreSQL
    APIRoutes --> Storage
    L2 --> PostgreSQL

    %% 벡터 DB 흐름
    Pipeline --> Embeddings
    Embeddings --> Cohere

    %% AI 흐름
    Pipeline --> Gemini
    Pipeline --> Perplexity
    Pipeline --> Search
    Pipeline --> YouTube

    %% 출력 흐름
    S7 --> YTContent & IGContent & TTContent & Schema

    %% DevOps 흐름
    GitHub --> VercelCI --> Envs
    Envs --> HOSTING
```

### 서비스별 역할 및 비용 구조

| 서비스 | 역할 | 비용 모델 |
|--------|------|-----------|
| **Vercel** | Next.js 호스팅, 서버리스 함수, 글로벌 CDN | 사용량 기반 (함수 호출, 대역폭) |
| **Supabase** | PostgreSQL DB, 인증, 파일 스토리지 | 티어 기반 (DB 크기, 사용자 수) |
| **Pinecone** | 벡터 DB, RAG 검색 | 팟 기반 (벡터 수, 쿼리 수) |
| **Gemini** | 콘텐츠 생성 (메인 엔진) | 토큰 기반 (입출력 토큰) |
| **Perplexity** | 실시간 웹 검색, 팩트 그라운딩 | 요청 기반 (API 호출 수) |
| **Cohere** | 검색 결과 리랭킹, 임베딩 | 토큰 기반 (리랭크 연산) |
| **Google Search** | 웹 검색 그라운딩 | 쿼리 기반 (일 100회 무료) |

### 데이터 흐름 요약

```
사용자 입력 → Vercel Edge → API Route → 인증 확인 → 캐시 체크
                                                    ↓
                                          ┌─ L1 HIT → 즉시 반환
                                          ├─ L2 HIT → L1 승격 → 반환
                                          └─ MISS → AI 파이프라인 실행
                                                    ↓
                                          7단계 생성 → 캐시 저장 → 결과 반환
```

### Infrastructure Summary Table

| Layer | Components | Purpose | Scaling |
|-------|------------|---------|---------|
| **User** | Browser, Mobile | Client access | N/A |
| **Edge** | Vercel CDN, Middleware | Caching, Auth, Rate limit | Auto (Global) |
| **Application** | Next.js, API Routes | Business logic, Pipeline | Auto (0→N) |
| **Data** | Supabase, Pinecone | Persistence, Vector search | Tier-based |
| **AI** | Gemini, Perplexity, Cohere | Content generation, Grounding | Rate-limited |
| **DevOps** | GitHub, Vercel CI/CD | Source control, Deployment | N/A |
| **Security** | Env vars, JWT, RLS | Authentication, Authorization | N/A |

### Data Flow Summary

```
User Request → Edge (Cache Check) → API Route → Auth Verify → Pipeline Execute
    ↓
    ├─→ L1 Cache (Memory) → HIT → Return
    ├─→ L2 Cache (Supabase) → HIT → Promote to L1 → Return
    └─→ MISS → AI Generation → Store Cache → Return
```

---

### Cloud Infrastructure Diagram

```mermaid
flowchart TB
    subgraph Users["Users"]
        Browser["Web Browser"]
    end

    subgraph Vercel["Vercel Hosting"]
        Edge["Edge Network<br/>Global CDN"]
        Serverless["Serverless Functions<br/>API Routes"]
        Static["Static Assets<br/>Next.js Build"]
    end

    subgraph SupabaseCloud["Supabase Cloud"]
        SupaAuth["Auth Service"]
        SupaDB["PostgreSQL<br/>Database"]
        SupaStorage["Storage<br/>File Uploads"]
        SupaRealtime["Realtime<br/>WebSocket"]
    end

    subgraph PineconeCloud["Pinecone Cloud"]
        VectorIndex["Vector Index<br/>Playbook RAG"]
    end

    subgraph GoogleCloud["Google Cloud Platform"]
        GeminiAPI["Gemini API<br/>AI Generation"]
        SearchAPI["Custom Search API<br/>Grounding"]
        YouTubeAPI["YouTube Data API<br/>Video Info"]
    end

    subgraph ExternalAI["External AI Services"]
        PerplexityAPI["Perplexity API<br/>Grounding"]
        CohereAPI["Cohere API<br/>Re-ranking"]
    end

    Browser -->|HTTPS| Edge
    Edge --> Static
    Edge --> Serverless

    Serverless -->|Auth| SupaAuth
    Serverless -->|Query| SupaDB
    Serverless -->|Upload| SupaStorage

    Serverless -->|Embed/Search| VectorIndex

    Serverless -->|Generate| GeminiAPI
    Serverless -->|Search| SearchAPI
    Serverless -->|Metadata| YouTubeAPI

    Serverless -->|Ground| PerplexityAPI
    Serverless -->|Rerank| CohereAPI
```

### Deployment Architecture

```mermaid
flowchart LR
    subgraph Dev["Development"]
        Local["Local Dev<br/>npm run dev"]
        Git["Git Repository<br/>GitHub"]
    end

    subgraph CI["CI/CD - Vercel"]
        Preview["Preview Deployment<br/>PR Branch"]
        Production["Production Deployment<br/>main Branch"]
    end

    subgraph Env["Environments"]
        DevEnv["Development<br/>localhost:3000"]
        PreviewEnv["Preview<br/>*.vercel.app"]
        ProdEnv["Production<br/>custom domain"]
    end

    Local -->|commit| Git
    Git -->|PR| Preview
    Git -->|merge to main| Production

    Local --> DevEnv
    Preview --> PreviewEnv
    Production --> ProdEnv
```

### Infrastructure Components

| Component | Service | Region | Purpose |
|-----------|---------|--------|---------|
| **Hosting** | Vercel | Global (Edge) | Next.js hosting, serverless functions |
| **Database** | Supabase | - | PostgreSQL, Auth, Storage |
| **Vector DB** | Pinecone | - | Playbook embeddings, RAG search |
| **AI Generation** | Google Gemini | - | Content generation |
| **AI Grounding** | Perplexity | - | Fact verification, web search |
| **AI Ranking** | Cohere | - | Search result re-ranking |
| **Search** | Google Custom Search | - | Web search for grounding |
| **Video** | YouTube Data API | - | Video metadata extraction |

### Request Flow

```mermaid
sequenceDiagram
    participant User as User Browser
    participant CDN as Vercel Edge
    participant API as Serverless Function
    participant Auth as Supabase Auth
    participant DB as Supabase DB
    participant AI as AI Services

    User->>CDN: Request Page
    CDN->>User: Static Assets (cached)

    User->>CDN: API Request
    CDN->>API: Forward to Function

    API->>Auth: Verify JWT
    Auth-->>API: User Context

    API->>DB: Load Config
    DB-->>API: Prompts, Weights

    API->>AI: Generate Content
    AI-->>API: AI Response

    API->>DB: Store Result
    API-->>CDN: JSON Response
    CDN-->>User: Final Response
```

### Scaling Characteristics

| Layer | Scaling Model | Limits |
|-------|---------------|--------|
| **Vercel Edge** | Auto-scale (Global) | Unlimited requests |
| **Serverless Functions** | Auto-scale (0 to N) | 10s default timeout, 60s max |
| **Supabase** | Connection pooling | Based on plan tier |
| **Pinecone** | Pod-based scaling | Based on plan tier |
| **AI APIs** | Rate limited | Per-API quotas |

### Environment Configuration

```mermaid
flowchart TD
    subgraph EnvVars["Environment Variables"]
        subgraph AI_Keys["AI Service Keys"]
            GEMINI["GEMINI_API_KEY"]
            PERPLEXITY["PERPLEXITY_API_KEY"]
            COHERE["COHERE_API_KEY"]
            OPENAI["OPENAI_API_KEY"]
        end

        subgraph DB_Keys["Database Keys"]
            SUPA_URL["NEXT_PUBLIC_SUPABASE_URL"]
            SUPA_ANON["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
            SUPA_SERVICE["SUPABASE_SERVICE_ROLE_KEY"]
            PINECONE["PINECONE_API_KEY"]
        end

        subgraph Search_Keys["Search API Keys"]
            GOOGLE["GOOGLE_API_KEY"]
            GOOGLE_CX["GOOGLE_CX"]
        end
    end

    subgraph Deployment["Vercel Deployment"]
        VercelEnv["Vercel Environment<br/>Variables"]
    end

    AI_Keys --> VercelEnv
    DB_Keys --> VercelEnv
    Search_Keys --> VercelEnv
```

### Security Architecture

```mermaid
flowchart TB
    subgraph Client["Client Side"]
        Browser2["Browser"]
        AnonKey["Supabase Anon Key<br/>Public, Limited"]
    end

    subgraph Server["Server Side"]
        API2["API Routes"]
        ServiceKey["Supabase Service Key<br/>Private, Full Access"]
        AIKeys["AI API Keys<br/>Private"]
    end

    subgraph Auth2["Authentication"]
        JWT["JWT Token"]
        RLS["Row Level Security"]
    end

    Browser2 -->|Anon Key| AnonKey
    AnonKey -->|Limited Access| RLS

    API2 -->|Service Key| ServiceKey
    ServiceKey -->|Full Access| RLS

    Browser2 -->|JWT| JWT
    JWT -->|Verify| API2
    API2 -->|Use| AIKeys
```

### Cost Structure

| Service | Billing Model | Primary Cost Driver |
|---------|---------------|---------------------|
| **Vercel** | Usage-based | Function invocations, bandwidth |
| **Supabase** | Tier-based | Database size, auth users |
| **Pinecone** | Pod-based | Vector count, queries |
| **Gemini** | Token-based | Input/output tokens |
| **Perplexity** | Request-based | API calls |
| **Cohere** | Token-based | Rerank operations |
| **Google Search** | Query-based | Search queries/day |

### Monitoring & Observability

| Aspect | Tool | Data |
|--------|------|------|
| **Application Logs** | Vercel Logs | API requests, errors |
| **Database Metrics** | Supabase Dashboard | Queries, connections |
| **Custom Analytics** | `activity_logs` table | User actions, generations |
| **API Tracking** | `api_call_logs` table | Latency, errors |
| **Generation Events** | `generation_event_logs` | Pipeline stages |

---

## 11. Key Features

### Content Generation
- 7-stage pipeline with parallel execution
- Multi-platform support (YouTube, Instagram, TikTok)
- USP-centric content architecture
- Grounding quality scoring
- Anti-fabrication guardrails

### Tuning & Configuration
- Prompt Studio for iterative refinement
- Prompt versioning & deployment
- Scoring weights configuration
- Batch testing
- Real-time feedback & metrics

### Video Analysis
- Gemini video understanding
- Automatic SRT extraction
- Content type detection
- Visual analysis

### Content Review
- Multi-step review workflow
- Quality gates before publishing
- Approval tracking
- Content confirmation

### Analytics & Monitoring
- Generation metrics
- Source click tracking
- User engagement
- Performance analytics
- Activity logging

---

## 12. Environment Variables

```bash
# AI Services
GEMINI_API_KEY=
PERPLEXITY_API_KEY=
COHERE_API_KEY=

# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Vector DB
PINECONE_API_KEY=
PINECONE_INDEX_NAME=

# Search APIs
GOOGLE_API_KEY=
GOOGLE_CX=
```

---

## 13. Supabase Configuration

- **Project ID**: `bizvgdpbuhvvgfihmlgj`
- **Admin Email**: admin@admin.com
- **Admin Password**: admin123

---

## 14. Key Architecture Decisions

1. **USP-Centric Design**: The entire pipeline revolves around extracting and validating unique selling points
2. **Multi-Engine AI**: Leverages different AI models for different purposes (Gemini for generation, Perplexity for grounding, Cohere for ranking)
3. **Highly Configurable**: Prompts, weights, and parameters can be tuned without code changes
4. **Quality-Focused**: Multiple validation layers (anti-fabrication, tonality checking, grounding quality scoring)
5. **Extensible**: Easy to add new pipeline stages or platform-specific generators
6. **Performant**: Hybrid caching, parallel execution, streaming responses
7. **Observable**: Comprehensive logging for debugging and optimization

---

## Appendix: File References

### Core Pipeline
- `src/lib/geo-v2/pipeline.ts` - Main pipeline orchestrator
- `src/lib/geo-v2/usp-extraction.ts` - USP extraction module
- `src/lib/geo-v2/grounding-scorer.ts` - Grounding quality scorer
- `src/lib/geo-v2/anti-fabrication.ts` - Content validation

### Platform Generators
- `src/lib/geo-v2/title-generator.ts` - YouTube titles
- `src/lib/geo-v2/meta-tags-generator.ts` - SEO meta tags
- `src/lib/geo-v2/instagram-description-generator.ts` - Instagram captions
- `src/lib/geo-v2/hashtag-generator.ts` - Platform-specific hashtags
- `src/lib/geo-v2/schema-generator.ts` - Schema.org structured data

### Configuration
- `src/lib/tuning/prompt-loader.ts` - Prompt configuration loader
- `src/lib/tuning/weights-loader.ts` - Scoring weights loader
- `src/lib/cache/hybrid-cache.ts` - L1/L2 cache implementation
