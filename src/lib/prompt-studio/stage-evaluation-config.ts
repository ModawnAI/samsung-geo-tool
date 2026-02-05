/**
 * Stage-Specific Evaluation Configuration
 *
 * Each stage has 4 custom evaluation dimensions that map to the existing
 * DB columns (overall_score, relevance_score, quality_score, creativity_score).
 * No migration needed - just reinterpreting what each column means per stage.
 */

import type { PromptStage } from '@/types/prompt-studio'

export interface EvaluationDimension {
  key: 'overall' | 'relevance' | 'quality' | 'creativity'
  label: string
  labelKo: string
  description: string
  descriptionKo: string
}

export interface StageEvaluationConfig {
  dimensions: [EvaluationDimension, EvaluationDimension, EvaluationDimension, EvaluationDimension]
  judgeContext: string
}

export const STAGE_EVALUATION_CONFIG: Record<PromptStage, StageEvaluationConfig> = {
  grounding: {
    dimensions: [
      { key: 'overall', label: 'Source Quality', labelKo: '소스 품질', description: 'Authority and reliability of discovered sources', descriptionKo: '발견된 소스의 권위성과 신뢰도' },
      { key: 'relevance', label: 'Keyword Coverage', labelKo: '키워드 커버리지', description: 'How well keywords cover the product domain', descriptionKo: '키워드가 제품 도메인을 얼마나 잘 커버하는지' },
      { key: 'quality', label: 'Source Diversity', labelKo: '소스 다양성', description: 'Variety of source types and domains', descriptionKo: '소스 유형과 도메인의 다양성' },
      { key: 'creativity', label: 'Keyword Relevance', labelKo: '키워드 적합성', description: 'Relevance of keywords to actual product features', descriptionKo: '키워드가 실제 제품 특징과 얼마나 관련 있는지' },
    ],
    judgeContext: 'Grounding collects web sources and extracts keywords for a Samsung product. Evaluate: source authority (tier 1 = official Samsung/major tech, tier 2 = trusted review, tier 3 = other), keyword completeness for the product category, diversity of source domains, and keyword-to-product relevance.',
  },
  description: {
    dimensions: [
      { key: 'overall', label: 'GEO Effectiveness', labelKo: 'GEO 효과성', description: 'Overall effectiveness for Generative Engine Optimization', descriptionKo: '생성형 엔진 최적화를 위한 전반적 효과성' },
      { key: 'relevance', label: 'Length Compliance', labelKo: '길이 준수', description: 'Whether the description meets target length requirements', descriptionKo: '설명이 목표 길이 요구사항을 충족하는지' },
      { key: 'quality', label: 'Keyword Integration', labelKo: '키워드 통합', description: 'How naturally keywords are woven into the text', descriptionKo: '키워드가 텍스트에 얼마나 자연스럽게 녹아드는지' },
      { key: 'creativity', label: 'Specificity', labelKo: '구체성', description: 'Level of specific, concrete product details vs generic claims', descriptionKo: '일반적 주장 대비 구체적이고 상세한 제품 정보 수준' },
    ],
    judgeContext: 'Description generates YouTube description content optimized for GEO/AEO. Evaluate: overall GEO effectiveness (AI parseability, structured data), compliance with target character/word length, natural keyword integration without stuffing, and specificity of product claims with concrete details.',
  },
  usp: {
    dimensions: [
      { key: 'overall', label: 'Differentiation', labelKo: '차별화', description: 'How well USPs distinguish the product from competitors', descriptionKo: 'USP가 경쟁 제품과 얼마나 잘 차별화하는지' },
      { key: 'relevance', label: 'Evidence Quality', labelKo: '근거 품질', description: 'Strength and credibility of supporting evidence', descriptionKo: '근거 자료의 강도와 신뢰성' },
      { key: 'quality', label: 'Benefit Clarity', labelKo: '혜택 명확성', description: 'How clearly user benefits are communicated', descriptionKo: '사용자 혜택이 얼마나 명확하게 전달되는지' },
      { key: 'creativity', label: 'Competitive Context', labelKo: '경쟁 맥락', description: 'Quality of competitive positioning and market context', descriptionKo: '경쟁 포지셔닝과 시장 맥락의 품질' },
    ],
    judgeContext: 'USP extracts unique selling points with competitive positioning for a Samsung product. Evaluate: differentiation strength (unique vs generic claims), evidence quality (specs, benchmarks, awards), benefit clarity (feature→benefit translation), and competitive context (meaningful comparisons, market positioning).',
  },
  faq: {
    dimensions: [
      { key: 'overall', label: 'AEO Effectiveness', labelKo: 'AEO 효과성', description: 'Effectiveness for AI Engine Optimization and featured snippets', descriptionKo: 'AI 엔진 최적화 및 추천 스니펫을 위한 효과성' },
      { key: 'relevance', label: 'Question Naturalness', labelKo: '질문 자연스러움', description: 'How natural and realistic the questions sound', descriptionKo: '질문이 얼마나 자연스럽고 현실적으로 들리는지' },
      { key: 'quality', label: 'Answer Completeness', labelKo: '답변 완전성', description: 'Thoroughness and accuracy of answers', descriptionKo: '답변의 완전성과 정확도' },
      { key: 'creativity', label: 'Keyword Coverage', labelKo: '키워드 커버리지', description: 'How well keywords are distributed across Q&A pairs', descriptionKo: '키워드가 Q&A 쌍에 걸쳐 얼마나 잘 분포되는지' },
    ],
    judgeContext: 'FAQ generates Q&A pairs optimized for AEO (AI Engine Optimization). Evaluate: AEO effectiveness (schema.org compatibility, featured snippet potential), question naturalness (real user queries vs manufactured), answer completeness (comprehensive yet concise), and keyword distribution across Q&A pairs.',
  },
  chapters: {
    dimensions: [
      { key: 'overall', label: 'Navigation Value', labelKo: '내비게이션 가치', description: 'How useful the chapters are for video navigation', descriptionKo: '챕터가 비디오 탐색에 얼마나 유용한지' },
      { key: 'relevance', label: 'Timestamp Accuracy', labelKo: '타임스탬프 정확성', description: 'Accuracy and logical progression of timestamps', descriptionKo: '타임스탬프의 정확도와 논리적 진행' },
      { key: 'quality', label: 'Title Clarity', labelKo: '제목 명확성', description: 'How clear and descriptive chapter titles are', descriptionKo: '챕터 제목이 얼마나 명확하고 설명적인지' },
      { key: 'creativity', label: 'Keyword Alignment', labelKo: '키워드 정렬', description: 'How well chapter titles incorporate target keywords', descriptionKo: '챕터 제목이 목표 키워드를 얼마나 잘 포함하는지' },
    ],
    judgeContext: 'Chapters generates timestamp chapters for YouTube video navigation and SEO. Evaluate: navigation value (logical content segmentation, user utility), timestamp accuracy (proper formatting, sequential progression), title clarity (descriptive yet concise), and keyword alignment in chapter titles.',
  },
  case_studies: {
    dimensions: [
      { key: 'overall', label: 'Scenario Credibility', labelKo: '시나리오 신뢰성', description: 'How believable and realistic the use case scenarios are', descriptionKo: '사용 사례 시나리오가 얼마나 믿을 수 있고 현실적인지' },
      { key: 'relevance', label: 'Persona Diversity', labelKo: '페르소나 다양성', description: 'Variety of user personas and use contexts', descriptionKo: '사용자 페르소나와 사용 맥락의 다양성' },
      { key: 'quality', label: 'Outcome Specificity', labelKo: '결과 구체성', description: 'How specific and measurable the outcomes are', descriptionKo: '결과가 얼마나 구체적이고 측정 가능한지' },
      { key: 'creativity', label: 'USP Integration', labelKo: 'USP 연동', description: 'How well case studies connect to product USPs', descriptionKo: '사례 연구가 제품 USP와 얼마나 잘 연결되는지' },
    ],
    judgeContext: 'Case Studies generates real-world use case scenarios for Samsung products. Evaluate: scenario credibility (realistic situations, believable personas), persona diversity (age, profession, use context variety), outcome specificity (concrete results, not vague claims), and USP integration (scenarios that naturally showcase product strengths).',
  },
  keywords: {
    dimensions: [
      { key: 'overall', label: 'SEO Effectiveness', labelKo: 'SEO 효과성', description: 'Overall effectiveness for search engine optimization', descriptionKo: '검색 엔진 최적화를 위한 전반적 효과성' },
      { key: 'relevance', label: 'Distribution Balance', labelKo: '분포 균형', description: 'Balance between primary, secondary, and long-tail keywords', descriptionKo: '주요, 보조, 롱테일 키워드 간의 균형' },
      { key: 'quality', label: 'Search Volume Mix', labelKo: '검색량 믹스', description: 'Mix of high, medium, and low competition keywords', descriptionKo: '높은, 중간, 낮은 경쟁 키워드의 조합' },
      { key: 'creativity', label: 'USP Alignment', labelKo: 'USP 정렬', description: 'How well keywords reflect the product USPs', descriptionKo: '키워드가 제품 USP를 얼마나 잘 반영하는지' },
    ],
    judgeContext: 'Keywords extracts and scores keywords for SEO/GEO optimization. Evaluate: overall SEO effectiveness (search intent coverage, relevance), distribution balance (primary/secondary/long-tail ratio), search volume mix (competition level variety), and alignment with product USPs.',
  },
  hashtags: {
    dimensions: [
      { key: 'overall', label: 'Samsung Compliance', labelKo: '삼성 규정 준수', description: 'Adherence to Samsung hashtag guidelines and brand standards', descriptionKo: '삼성 해시태그 가이드라인 및 브랜드 기준 준수' },
      { key: 'relevance', label: 'Keyword Inclusion', labelKo: '키워드 포함', description: 'How well hashtags incorporate target keywords', descriptionKo: '해시태그가 목표 키워드를 얼마나 잘 포함하는지' },
      { key: 'quality', label: 'Count & Format', labelKo: '개수 및 형식', description: 'Appropriate hashtag count and formatting standards', descriptionKo: '적절한 해시태그 개수와 형식 기준' },
      { key: 'creativity', label: 'Trend Relevance', labelKo: '트렌드 적합성', description: 'Relevance to current trends and discoverability', descriptionKo: '현재 트렌드와 발견 가능성의 적합성' },
    ],
    judgeContext: 'Hashtags generates strategic hashtags following Samsung standards. Evaluate: Samsung compliance (mandatory hashtags like #Samsung, brand guidelines), keyword inclusion (target keywords reflected in hashtags), count and format (appropriate number, proper # formatting, no spaces), and trend relevance (current trending topics, discoverability).',
  },
}

/**
 * Get the evaluation config for a specific stage
 */
export function getEvaluationConfig(stage: PromptStage): StageEvaluationConfig {
  return STAGE_EVALUATION_CONFIG[stage]
}

/**
 * Get the label for a specific dimension in a stage
 */
export function getDimensionLabel(
  stage: PromptStage,
  key: string,
  language: 'ko' | 'en' = 'en'
): string {
  const config = STAGE_EVALUATION_CONFIG[stage]
  const dim = config.dimensions.find((d) => d.key === key)
  if (!dim) return key
  return language === 'ko' ? dim.labelKo : dim.label
}

/**
 * Get the description for a specific dimension in a stage
 */
export function getDimensionDescription(
  stage: PromptStage,
  key: string,
  language: 'ko' | 'en' = 'en'
): string {
  const config = STAGE_EVALUATION_CONFIG[stage]
  const dim = config.dimensions.find((d) => d.key === key)
  if (!dim) return ''
  return language === 'ko' ? dim.descriptionKo : dim.description
}
