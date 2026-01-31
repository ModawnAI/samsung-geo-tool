'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle,
  XCircle,
  Warning,
  CaretDown,
  CaretUp,
  Copy,
  Download,
  ChartBar,
  ListChecks,
  Lightbulb,
} from '@phosphor-icons/react'
import type { ReviewResult, ReviewCheckItem, Platform } from '@/types/geo-v2'
import { toast } from 'sonner'

interface ReviewResultReportProps {
  result: ReviewResult
  productName: string
  onExportReport?: () => void
  onRetryCheck?: () => void
}

// GEO check items by platform (based on Brief Slides 3-5)
const PLATFORM_CHECK_ITEMS: Record<Platform, { category: string; items: string[] }[]> = {
  youtube: [
    {
      category: '채널 최적화',
      items: ['채널명 키워드 포함', '채널 소개 130자 이내'],
    },
    {
      category: '썸네일',
      items: ['핵심 키워드 텍스트', '고화질 이미지', '파일명 키워드 포함'],
    },
    {
      category: '메타태그',
      items: ['브랜드 태그 포함', '제품 태그 포함', '기능 태그 포함'],
    },
    {
      category: '타이틀',
      items: ['삼성 구조 준수', '핵심 키워드 앞쪽 배치', '60자 이내'],
    },
    {
      category: '디스크립션',
      items: ['첫 130자 키워드 포함', 'Q&A FAQ 추가', 'Timestamp 추가', 'How-to Step-by-step'],
    },
    {
      category: '자막',
      items: ['SRT 자막 적용'],
    },
  ],
  instagram: [
    {
      category: '채널 최적화',
      items: ['계정 인덱싱 활성화', '채널명 30자 이내', '채널 소개 150자 이내', '외부 링크 연결'],
    },
    {
      category: 'Alt Text',
      items: ['Alt text 사용', '제품명 포함', '장면설명 포함', '150자 이내'],
    },
    {
      category: '디스크립션',
      items: ['첫 125자 핵심메시지', '제품명 포함', '기능명 포함', 'CTA 포함'],
    },
    {
      category: '해시태그',
      items: ['공식 해시태그 사용', '적정 개수 (5-10개)', 'GEO 순서 준수'],
    },
    {
      category: '기타',
      items: ['자막 toggle-on', '장소 태그', '인게이지먼트 댓글'],
    },
  ],
  tiktok: [
    {
      category: '채널 최적화',
      items: ['채널명 30자 이내', '채널 소개 150자 이내', '외부 링크 연결'],
    },
    {
      category: '커버/썸네일',
      items: ['커버 텍스트 키워드 포함', '30자 이내'],
    },
    {
      category: '디스크립션',
      items: ['첫 125자 핵심메시지', '제품명 포함', '기능명 포함', 'CTA 포함'],
    },
    {
      category: '기타',
      items: ['자막 toggle-on'],
    },
  ],
}

// Score color helper
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50'
  if (score >= 60) return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/50'
  return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
}

export function ReviewResultReport({
  result,
  productName,
  onExportReport,
  onRetryCheck,
}: ReviewResultReportProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  // Copy report to clipboard
  const handleCopyReport = async () => {
    const reportText = generateTextReport(result, productName)
    try {
      await navigator.clipboard.writeText(reportText)
      toast.success('검수 결과가 클립보드에 복사되었습니다.')
    } catch {
      toast.error('복사에 실패했습니다.')
    }
  }

  // Group checks by category
  const checksByCategory = result.checks.reduce((acc, check) => {
    const categoryMatch = check.nameKo.split(' - ')[0] || '기타'
    if (!acc[categoryMatch]) acc[categoryMatch] = []
    acc[categoryMatch].push(check)
    return acc
  }, {} as Record<string, ReviewCheckItem[]>)

  // Calculate pass/fail counts
  const passCount = result.checks.filter(c => c.passed).length
  const failCount = result.checks.filter(c => !c.passed).length
  const totalCount = result.checks.length

  return (
    <Card className="border-[#040523]/10 dark:border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              GEO 검수 결과
            </CardTitle>
            <CardDescription className="mt-1">
              {productName} • {result.platform.toUpperCase()} • {result.reviewType === 'pre' ? '사전' : '사후'} 검수
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyReport}>
              <Copy className="h-4 w-4 mr-1" />
              복사
            </Button>
            {onExportReport && (
              <Button variant="outline" size="sm" onClick={onExportReport}>
                <Download className="h-4 w-4 mr-1" />
                내보내기
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Overview */}
        <div className={`p-4 rounded-lg border ${getScoreBgColor(result.overallScore)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">종합 점수</p>
              <p className={`text-4xl font-bold ${getScoreColor(result.overallScore)}`}>
                {result.overallScore}
                <span className="text-lg text-muted-foreground">/100</span>
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
                  <span className="font-medium">{passCount} Pass</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-5 w-5 text-red-500" weight="fill" />
                  <span className="font-medium">{failCount} Fail</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                통과율: {Math.round(result.passRate * 100)}%
              </p>
            </div>
          </div>
        </div>

        {/* Pass/Fail Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>검수 항목 진행 상황</span>
            <span>{passCount}/{totalCount} 항목 통과</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden flex">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${(passCount / totalCount) * 100}%` }}
            />
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${(failCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        <Separator />

        {/* Detailed Checks by Category */}
        <div className="space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <ChartBar className="h-4 w-4" />
            항목별 상세 결과
          </p>

          {Object.entries(checksByCategory).map(([category, checks]) => {
            const categoryPassed = checks.filter(c => c.passed).length
            const categoryTotal = checks.length
            const categoryScore = Math.round((categoryPassed / categoryTotal) * 100)
            const isExpanded = expandedCategories.has(category)

            return (
              <div key={category} className="border rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{category}</span>
                    <Badge
                      variant={categoryScore >= 80 ? 'default' : categoryScore >= 60 ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {categoryPassed}/{categoryTotal}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getScoreColor(categoryScore)}`}>
                      {categoryScore}점
                    </span>
                    {isExpanded ? (
                      <CaretUp className="h-4 w-4" />
                    ) : (
                      <CaretDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Category Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t bg-muted/30"
                  >
                    {checks.map((check, idx) => (
                      <div
                        key={idx}
                        className={`p-3 flex items-start gap-3 ${idx > 0 ? 'border-t' : ''}`}
                      >
                        {check.passed ? (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" weight="fill" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" weight="fill" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{check.nameKo}</p>
                            <Badge variant="outline" className="text-xs">
                              {check.score}/100
                            </Badge>
                          </div>
                          
                          {/* Issues */}
                          {check.issues.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {check.issues.map((issue, i) => (
                                <p key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                                  <Warning className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                  {issue}
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Suggestions */}
                          {check.suggestions.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {check.suggestions.map((suggestion, i) => (
                                <p key={i} className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1">
                                  <Lightbulb className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                  {suggestion}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            )
          })}
        </div>

        {/* Actions */}
        {onRetryCheck && (
          <Button variant="outline" className="w-full" onClick={onRetryCheck}>
            다시 검수하기
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Generate text report for clipboard
function generateTextReport(result: ReviewResult, productName: string): string {
  let report = `📊 GEO 검수 결과 리포트\n`
  report += `${'='.repeat(40)}\n\n`
  report += `제품: ${productName}\n`
  report += `플랫폼: ${result.platform.toUpperCase()}\n`
  report += `검수 유형: ${result.reviewType === 'pre' ? '사전' : '사후'} 검수\n\n`
  report += `종합 점수: ${result.overallScore}/100\n`
  report += `통과율: ${Math.round(result.passRate * 100)}%\n\n`
  report += `${'─'.repeat(40)}\n\n`

  for (const check of result.checks) {
    const status = check.passed ? '✅' : '❌'
    report += `${status} ${check.nameKo} (${check.score}/100)\n`
    
    if (check.issues.length > 0) {
      for (const issue of check.issues) {
        report += `   ⚠️ ${issue}\n`
      }
    }
    
    if (check.suggestions.length > 0) {
      for (const suggestion of check.suggestions) {
        report += `   💡 ${suggestion}\n`
      }
    }
    
    report += '\n'
  }

  report += `${'='.repeat(40)}\n`
  report += `Generated by Samsung GEO Tool\n`

  return report
}
