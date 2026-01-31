'use client'

/**
 * Tonality Indicator Component
 * Shows brand voice compliance and tonality score
 * Iteration 9: Feature Improvements
 */

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  SpeakerHigh,
  Check,
  X,
  Warning,
  Info,
  CaretDown,
  CaretUp,
  Lightbulb,
  Sparkle,
} from '@phosphor-icons/react'
import type { Platform, ContentType } from '@/types/geo-v2'

interface TonalityCheck {
  rule: string
  passed: boolean
  suggestion?: string
  severity: 'error' | 'warning' | 'info'
}

interface TonalityIndicatorProps {
  content: string
  platform: Platform
  contentType?: ContentType
  className?: string
}

// Samsung brand voice guidelines
const BRAND_VOICE_RULES = {
  professional: {
    forbidden: [
      { pattern: /!{2,}/g, message: '연속 느낌표 사용을 피하세요', replacement: '!' },
      { pattern: /\?{2,}/g, message: '연속 물음표 사용을 피하세요', replacement: '?' },
      { pattern: /ㅋ{2,}|ㅎ{2,}|ㅠ{2,}/g, message: '과도한 이모티콘/자음 사용을 피하세요', replacement: '' },
      { pattern: /개쩐|미쳤|대박|짱/g, message: '비격식 표현을 사용하지 마세요', replacement: '' },
      { pattern: /최고|최강|최상/g, message: '"최고/최강"보다 구체적인 표현을 사용하세요', severity: 'warning' as const },
    ],
    required: [
      { pattern: /Samsung|삼성|Galaxy|갤럭시/i, message: '브랜드명이 포함되어야 합니다' },
    ],
  },
  structure: {
    minLength: 50,
    maxLength: 5000,
    idealParagraphLength: 150,
  },
}

// Quick tonality check (no API call)
function quickTonalityCheck(content: string, platform: Platform): TonalityCheck[] {
  const checks: TonalityCheck[] = []

  // Check forbidden patterns
  for (const rule of BRAND_VOICE_RULES.professional.forbidden) {
    const matches = content.match(rule.pattern)
    if (matches) {
      checks.push({
        rule: rule.message,
        passed: false,
        suggestion: rule.replacement ? `"${matches[0]}"를 수정하세요` : undefined,
        severity: (rule as { severity?: 'error' | 'warning' | 'info' }).severity || 'error',
      })
    }
  }

  // Check required patterns
  for (const rule of BRAND_VOICE_RULES.professional.required) {
    if (!rule.pattern.test(content)) {
      checks.push({
        rule: rule.message,
        passed: false,
        severity: 'warning',
      })
    } else {
      checks.push({
        rule: rule.message,
        passed: true,
        severity: 'info',
      })
    }
  }

  // Length checks
  if (content.length < BRAND_VOICE_RULES.structure.minLength) {
    checks.push({
      rule: `콘텐츠가 너무 짧습니다 (최소 ${BRAND_VOICE_RULES.structure.minLength}자)`,
      passed: false,
      severity: 'warning',
    })
  }

  if (content.length > BRAND_VOICE_RULES.structure.maxLength) {
    checks.push({
      rule: `콘텐츠가 너무 깁니다 (최대 ${BRAND_VOICE_RULES.structure.maxLength}자)`,
      passed: false,
      severity: 'warning',
    })
  }

  // Platform-specific checks
  if (platform === 'youtube') {
    // Check for first 130 chars keyword placement
    const first130 = content.substring(0, 130)
    if (!/Galaxy|갤럭시|Samsung|삼성/i.test(first130)) {
      checks.push({
        rule: '첫 130자에 제품명/브랜드명을 포함하세요 (YouTube SEO)',
        passed: false,
        severity: 'warning',
      })
    }
  } else if (platform === 'instagram') {
    // Check for first 125 chars
    const first125 = content.substring(0, 125)
    if (first125.length < 100) {
      checks.push({
        rule: '첫 125자를 최대한 활용하세요 (Instagram)',
        passed: false,
        severity: 'warning',
      })
    }
  }

  return checks
}

export function TonalityIndicator({
  content,
  platform,
  contentType,
  className,
}: TonalityIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Run tonality check
  const checks = useMemo(() => {
    if (!content) return []
    return quickTonalityCheck(content, platform)
  }, [content, platform])

  // Calculate score
  const score = useMemo(() => {
    if (checks.length === 0) return 100
    const passed = checks.filter((c) => c.passed).length
    const errors = checks.filter((c) => !c.passed && c.severity === 'error').length
    const warnings = checks.filter((c) => !c.passed && c.severity === 'warning').length

    // Deduct points for issues
    let score = 100
    score -= errors * 20
    score -= warnings * 10

    return Math.max(0, Math.min(100, score))
  }, [checks])

  // Determine status
  const status = useMemo(() => {
    if (score >= 80) return { label: '우수', color: 'text-green-600', bg: 'bg-green-500' }
    if (score >= 60) return { label: '양호', color: 'text-yellow-600', bg: 'bg-yellow-500' }
    return { label: '개선 필요', color: 'text-red-600', bg: 'bg-red-500' }
  }, [score])

  const errorCount = checks.filter((c) => !c.passed && c.severity === 'error').length
  const warningCount = checks.filter((c) => !c.passed && c.severity === 'warning').length

  if (!content) return null

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between"
        >
          <CardTitle className="text-sm flex items-center gap-2">
            <SpeakerHigh className="h-4 w-4" />
            브랜드 보이스 검사
          </CardTitle>
          <div className="flex items-center gap-3">
            {/* Quick Stats */}
            <div className="flex items-center gap-2 text-xs">
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <X className="h-3 w-3" />
                  {errorCount}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
                  <Warning className="h-3 w-3" />
                  {warningCount}
                </Badge>
              )}
              {errorCount === 0 && warningCount === 0 && (
                <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
                  <Check className="h-3 w-3" />
                  통과
                </Badge>
              )}
            </div>

            {/* Score */}
            <div className={cn('font-bold text-sm', status.color)}>
              {score}점
            </div>

            {/* Toggle */}
            {isExpanded ? (
              <CaretUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <CaretDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Progress Bar */}
        <Progress value={score} className="h-1.5 mt-2" />
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <CardContent className="pt-0 space-y-4">
              {/* Status Banner */}
              <div className={cn(
                'p-3 rounded-lg text-sm',
                score >= 80 && 'bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-200',
                score >= 60 && score < 80 && 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-200',
                score < 60 && 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200'
              )}>
                <div className="flex items-center gap-2 font-medium">
                  {score >= 80 ? (
                    <Sparkle className="h-4 w-4" weight="fill" />
                  ) : score >= 60 ? (
                    <Lightbulb className="h-4 w-4" />
                  ) : (
                    <Warning className="h-4 w-4" />
                  )}
                  {status.label}
                </div>
                <p className="text-xs mt-1 opacity-80">
                  {score >= 80
                    ? '콘텐츠가 Samsung 브랜드 가이드라인을 잘 따르고 있습니다.'
                    : score >= 60
                    ? '몇 가지 개선이 필요합니다. 아래 제안을 확인하세요.'
                    : '중요한 수정이 필요합니다. 빨간색 항목을 먼저 확인하세요.'}
                </p>
              </div>

              {/* Checks List */}
              <div className="space-y-2">
                <TooltipProvider>
                  {checks.map((check, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-2 p-2 rounded-lg text-sm',
                        check.passed && 'bg-green-50 dark:bg-green-950/20',
                        !check.passed && check.severity === 'error' && 'bg-red-50 dark:bg-red-950/20',
                        !check.passed && check.severity === 'warning' && 'bg-yellow-50 dark:bg-yellow-950/20',
                        !check.passed && check.severity === 'info' && 'bg-blue-50 dark:bg-blue-950/20'
                      )}
                    >
                      {check.passed ? (
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" weight="bold" />
                      ) : check.severity === 'error' ? (
                        <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" weight="bold" />
                      ) : check.severity === 'warning' ? (
                        <Warning className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" weight="bold" />
                      ) : (
                        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" weight="bold" />
                      )}
                      <div className="flex-1">
                        <span className={cn(
                          check.passed && 'text-green-700 dark:text-green-300',
                          !check.passed && check.severity === 'error' && 'text-red-700 dark:text-red-300',
                          !check.passed && check.severity === 'warning' && 'text-yellow-700 dark:text-yellow-300',
                          !check.passed && check.severity === 'info' && 'text-blue-700 dark:text-blue-300'
                        )}>
                          {check.rule}
                        </span>
                        {check.suggestion && (
                          <p className="text-xs opacity-70 mt-0.5">{check.suggestion}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </TooltipProvider>
              </div>

              {/* Tips */}
              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <p className="font-medium mb-1 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Samsung 브랜드 보이스 팁
                </p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>전문적이면서도 친근한 톤 유지</li>
                  <li>구체적인 기능과 혜택 강조</li>
                  <li>과장된 표현 대신 검증된 데이터 사용</li>
                  <li>플랫폼별 최적 길이 준수</li>
                </ul>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export default TonalityIndicator
