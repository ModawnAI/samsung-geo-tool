# Prompt Refiner Chat 구현 계획

> AI 대화를 통한 프롬프트 개선 기능

## 개요

Prompt Studio의 각 Stage에서 프롬프트를 AI와 대화하며 개선할 수 있는 Chat 인터페이스 구현.
hybe-hydra의 `PromptRefinerChat` 패턴을 참고하여 samsung-geo-tool에 맞게 구현.

## 핵심 기능

1. **AI 대화 인터페이스**: Stage 프롬프트를 AI와 대화하며 개선
2. **액션 버튼**: 분석(analyze), 개선(improve), 테스트(test), 일반 대화(chat)
3. **세션 관리**: 대화 내역 저장/불러오기
4. **코드 블록 추출**: AI 응답에서 개선된 프롬프트 자동 추출
5. **프롬프트 적용**: 추출된 프롬프트를 편집기에 바로 적용

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│  Stage Editor Page                                          │
│  /admin/prompt-studio/[stage]                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │  Prompt Editor      │  │  Refiner Chat Panel         │  │
│  │  (기존 Textarea)    │  │  ┌─────────────────────────┐│  │
│  │                     │  │  │ Chat Messages           ││  │
│  │                     │  │  │ - User message          ││  │
│  │                     │  │  │ - AI response           ││  │
│  │                     │  │  │ - Code block (prompt)   ││  │
│  │                     │  │  └─────────────────────────┘│  │
│  │                     │  │  ┌─────────────────────────┐│  │
│  │                     │  │  │ Actions                 ││  │
│  │                     │  │  │ [분석][개선][테스트]    ││  │
│  │                     │  │  └─────────────────────────┘│  │
│  │                     │  │  ┌─────────────────────────┐│  │
│  │                     │  │  │ Input + Send            ││  │
│  │                     │  │  └─────────────────────────┘│  │
│  └─────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 구현 계획

### 1. DB 마이그레이션

**파일**: `supabase/migrations/009_prompt_refine_sessions.sql`

```sql
-- 프롬프트 개선 대화 세션
CREATE TABLE IF NOT EXISTS prompt_refine_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage VARCHAR(30) NOT NULL,
  title VARCHAR(255),
  messages JSONB NOT NULL DEFAULT '[]',
  current_prompt TEXT,
  improved_prompt TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_refine_sessions_stage ON prompt_refine_sessions(stage);
CREATE INDEX idx_refine_sessions_user ON prompt_refine_sessions(created_by);
CREATE INDEX idx_refine_sessions_favorite ON prompt_refine_sessions(is_favorite);
```

### 2. 타입 정의

**파일**: `src/types/prompt-studio.ts` (추가)

```typescript
// Chat message types
export type RefinerAction = 'analyze' | 'improve' | 'test' | 'chat'

export interface RefinerMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  action?: RefinerAction
  codeBlocks?: string[]  // 추출된 프롬프트 코드 블록
  timestamp: string
}

export interface RefineSession {
  id: string
  stage: PromptStage
  title: string | null
  messages: RefinerMessage[]
  currentPrompt: string | null
  improvedPrompt: string | null
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}
```

### 3. API 엔드포인트

**파일**: `src/app/api/prompt-studio/refine/route.ts`

```typescript
// POST /api/prompt-studio/refine
// AI와 대화하여 프롬프트 개선

interface RefineRequest {
  stage: PromptStage
  action: RefinerAction
  currentPrompt: string
  userMessage?: string
  conversationHistory: RefinerMessage[]
  testInput?: Record<string, string>  // test 액션용
}

interface RefineResponse {
  message: RefinerMessage
  extractedPrompt?: string  // 코드 블록에서 추출된 프롬프트
}
```

**파일**: `src/app/api/prompt-studio/refine/sessions/route.ts`

```typescript
// GET /api/prompt-studio/refine/sessions?stage=description
// POST /api/prompt-studio/refine/sessions (새 세션 저장)
```

**파일**: `src/app/api/prompt-studio/refine/sessions/[id]/route.ts`

```typescript
// GET, PATCH, DELETE 개별 세션
```

### 4. 핵심 로직

**파일**: `src/lib/prompt-studio/refiner.ts`

```typescript
// 액션별 시스템 프롬프트 생성
export function buildRefinerSystemPrompt(
  action: RefinerAction,
  stage: PromptStage,
  currentPrompt: string
): string

// AI 응답에서 코드 블록 추출
export function extractCodeBlocks(content: string): string[]

// 프롬프트 개선 요청
export async function refinePrompt(request: RefineRequest): Promise<RefineResponse>
```

### 5. UI 컴포넌트

**파일**: `src/components/prompt-studio/refiner-chat/`

```
refiner-chat/
├── index.tsx              # 메인 채팅 패널
├── chat-messages.tsx      # 메시지 목록 표시
├── chat-input.tsx         # 입력창 + 전송 버튼
├── action-buttons.tsx     # 분석/개선/테스트 액션 버튼
├── code-block.tsx         # 코드 블록 + 적용 버튼
└── session-manager.tsx    # 세션 저장/불러오기
```

### 6. 페이지 통합

**파일**: `src/app/admin/prompt-studio/[stage]/page.tsx` (수정)

- 기존 2-column 레이아웃을 3-column으로 확장
- 또는 우측 패널을 토글 가능한 사이드바로 구현

## 액션별 동작

### 1. 분석 (Analyze)

현재 프롬프트의 강점, 약점, 개선점 분석

**시스템 프롬프트 예시**:
```
당신은 프롬프트 엔지니어링 전문가입니다.
다음 프롬프트를 분석하고 강점, 약점, 개선점을 설명해주세요.

현재 프롬프트:
{currentPrompt}

Stage: {stage} ({stageDescription})

분석할 때 다음을 고려하세요:
- 명확성과 구체성
- 출력 형식 지정
- 예시 포함 여부
- 제약 조건 명시
- 에지 케이스 처리
```

### 2. 개선 (Improve)

분석 결과를 바탕으로 개선된 프롬프트 제안

**시스템 프롬프트 예시**:
```
당신은 프롬프트 엔지니어링 전문가입니다.
다음 프롬프트를 개선해주세요.

현재 프롬프트:
{currentPrompt}

Stage: {stage} ({stageDescription})

개선된 프롬프트는 반드시 ```prompt 코드 블록 안에 작성해주세요.
```

### 3. 테스트 (Test)

개선된 프롬프트로 실제 테스트 실행 후 결과 비교

**동작**:
1. 현재 프롬프트와 개선된 프롬프트 둘 다 실행
2. 결과 비교하여 어떤 것이 더 나은지 평가
3. LLM-as-Judge 패턴으로 품질 점수 부여

### 4. 일반 대화 (Chat)

자유로운 대화로 특정 부분 수정 요청

## UI 상세 설계

### 메시지 표시

```tsx
// 사용자 메시지
<div className="flex justify-end">
  <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
    {message.content}
  </div>
</div>

// AI 메시지
<div className="flex justify-start">
  <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
    <Markdown>{message.content}</Markdown>
    {message.codeBlocks?.map((code, i) => (
      <CodeBlock
        key={i}
        code={code}
        onApply={() => applyPrompt(code)}
      />
    ))}
  </div>
</div>
```

### 액션 버튼

```tsx
<div className="flex gap-2 p-4 border-t">
  <Button
    variant="outline"
    size="sm"
    onClick={() => sendAction('analyze')}
    disabled={isLoading}
  >
    <MagnifyingGlass className="h-4 w-4 mr-1" />
    분석
  </Button>
  <Button
    variant="outline"
    size="sm"
    onClick={() => sendAction('improve')}
    disabled={isLoading}
  >
    <Sparkle className="h-4 w-4 mr-1" />
    개선
  </Button>
  <Button
    variant="outline"
    size="sm"
    onClick={() => sendAction('test')}
    disabled={isLoading || !improvedPrompt}
  >
    <Play className="h-4 w-4 mr-1" />
    테스트
  </Button>
</div>
```

### 코드 블록 + 적용 버튼

```tsx
<div className="relative group">
  <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto">
    <code>{code}</code>
  </pre>
  <Button
    size="sm"
    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
    onClick={onApply}
  >
    <ArrowSquareOut className="h-4 w-4 mr-1" />
    적용
  </Button>
</div>
```

## 파일 목록

### 생성할 파일

| 파일 | 설명 |
|------|------|
| `supabase/migrations/009_prompt_refine_sessions.sql` | DB 마이그레이션 |
| `src/app/api/prompt-studio/refine/route.ts` | 메인 Refine API |
| `src/app/api/prompt-studio/refine/sessions/route.ts` | 세션 목록 API |
| `src/app/api/prompt-studio/refine/sessions/[id]/route.ts` | 개별 세션 API |
| `src/lib/prompt-studio/refiner.ts` | 핵심 로직 |
| `src/components/prompt-studio/refiner-chat/index.tsx` | 메인 컴포넌트 |
| `src/components/prompt-studio/refiner-chat/chat-messages.tsx` | 메시지 표시 |
| `src/components/prompt-studio/refiner-chat/chat-input.tsx` | 입력창 |
| `src/components/prompt-studio/refiner-chat/action-buttons.tsx` | 액션 버튼 |
| `src/components/prompt-studio/refiner-chat/code-block.tsx` | 코드 블록 |
| `src/components/prompt-studio/refiner-chat/session-manager.tsx` | 세션 관리 |

### 수정할 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/types/prompt-studio.ts` | RefinerMessage, RefineSession 타입 추가 |
| `src/app/admin/prompt-studio/[stage]/page.tsx` | RefinerChat 패널 통합 |
| `src/types/database.ts` | prompt_refine_sessions 테이블 타입 추가 |

## 구현 순서

1. **Phase 1: 기본 구조**
   - DB 마이그레이션
   - 타입 정의
   - API 스켈레톤

2. **Phase 2: 핵심 로직**
   - refiner.ts 구현
   - Gemini API 연동
   - 코드 블록 추출

3. **Phase 3: UI 컴포넌트**
   - RefinerChat 메인 컴포넌트
   - 메시지 표시
   - 액션 버튼
   - 코드 블록 + 적용

4. **Phase 4: 세션 관리**
   - 세션 저장/불러오기
   - 즐겨찾기

5. **Phase 5: 페이지 통합**
   - Stage Editor에 통합
   - 토글 사이드바 구현

## 검증 방법

1. Stage 페이지에서 Chat 패널 열기
2. "분석" 버튼 클릭 → 현재 프롬프트 분석 결과 표시
3. "개선" 버튼 클릭 → 개선된 프롬프트가 코드 블록으로 표시
4. "적용" 버튼 클릭 → 왼쪽 편집기에 프롬프트 적용
5. 세션 저장 → 불러오기 확인
