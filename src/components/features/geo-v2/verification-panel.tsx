'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  MagnifyingGlass,
  GoogleLogo,
  YoutubeLogo,
  Check,
  Warning,
  ArrowSquareOut,
  CaretDown,
  CaretUp,
  Spinner,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type {
  VerificationResult,
  VerificationStatus,
  SearchResult,
} from '@/types/geo-verification'

interface VerificationPanelProps {
  productName: string
  keywords: string[]
  generatedDescription: string
  hashtags?: string[]
  language?: 'ko' | 'en'
  className?: string
}

export function VerificationPanel({
  productName,
  keywords,
  generatedDescription,
  hashtags,
  language = 'ko',
}: VerificationPanelProps) {
  const [status, setStatus] = useState<VerificationStatus>('idle')
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<'google' | 'youtube' | null>(null)

  const isKorean = language === 'ko'

  const handleRunVerification = async () => {
    setStatus('searching_google')
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/geo-verification/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          keywords,
          generatedContent: {
            description: generatedDescription,
            hashtags,
          },
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Verification failed')
      }

      setResult(data.result)
      setStatus('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      setStatus('error')
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400'
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 70) return 'default'
    if (score >= 40) return 'secondary'
    return 'destructive'
  }

  return (
    <div className="space-y-4">
      {/* Header with Run Button */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MagnifyingGlass className="h-5 w-5 text-[#040523] dark:text-slate-200" weight="bold" />
              <CardTitle className="text-base font-medium">
                {isKorean ? '검색 노출 검증' : 'Search Visibility Check'}
              </CardTitle>
            </div>
            <Button
              onClick={handleRunVerification}
              disabled={status === 'searching_google' || status === 'searching_youtube' || status === 'analyzing'}
              size="sm"
              className="gap-2"
            >
              {status === 'searching_google' || status === 'searching_youtube' || status === 'analyzing' ? (
                <>
                  <Spinner className="h-4 w-4 animate-spin" />
                  {isKorean ? '검색 중...' : 'Searching...'}
                </>
              ) : (
                <>
                  <MagnifyingGlass className="h-4 w-4" />
                  {isKorean ? '검증 실행' : 'Check Visibility'}
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isKorean
              ? 'Google과 YouTube에서 키워드 노출 현황을 확인합니다.'
              : 'Check keyword visibility on Google and YouTube.'}
          </p>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Warning className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {result && (
        <>
          {/* Score Summary */}
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {isKorean ? '종합 점수' : 'Total Score'}
                  </p>
                  <div className={cn('text-2xl font-bold', getScoreColor(result.matchScore.total))}>
                    {result.matchScore.total}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {isKorean ? '키워드 커버리지' : 'Keyword Coverage'}
                  </p>
                  <div className={cn('text-2xl font-bold', getScoreColor(result.matchScore.keywordCoverage))}>
                    {result.matchScore.keywordCoverage}%
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {isKorean ? '설명 일치도' : 'Description Match'}
                  </p>
                  <div className={cn('text-2xl font-bold', getScoreColor(result.matchScore.descriptionMatch))}>
                    {result.matchScore.descriptionMatch}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <Progress value={result.matchScore.total} className="h-2" />
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                <Badge variant="outline">
                  {isKorean ? '키워드 발견' : 'Keywords Found'}: {result.matchScore.breakdown.keywordsFound}/{result.matchScore.breakdown.totalKeywords}
                </Badge>
                {result.matchScore.breakdown.ownContentCount > 0 && (
                  <Badge variant="default" className="bg-green-600">
                    {isKorean ? '삼성 콘텐츠' : 'Samsung Content'}: {result.matchScore.breakdown.ownContentCount}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Google Results */}
          <ResultsCard
            platform="google"
            results={result.googleResults}
            metrics={result.matchScore.breakdown.google}
            expanded={expandedSection === 'google'}
            onToggle={() => setExpandedSection(expandedSection === 'google' ? null : 'google')}
            language={language}
          />

          {/* YouTube Results */}
          <ResultsCard
            platform="youtube"
            results={result.youtubeResults}
            metrics={result.matchScore.breakdown.youtube}
            expanded={expandedSection === 'youtube'}
            onToggle={() => setExpandedSection(expandedSection === 'youtube' ? null : 'youtube')}
            language={language}
          />

          {/* Verification Metadata */}
          <div className="text-center text-xs text-muted-foreground">
            {isKorean ? '검증 완료' : 'Verified'}: {new Date(result.timestamp).toLocaleString()} ({result.durationMs}ms)
          </div>
        </>
      )}

      {/* Idle State */}
      {status === 'idle' && !result && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MagnifyingGlass className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>
              {isKorean
                ? '"검증 실행" 버튼을 클릭하여 검색 엔진 노출 현황을 확인하세요.'
                : 'Click "Check Visibility" to analyze search engine presence.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Results Card Component
interface ResultsCardProps {
  platform: 'google' | 'youtube'
  results: SearchResult[]
  metrics: { totalResults: number; relevantResults: number; ownContent: number; avgKeywordMatch: number }
  expanded: boolean
  onToggle: () => void
  language: 'ko' | 'en'
}

function ResultsCard({ platform, results, metrics, expanded, onToggle, language }: ResultsCardProps) {
  const isKorean = language === 'ko'
  const Icon = platform === 'google' ? GoogleLogo : YoutubeLogo

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', platform === 'youtube' ? 'text-red-500' : 'text-blue-500')} weight="fill" />
            <CardTitle className="text-sm font-medium">
              {platform === 'google' ? 'Google' : 'YouTube'}{' '}
              {isKorean ? '결과' : 'Results'}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {metrics.totalResults} {isKorean ? '개' : 'results'}
            </Badge>
            {metrics.ownContent > 0 && (
              <Badge variant="default" className="text-xs bg-green-600">
                <Check className="h-3 w-3 mr-1" />
                {metrics.ownContent} {isKorean ? '삼성' : 'Samsung'}
              </Badge>
            )}
          </div>
          {expanded ? <CaretUp className="h-4 w-4" /> : <CaretDown className="h-4 w-4" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {isKorean ? '검색 결과가 없습니다.' : 'No results found.'}
            </p>
          ) : (
            <div className="space-y-3">
              {results.slice(0, 10).map((result, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-3 rounded-lg border',
                    result.isOwnContent
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : 'border-border'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          #{result.position}
                        </Badge>
                        {result.isOwnContent && (
                          <Badge variant="default" className="text-xs bg-green-600">
                            Samsung
                          </Badge>
                        )}
                      </div>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline line-clamp-1 flex items-center gap-1"
                      >
                        {result.title}
                        <ArrowSquareOut className="h-3 w-3 flex-shrink-0" />
                      </a>
                      {result.snippet && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {result.snippet}
                        </p>
                      )}
                      {result.matchedKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result.matchedKeywords.map((keyword, kIdx) => (
                            <Badge key={kIdx} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
