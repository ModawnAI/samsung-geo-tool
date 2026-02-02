# Moltbot 브랜치 기능 요약

이 문서는 `moltbot` 브랜치에서 개발된 모든 기능과 개선사항을 정리합니다.

---

## 🎥 비디오 분석 기능 (Video Analysis)

### 핵심 기능
- **Gemini 3 Flash Preview AI 통합**: Google의 최신 멀티모달 AI를 활용한 비디오 분석
- **비디오 업로드**: Supabase Storage를 통한 안전한 비디오 파일 업로드
- **자동 분석**: 업로드된 비디오에서 다음 정보를 자동 추출:
  - SEO 최적화 제목 및 메타 설명
  - 전체 음성 트랜스크립트
  - 화면에 표시된 텍스트 (타임스탬프 포함)
  - 제품 정보 (이름, 모델, 카테고리, 태그라인, 가격)
  - 기능 및 사양 목록
  - USP (고유 판매 포인트)
  - CTA (행동 유도 문구)
  - 타임스탬프 기반 챕터
  - 키워드 (주요/보조/롱테일)
  - 해시태그 추천
  - 경쟁사 언급 분석
  - 브랜드 보이스 분석
  - 통계 및 수치 추출

### 플랫폼별 최적화
- **YouTube**: 시청 시간, CTR, 참여도 최적화
- **TikTok**: 숏폼 콘텐츠, 트렌딩 해시태그 최적화
- **Instagram Reels**: 비주얼 중심, 해시태그 전략
- **YouTube Shorts**: 수직 포맷, 루프 친화적 콘텐츠

### 데이터 지속성
- Zustand 스토어와 localStorage를 활용한 분석 결과 저장
- 탭 전환 시에도 분석 결과 유지
- "상세 분석 결과 보기" 확장 섹션 제공

---

## 🎯 콘텐츠 생성 플로우 개선

### 탭 기반 인터페이스
- **Product Selection**: 제품 선택 및 템플릿 로드
- **Keyword & Content**: 키워드 선택 및 비디오 분석
- **Brief Setup**: 브리프 설정 및 USP 관리
- **Generate**: AI 콘텐츠 생성

### 스마트 기본값 (Smart Defaults)
- 플랫폼별 최적 설정 자동 적용
- 빠른 시작 기능으로 워크플로우 단순화

---

## 📋 템플릿 관리자 개선

### 저장 템플릿 다이얼로그 리디자인
- 넓은 모달 레이아웃 (4xl 최대 너비)
- 2컬럼 그리드 레이아웃
- 카드 스타일 체크박스 선택
- 포함 항목 선택:
  - 제품 정보
  - 키워드
  - 브리프 USP
  - 캠페인 태그

### 브리프 템플릿
- USP 기반 브리프 템플릿 저장 기능
- 재사용 가능한 브리프 구성

---

## 🖥️ UI/UX 개선사항

### 플랫폼 선택기
- 향상된 시각적 피드백
- 플랫폼별 아이콘 및 설명

### Quick Copy Panel
- 생성된 콘텐츠 빠른 복사 기능
- 섹션별 개별 복사 지원

### Quick Export Bar
- 빠른 내보내기 도구 모음
- 다양한 형식 지원

### 키보드 단축키 도움말
- 사용 가능한 단축키 안내
- 접근성 향상

### 콘텐츠 미리보기 카드
- 생성 전 콘텐츠 미리보기
- 플랫폼별 미리보기 스타일

### Schema.org 표시 개선
- 구조화된 데이터 시각화
- VideoObject, FAQPage 스키마 지원

### 톤앨리티 인디케이터
- 브랜드 보이스 체크 기능
- 톤 일관성 시각화

---

## ♿ 접근성 (Accessibility)

### WCAG 개선사항
- 접근성 래퍼 컴포넌트 추가
- 스크린 리더 지원 향상
- 키보드 네비게이션 개선
- ARIA 레이블 추가

---

## 🐛 버그 수정

### 플랫폼 관련
- TikTok 플랫폼 전체 기능 활성화
- 플랫폼별 캐시 키 분리 (크로스-플랫폼 캐시 히트 방지)
- API 요청에 플랫폼 정보 포함

### FAQ 관련
- FAQ 중복 문제 수정
- Q:/A: 접두사 중복 제거

### UI 관련
- 입력 카운트 번역 문자열 누락 수정
- 중첩 버튼 문제 수정
- Review 워크플로우 네비게이션 추가

### 비디오 분석 관련
- Supabase RLS 정책 우회 (admin 클라이언트 사용)
- 비디오 다운로드 방식 개선 (public URL → admin storage download)

---

## 📊 데이터베이스 변경사항

### video_analyses 테이블 새 컬럼
```sql
- full_transcript (TEXT)
- on_screen_text (JSONB)
- product_info (JSONB)
- features_and_specs (JSONB)
- usps (JSONB)
- call_to_actions (JSONB)
- timestamps_chapters (JSONB)
- brand_voice (TEXT)
- statistics_mentioned (JSONB)
- competitor_mentions (JSONB)
- hashtags_suggested (JSONB)
```

---

## 📝 문서화

### QA 리포트
- QA 세션 1, 2, 3 리포트 작성
- 엣지 케이스 및 내보내기 테스트 결과
- Instagram 플로우 테스트 결과

### 이터레이션 요약
- 개발 진행 상황 문서화

---

## 🔧 기술 스택 업데이트

- **Gemini 3 Flash Preview**: 최신 멀티모달 AI 모델 적용
- **Zustand 지속성**: localStorage 기반 상태 저장
- **Supabase Admin Client**: RLS 우회를 위한 서버사이드 admin 클라이언트

---

## 파일 변경 요약

### 새로 생성된 파일
- `src/lib/video-analysis/gemini-analyzer.ts` - Gemini API 통합
- `src/components/features/video-upload-input.tsx` - 비디오 업로드 컴포넌트
- `src/app/api/video-analysis/upload/route.ts` - 업로드 API
- `src/app/api/video-analysis/analyze/route.ts` - 분석 API
- `src/types/video-analysis.ts` - 비디오 분석 타입 정의

### 수정된 파일
- `src/store/generation-store.ts` - 비디오 분석 상태 추가
- `src/components/features/template-manager.tsx` - 모달 리디자인
- `src/types/database.ts` - 데이터베이스 타입 업데이트

---

*마지막 업데이트: 2026년 1월*
