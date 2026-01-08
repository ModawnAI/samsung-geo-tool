'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  BookOpenText,
  MagnifyingGlass,
  PencilLine,
  Target,
  TrendUp,
  CheckCircle,
  Info,
  ChatCircleText,
  Database,
  Gear,
  Warning,
  ShieldCheck,
  Lightbulb,
  ArrowRight,
  CaretDown,
  CaretUp,
  ArrowClockwise,
  Copy,
  ListChecks,
  Lightning,
  ArrowSquareOut,
  Sparkle,
  Star,
  ClipboardText,
  TextAlignLeft,
  Quotes,
  TreeStructure,
} from '@phosphor-icons/react'
import type { GenerationBreakdown as BreakdownType, TuningMetadata, ScoreBreakdownItem } from '@/store/generation-store'
import { useState, useCallback } from 'react'
import { DEFAULT_WEIGHTS, WEIGHT_LABELS, type WeightValues } from '@/types/tuning'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Action types for the callback
export type ActionType =
  | 'regenerate_usps'
  | 'regenerate_grounded'
  | 'regenerate_aligned'
  | 'verify_claims'
  | 'add_keywords'
  | 'improve_structure'
  | 'regenerate_all'
  | 'copy_fix'

export interface ActionPayload {
  type: ActionType
  metric?: string
  details?: string
}

interface GenerationBreakdownProps {
  breakdown: BreakdownType
  tuningMetadata?: TuningMetadata | null
  onAction?: (action: ActionPayload) => void
  isRegenerating?: boolean
}

const SIGNAL_WEIGHTS = {
  playbook: 33,
  grounding: 33,
  userContent: 34,
}

export function GenerationBreakdown({
  breakdown,
  tuningMetadata,
  onAction,
  isRegenerating = false
}: GenerationBreakdownProps) {
  const { playbookInfluence, groundingInfluence, userInputInfluence } = breakdown

  return (
    <TooltipProvider>
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              생성 결과 분석
            </CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>가중치 융합을 사용하여 각 신호 소스가 생성된 콘텐츠에 어떤 영향을 미쳤는지 보여줍니다.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Playbook Influence */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpenText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">브랜드 가이드라인</span>
                <Badge variant="outline" className="text-xs">
                  {SIGNAL_WEIGHTS.playbook}%
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {playbookInfluence.guidelinesApplied}개 가이드라인
              </span>
            </div>
            <Progress value={playbookInfluence.confidence} className="h-2 [&>div]:bg-[#040523] dark:[&>div]:bg-slate-300" />
            {playbookInfluence.sectionsUsed.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {playbookInfluence.sectionsUsed.slice(0, 4).map((section) => (
                  <Badge
                    key={section}
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {formatSectionName(section)}
                  </Badge>
                ))}
                {playbookInfluence.sectionsUsed.length > 4 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    +{playbookInfluence.sectionsUsed.length - 4}개 더
                  </Badge>
                )}
              </div>
            )}
          </motion.div>

          {/* Grounding Influence */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MagnifyingGlass className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">사용자 의도 신호</span>
                <Badge variant="outline" className="text-xs">
                  {SIGNAL_WEIGHTS.grounding}%
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {groundingInfluence.signalsApplied}개 신호
              </span>
            </div>
            {groundingInfluence.topSignals.length > 0 ? (
              <div className="space-y-1.5">
                {groundingInfluence.topSignals.slice(0, 3).map((signal, i) => (
                  <div
                    key={signal.term}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <TrendUp
                        className={`h-3 w-3 flex-shrink-0 ${
                          i === 0
                            ? 'text-foreground'
                            : i === 1
                              ? 'text-muted-foreground'
                              : 'text-muted-foreground/60'
                        }`}
                      />
                      <span className="truncate font-medium">{signal.term}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Progress
                        value={signal.score}
                        className="h-1.5 w-16 [&>div]:bg-[#040523]/70 dark:[&>div]:bg-slate-400"
                      />
                      <span className="text-muted-foreground w-8 text-right">
                        {signal.score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                사용 가능한 그라운딩 신호 없음
              </p>
            )}
          </motion.div>

          {/* User Input Influence */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PencilLine className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">입력 콘텐츠</span>
                <Badge variant="outline" className="text-xs">
                  {SIGNAL_WEIGHTS.userContent}%
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>
                  {userInputInfluence.keywordsIntegrated.length}개 키워드 적용됨
                </span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>
                  {userInputInfluence.timestampsGenerated}개 타임스탬프 생성됨
                </span>
              </div>
            </div>
            {userInputInfluence.keywordsIntegrated.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {userInputInfluence.keywordsIntegrated.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quality Scores */}
          {breakdown.qualityScores && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 pt-3 border-t"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkle className="h-4 w-4 text-muted-foreground" weight="fill" />
                  <span className="text-sm font-medium">품질 평가</span>
                  {breakdown.qualityScores.refined && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      개선됨
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold">
                    {breakdown.qualityScores.overall}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>

              <div className="space-y-2">
                <ScoreBar
                  label="브랜드 보이스"
                  score={breakdown.qualityScores.brandVoice}
                  icon={<Star className="h-3 w-3 text-muted-foreground" weight="fill" />}
                />
                <ScoreBar
                  label="키워드 통합"
                  score={breakdown.qualityScores.keywordIntegration}
                  icon={<Target className="h-3 w-3 text-muted-foreground" />}
                />
                <ScoreBar
                  label="GEO 최적화"
                  score={breakdown.qualityScores.geoOptimization}
                  icon={<TrendUp className="h-3 w-3 text-muted-foreground" />}
                />
                <ScoreBar
                  label="FAQ 품질"
                  score={breakdown.qualityScores.faqQuality}
                  icon={<ChatCircleText className="h-3 w-3 text-muted-foreground" />}
                />
              </div>
            </motion.div>
          )}

          {/* Tuning Configuration */}
          {tuningMetadata && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3 pt-3 border-t"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gear className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">파이프라인 설정</span>
                  <Badge
                    variant={tuningMetadata.configSource === 'database' ? 'default' : 'secondary'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {tuningMetadata.configSource === 'database' ? '사용자 정의' : '기본값'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {tuningMetadata.weightsName && (
                  <div className="flex items-center gap-2">
                    <Database className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">가중치:</span>
                    <span className="font-medium">{tuningMetadata.weightsName}</span>
                  </div>
                )}

                {tuningMetadata.promptVersionId && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>프롬프트 버전:</span>
                    <code className="text-[10px] bg-muted px-1 rounded">
                      {tuningMetadata.promptVersionId.slice(0, 8)}
                    </code>
                  </div>
                )}

                {tuningMetadata.scoreBreakdown && tuningMetadata.scoreBreakdown.length > 0 && (
                  <ScoreBreakdownSection
                    scoreBreakdown={tuningMetadata.scoreBreakdown}
                    onAction={onAction}
                    isRegenerating={isRegenerating}
                  />
                )}

                {/* Weight Transparency Section */}
                {tuningMetadata.scoreBreakdown && tuningMetadata.scoreBreakdown.length > 0 && (
                  <div className="mt-4 pt-3 border-t">
                    <WeightTransparencySection
                      scoreBreakdown={tuningMetadata.scoreBreakdown}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

function formatSectionName(section: string): string {
  return section
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 20)
}

interface ScoreBarProps {
  label: string
  score: number
  icon: ReactNode
}

function ScoreBar({ label, score, icon }: ScoreBarProps) {
  const getScoreStyle = (score: number) => {
    if (score >= 85) return 'text-foreground font-semibold'
    if (score >= 70) return 'text-muted-foreground font-medium'
    return 'text-muted-foreground'
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5 w-32 min-w-0">
        {icon}
        <span className="truncate text-muted-foreground">{label}</span>
      </div>
      <div className="flex-1">
        <Progress value={score} className="h-1.5 [&>div]:bg-[#040523]/80 dark:[&>div]:bg-slate-300" />
      </div>
      <span className={`w-8 text-right ${getScoreStyle(score)}`}>
        {score}
      </span>
    </div>
  )
}

// Metric configuration with actionable fixes
const METRIC_CONFIG: Record<string, {
  description: string
  icon: ReactNode
  actionType: ActionType
  actionLabel: string
  getRecommendation: (score: number) => { text: string; priority: 'critical' | 'warning' | 'good' } | null
  thresholds: { critical: number; warning: number }
}> = {
  usp_coverage: {
    description: '브리프의 핵심 셀링 포인트를 콘텐츠가 얼마나 잘 다루는지',
    icon: <Target className="h-3.5 w-3.5" />,
    actionType: 'regenerate_usps',
    actionLabel: 'USP 추가',
    thresholds: { critical: 30, warning: 60 },
    getRecommendation: (score) => {
      if (score < 30) return {
        text: '제품 브리프에서 더 많은 USP를 추가하세요. 현재 콘텐츠에 핵심 셀링 포인트가 부족합니다.',
        priority: 'critical'
      }
      if (score < 60) return {
        text: '브리프의 기능, 혜택 또는 차별화 요소를 추가로 포함하세요.',
        priority: 'warning'
      }
      return null
    },
  },
  grounding_score: {
    description: '외부 소스(Google/Perplexity)로 검증된 사실 정확성',
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    actionType: 'regenerate_grounded',
    actionLabel: '출처 추가',
    thresholds: { critical: 20, warning: 50 },
    getRecommendation: (score) => {
      if (score < 20) return {
        text: '검증된 출처가 부족합니다. 공식 삼성 페이지나 리뷰에서 인용을 추가하세요.',
        priority: 'critical'
      }
      if (score < 50) return {
        text: '그라운딩 개선: 공식 스펙, 리뷰 또는 신뢰할 수 있는 기술 소스를 참조하세요.',
        priority: 'warning'
      }
      return null
    },
  },
  semantic_similarity: {
    description: '생성된 콘텐츠가 브리프의 의도와 맥락에 얼마나 부합하는지',
    icon: <BookOpenText className="h-3.5 w-3.5" />,
    actionType: 'regenerate_aligned',
    actionLabel: '브리프 정렬',
    thresholds: { critical: 30, warning: 55 },
    getRecommendation: (score) => {
      if (score < 30) return {
        text: '콘텐츠가 브리프에서 벗어났습니다. 브리프 요구사항에 집중하여 재생성하세요.',
        priority: 'critical'
      }
      if (score < 55) return {
        text: '브리프의 메시징과 타겟 오디언스에 맞게 콘텐츠를 조정하세요.',
        priority: 'warning'
      }
      return null
    },
  },
  anti_fabrication: {
    description: '콘텐츠에서 허위 또는 미검증 주장의 방지',
    icon: <Warning className="h-3.5 w-3.5" />,
    actionType: 'verify_claims',
    actionLabel: '주장 검증',
    thresholds: { critical: 40, warning: 65 },
    getRecommendation: (score) => {
      if (score < 40) return {
        text: '허위 정보 위험이 높습니다. 모든 주장을 검토하고 미검증 내용을 제거하세요.',
        priority: 'critical'
      }
      if (score < 65) return {
        text: '모든 기술 스펙과 주장을 공식 삼성 문서와 대조 검증하세요.',
        priority: 'warning'
      }
      return null
    },
  },
  keyword_density: {
    description: '타겟 키워드의 존재 및 자연스러운 통합',
    icon: <MagnifyingGlass className="h-3.5 w-3.5" />,
    actionType: 'add_keywords',
    actionLabel: '키워드 추가',
    thresholds: { critical: 25, warning: 50 },
    getRecommendation: (score) => {
      if (score < 25) return {
        text: '타겟 키워드가 부족합니다. 선택한 키워드를 콘텐츠 전반에 자연스럽게 추가하세요.',
        priority: 'critical'
      }
      if (score < 50) return {
        text: '제목, 설명, FAQ 섹션에서 키워드 사용을 늘리세요.',
        priority: 'warning'
      }
      return null
    },
  },
  structure_quality: {
    description: '콘텐츠 구성, 포맷팅 및 가독성',
    icon: <TreeStructure className="h-3.5 w-3.5" />,
    actionType: 'improve_structure',
    actionLabel: '구조 개선',
    thresholds: { critical: 30, warning: 55 },
    getRecommendation: (score) => {
      if (score < 30) return {
        text: '구조가 부실합니다. 명확한 섹션, 헤더, 포맷팅으로 재구성하세요.',
        priority: 'critical'
      }
      if (score < 55) return {
        text: '구조 개선: 더 명확한 제목, 불릿 포인트 또는 논리적 흐름을 추가하세요.',
        priority: 'warning'
      }
      return null
    },
  },
}

// Score threshold legend for user understanding
function ScoreThresholdLegend() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-[#040523] dark:bg-slate-200" />
        <span>양호 (≥60)</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-[#040523]/50 dark:bg-slate-500" />
        <span>개선 필요</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-[#040523]/20 dark:bg-slate-700 ring-1 ring-[#040523]/30" />
        <span>심각</span>
      </div>
    </div>
  )
}

// Overall score indicator with context
function OverallScoreIndicator({ score }: { score: number }) {
  const getOverallStatus = () => {
    if (score >= 80) return { label: '우수', color: 'text-foreground', bg: 'bg-[#040523] dark:bg-slate-100', textBg: 'text-white dark:text-[#040523]' }
    if (score >= 60) return { label: '양호', color: 'text-foreground', bg: 'bg-[#040523]/80 dark:bg-slate-300', textBg: 'text-white dark:text-[#040523]' }
    if (score >= 40) return { label: '개선 필요', color: 'text-muted-foreground', bg: 'bg-[#040523]/40 dark:bg-slate-600', textBg: 'text-white dark:text-slate-200' }
    return { label: '심각', color: 'text-muted-foreground', bg: 'border border-[#040523]/30 bg-transparent', textBg: 'text-muted-foreground' }
  }

  const status = getOverallStatus()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.bg} cursor-help`}>
          <span className={`text-xs font-medium ${status.textBg}`}>{status.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="text-xs space-y-1">
          <p className="font-medium">점수 기준:</p>
          <p>80-100: 우수 - 바로 사용 가능</p>
          <p>60-79: 양호 - 약간의 개선 가능</p>
          <p>40-59: 개선 필요 - 검토 권장</p>
          <p>0-39: 심각 - 재생성 필요</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

interface ScoreBreakdownSectionProps {
  scoreBreakdown: ScoreBreakdownItem[]
  onAction?: (action: ActionPayload) => void
  isRegenerating?: boolean
}

function ScoreBreakdownSection({ scoreBreakdown, onAction, isRegenerating }: ScoreBreakdownSectionProps) {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null)
  const [copiedMetric, setCopiedMetric] = useState<string | null>(null)

  // Calculate overall score
  const overallScore = scoreBreakdown.reduce((sum, item) => sum + (item.weightedScore || 0), 0)

  // Calculate overall health and identify issues
  const criticalIssues = scoreBreakdown.filter(item => {
    const config = METRIC_CONFIG[item.metric]
    return config && item.score < config.thresholds.critical
  })

  const warnings = scoreBreakdown.filter(item => {
    const config = METRIC_CONFIG[item.metric]
    return config && item.score >= config.thresholds.critical && item.score < config.thresholds.warning
  })

  // Sort by priority (critical first, then by score ascending)
  const sortedBreakdown = [...scoreBreakdown].sort((a, b) => {
    const configA = METRIC_CONFIG[a.metric]
    const configB = METRIC_CONFIG[b.metric]
    if (!configA || !configB) return 0

    const aIsCritical = a.score < configA.thresholds.critical
    const bIsCritical = b.score < configB.thresholds.critical

    if (aIsCritical && !bIsCritical) return -1
    if (!aIsCritical && bIsCritical) return 1
    return a.score - b.score
  })

  const getScoreStatus = (score: number, metric: string) => {
    const config = METRIC_CONFIG[metric]
    if (!config) return { status: 'unknown', color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-muted' }

    if (score < config.thresholds.critical) {
      return {
        status: 'critical',
        color: 'text-[#040523] dark:text-slate-200',
        bg: 'bg-[#040523]/5 dark:bg-[#040523]/20',
        border: 'border-[#040523]/20 dark:border-slate-700'
      }
    }
    if (score < config.thresholds.warning) {
      return {
        status: 'warning',
        color: 'text-[#040523]/70 dark:text-slate-400',
        bg: 'bg-[#040523]/[0.02] dark:bg-[#040523]/10',
        border: 'border-[#040523]/10 dark:border-slate-800'
      }
    }
    return {
      status: 'good',
      color: 'text-[#040523] dark:text-slate-200',
      bg: 'bg-transparent',
      border: 'border-transparent'
    }
  }

  const getProgressColor = (score: number, metric: string) => {
    const config = METRIC_CONFIG[metric]
    if (!config) return ''

    if (score < config.thresholds.critical) return '[&>div]:bg-[#040523]/30 dark:[&>div]:bg-slate-600'
    if (score < config.thresholds.warning) return '[&>div]:bg-[#040523]/50 dark:[&>div]:bg-slate-500'
    return '[&>div]:bg-[#040523] dark:[&>div]:bg-slate-200'
  }

  const handleAction = useCallback((actionType: ActionType, metric: string) => {
    if (onAction) {
      onAction({ type: actionType, metric })
    }
  }, [onAction])

  const handleCopyFix = useCallback((metric: string, recommendation: string) => {
    navigator.clipboard.writeText(recommendation)
    setCopiedMetric(metric)
    setTimeout(() => setCopiedMetric(null), 2000)
    if (onAction) {
      onAction({ type: 'copy_fix', metric, details: recommendation })
    }
  }, [onAction])

  return (
    <div className="mt-3 space-y-3">
      {/* Header with summary and overall score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">점수 분석</span>
            <OverallScoreIndicator score={overallScore} />
          </div>
          <div className="flex items-center gap-2">
            {criticalIssues.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 border-neutral-400">
                <Warning className="h-3 w-3" />
                {criticalIssues.length}개 심각
              </Badge>
            )}
            {warnings.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {warnings.length}개 경고
              </Badge>
            )}
          </div>
        </div>
        {/* Score threshold legend for user context */}
        <ScoreThresholdLegend />
      </div>

      {/* Score items - prioritized */}
      <div className="space-y-2">
        {sortedBreakdown.map((item) => {
          const config = METRIC_CONFIG[item.metric]
          const { status, color, bg, border } = getScoreStatus(item.score, item.metric)
          const recommendation = config?.getRecommendation(item.score)
          const isExpanded = expandedMetric === item.metric
          const isCopied = copiedMetric === item.metric

          return (
            <div
              key={item.metric}
              className={`rounded-lg border ${recommendation ? border : 'border-transparent'} ${recommendation ? bg : ''} transition-all`}
            >
              {/* Score row */}
              <div
                className={`flex items-center gap-2 p-2 ${recommendation ? 'cursor-pointer' : ''}`}
                onClick={() => recommendation && setExpandedMetric(isExpanded ? null : item.metric)}
              >
                {/* Status indicator */}
                <div className={`flex-shrink-0 ${color}`}>
                  {config?.icon}
                </div>

                {/* Metric label with tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 cursor-help">
                      <span className="text-xs font-medium truncate">{item.label}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{config?.description || item.label}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Progress bar */}
                <div className="w-20 flex-shrink-0">
                  <Progress
                    value={item.score}
                    className={`h-2 ${getProgressColor(item.score, item.metric)}`}
                  />
                </div>

                {/* Score display */}
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold ${color}`}>
                  <span>{Math.round(item.score)}</span>
                  <span className="text-[10px] opacity-70">/100</span>
                </div>

                {/* Weight */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-muted-foreground w-10 text-right cursor-help flex-shrink-0">
                      x{(item.weight * 100).toFixed(0)}%
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">가중치: 총점의 {(item.weight * 100).toFixed(0)}%</p>
                  </TooltipContent>
                </Tooltip>

                {/* Expand indicator for issues */}
                {recommendation && (
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <CaretUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>

              {/* Expanded action panel */}
              {recommendation && isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 pb-3 space-y-2"
                >
                  {/* Recommendation text */}
                  <div className="flex items-start gap-2 text-xs">
                    <Lightbulb className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${color}`} />
                    <p className={`${color} leading-relaxed`}>{recommendation.text}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {config && onAction && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAction(config.actionType, item.metric)
                        }}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <ArrowClockwise className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Lightning className="h-3.5 w-3.5" />
                        )}
                        {config.actionLabel}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyFix(item.metric, recommendation.text)
                      }}
                    >
                      {isCopied ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {isCopied ? '복사됨' : '복사'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Actions Summary for Critical Issues */}
      {criticalIssues.length > 0 && onAction && (
        <div className="mt-4 p-3 rounded-lg bg-[#040523]/5 dark:bg-[#040523]/20 border border-[#040523]/15 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Warning className="h-4 w-4 text-[#040523] dark:text-slate-200" />
              <span className="text-sm font-semibold text-[#040523] dark:text-slate-200">
                조치 필요
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] border-[#040523]/30 dark:border-slate-600">
              {criticalIssues.length}개 문제
            </Badge>
          </div>

          {/* Priority action list */}
          <div className="space-y-2 mb-3">
            {criticalIssues.slice(0, 3).map((issue, index) => {
              const config = METRIC_CONFIG[issue.metric]
              return (
                <div key={issue.metric} className="flex items-center gap-2 text-xs">
                  <span className="w-4 h-4 rounded-full bg-[#040523]/20 dark:bg-slate-700 text-[#040523] dark:text-slate-200 flex items-center justify-center font-bold text-[10px]">
                    {index + 1}
                  </span>
                  <span className="font-medium text-[#040523] dark:text-slate-300">{issue.label}</span>
                  <ArrowRight className="h-3 w-3 text-[#040523]/50 dark:text-slate-500" />
                  <span className="text-[#040523]/60 dark:text-slate-400">{config?.actionLabel}</span>
                </div>
              )
            })}
          </div>

          {/* Bulk action button */}
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs gap-2"
            onClick={() => onAction({ type: 'regenerate_all' })}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <>
                <ArrowClockwise className="h-4 w-4 animate-spin" />
                재생성 중...
              </>
            ) : (
              <>
                <ArrowClockwise className="h-4 w-4" />
                모든 문제 수정 후 재생성
              </>
            )}
          </Button>
        </div>
      )}

      {/* Success state when no issues */}
      {criticalIssues.length === 0 && warnings.length === 0 && (
        <div className="mt-3 p-2 rounded-lg bg-[#040523]/5 dark:bg-[#040523]/15 border border-[#040523]/10 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs text-[#040523] dark:text-slate-200">
            <CheckCircle className="h-4 w-4" weight="fill" />
            <span className="font-medium">모든 품질 지표가 허용 범위 내에 있습니다</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Weight color mapping for visual distinction - deep navy palette (#040523)
const WEIGHT_COLORS: Record<keyof WeightValues, { bg: string; text: string; bar: string }> = {
  usp_coverage: { bg: 'bg-[#040523]/5 dark:bg-[#040523]/30', text: 'text-[#040523] dark:text-slate-200', bar: 'bg-[#040523] dark:bg-slate-200' },
  grounding_score: { bg: 'bg-[#040523]/5 dark:bg-[#040523]/25', text: 'text-[#040523]/90 dark:text-slate-300', bar: 'bg-[#040523]/90 dark:bg-slate-300' },
  semantic_similarity: { bg: 'bg-[#040523]/5 dark:bg-[#040523]/20', text: 'text-[#040523]/80 dark:text-slate-400', bar: 'bg-[#040523]/70 dark:bg-slate-400' },
  anti_fabrication: { bg: 'bg-[#040523]/5 dark:bg-[#040523]/15', text: 'text-[#040523]/70 dark:text-slate-400', bar: 'bg-[#040523]/60 dark:bg-slate-500' },
  keyword_density: { bg: 'bg-[#040523]/5 dark:bg-[#040523]/10', text: 'text-[#040523]/60 dark:text-slate-500', bar: 'bg-[#040523]/50 dark:bg-slate-500' },
  structure_quality: { bg: 'bg-[#040523]/5 dark:bg-[#040523]/10', text: 'text-[#040523]/50 dark:text-slate-600', bar: 'bg-[#040523]/40 dark:bg-slate-600' },
}

interface WeightTransparencySectionProps {
  scoreBreakdown?: ScoreBreakdownItem[]
  weightsUsed?: WeightValues
}

export function WeightTransparencySection({ scoreBreakdown, weightsUsed }: WeightTransparencySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Use provided weights or defaults
  const weights = weightsUsed || DEFAULT_WEIGHTS

  // Calculate total score if we have breakdown
  const totalScore = scoreBreakdown?.reduce((sum, item) => sum + (item.weightedScore || 0), 0) || 0

  // Sort weights by value descending
  const sortedWeights = Object.entries(weights)
    .sort(([, a], [, b]) => b - a) as [keyof WeightValues, number][]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Header - clickable to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <Gear className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">점수 계산 방법</span>
          <Badge variant="outline" className="text-[10px]">
            {Object.keys(weights).length}개 요소
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            클릭하여 {isExpanded ? '접기' : '펼치기'}
          </span>
          {isExpanded ? (
            <CaretUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <CaretDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          {/* Formula explanation */}
          <div className="p-3 rounded-lg bg-muted/30 border border-dashed">
            <div className="flex items-start gap-2 mb-2">
              <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">점수 산정 공식:</p>
                <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded block w-fit">
                  최종 점수 = Σ (지표 점수 × 가중치)
                </code>
              </div>
            </div>
          </div>

          {/* Weight distribution visualization */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              가중치 분포
            </div>

            {/* Stacked bar visualization */}
            <div className="h-4 rounded-full overflow-hidden flex bg-muted">
              {sortedWeights.map(([key, value]) => (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div
                      className={`h-full ${WEIGHT_COLORS[key].bar} transition-all cursor-help`}
                      style={{ width: `${value * 100}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs font-medium">{WEIGHT_LABELS[key].label}</p>
                    <p className="text-[10px] text-muted-foreground">총점의 {(value * 100).toFixed(0)}%</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Individual weight items */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {sortedWeights.map(([key, value]) => {
                const config = WEIGHT_LABELS[key]
                const colors = WEIGHT_COLORS[key]
                const scoreItem = scoreBreakdown?.find(s => s.metric === key)

                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <div className={`p-2 rounded-lg ${colors.bg} cursor-help transition-all hover:scale-[1.02]`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium ${colors.text}`}>
                            {config.label}
                          </span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {(value * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        {scoreItem && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span>점수: {Math.round(scoreItem.score)}</span>
                            <span>×</span>
                            <span>{(value * 100).toFixed(0)}%</span>
                            <span>=</span>
                            <span className="font-medium">{(scoreItem.weightedScore || 0).toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs font-medium mb-1">{config.label}</p>
                      <p className="text-[10px] text-muted-foreground">{config.description}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>

          {/* Calculation breakdown table */}
          {scoreBreakdown && scoreBreakdown.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground">
                점수 계산
              </div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium">지표</th>
                      <th className="text-right px-2 py-1.5 font-medium">점수</th>
                      <th className="text-right px-2 py-1.5 font-medium">가중치</th>
                      <th className="text-right px-2 py-1.5 font-medium">기여도</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreBreakdown.map((item) => (
                      <tr key={item.metric} className="border-t">
                        <td className="px-2 py-1.5">{item.label}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{Math.round(item.score)}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{(item.weight * 100).toFixed(0)}%</td>
                        <td className="px-2 py-1.5 text-right font-mono font-medium">
                          {(item.weightedScore || 0).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t bg-muted/30 font-medium">
                      <td className="px-2 py-1.5" colSpan={3}>총점</td>
                      <td className="px-2 py-1.5 text-right font-mono">{totalScore.toFixed(1)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Improvement tip */}
          <div className="flex items-start gap-2 p-2 rounded-lg bg-[#040523]/[0.03] dark:bg-[#040523]/10 border border-[#040523]/10 dark:border-slate-700">
            <Lightbulb className="h-4 w-4 text-[#040523]/60 dark:text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[#040523]/70 dark:text-slate-400">
              <p className="font-medium text-[#040523] dark:text-slate-200">팁:</p>
              <p>
                최대 효과를 위해 가중치가 높은 지표를 개선하는 데 집중하세요.
                USP 커버리지({(weights.usp_coverage * 100).toFixed(0)}%)와 그라운딩 점수({(weights.grounding_score * 100).toFixed(0)}%)가
                최종 점수에 가장 큰 영향을 미칩니다.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
