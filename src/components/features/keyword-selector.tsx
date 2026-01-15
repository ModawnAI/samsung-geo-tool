'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useGenerationStore } from '@/store/generation-store'
import { useTranslation } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  MagnifyingGlass,
  FileText,
  TrendUp,
  Info,
  ArrowClockwise,
  Warning,
  Sparkle,
  ShieldCheck,
  Newspaper,
  Users,
  Globe,
  CheckCircle,
  Lightning,
  CaretDown,
  CaretUp,
  ArrowSquareOut,
  Copy,
  Check,
} from '@phosphor-icons/react'
import { cn, normalizeUrl } from '@/lib/utils'
import { ICON_SIZES } from '@/lib/constants/ui'
import { SOURCE_AUTHORITY_TIERS } from '@/types/geo-v2'
import { SaveTemplateDialog } from './template-manager'
import { TierExplanationDialog } from './geo-v2/tier-explanation-dialog'

// Source tier utilities
function getSourceTier(domain: string | undefined | null): 1 | 2 | 3 | 4 {
  if (!domain || typeof domain !== 'string') return 4
  const domainLower = domain.toLowerCase()
  if (SOURCE_AUTHORITY_TIERS.tier1.some(d => domainLower.includes(d))) return 1
  if (SOURCE_AUTHORITY_TIERS.tier2.some(d => domainLower.includes(d))) return 2
  if (SOURCE_AUTHORITY_TIERS.tier3.some(d => domainLower.includes(d))) return 3
  return 4
}

const TIER_CONFIG = {
  1: { label: 'Official', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: ShieldCheck, description: 'Samsung official source' },
  2: { label: 'Tech Media', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: Newspaper, description: 'Reputable tech publication' },
  3: { label: 'Community', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: Users, description: 'User community platform' },
  4: { label: 'Other', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', icon: Globe, description: 'General web source' },
} as const

function getScoreRecommendation(score: number): { level: 'high' | 'medium' | 'low'; message: string } {
  if (score >= 80) return { level: 'high', message: 'Highly recommended - strong user interest' }
  if (score >= 50) return { level: 'medium', message: 'Good candidate - moderate interest' }
  return { level: 'low', message: 'Consider if relevant to your brief' }
}

export function KeywordSelector() {
  const { t } = useTranslation()
  // Selective subscriptions for better performance
  const productName = useGenerationStore((state) => state.productName)
  const launchDate = useGenerationStore((state) => state.launchDate)
  const briefUsps = useGenerationStore((state) => state.briefUsps)
  const groundingKeywords = useGenerationStore((state) => state.groundingKeywords)
  const selectedKeywords = useGenerationStore((state) => state.selectedKeywords)
  const isGroundingLoading = useGenerationStore((state) => state.isGroundingLoading)
  const toggleKeyword = useGenerationStore((state) => state.toggleKeyword)
  const setGroundingKeywords = useGenerationStore((state) => state.setGroundingKeywords)
  const setIsGroundingLoading = useGenerationStore((state) => state.setIsGroundingLoading)

  const [error, setError] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const toggleExpanded = useCallback((index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const handleCopyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [])

  // Track if we've auto-run grounding this session
  const hasAutoRun = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleRunGrounding = useCallback(async () => {
    if (!productName) return

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsGroundingLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          launchDate: launchDate ? (launchDate instanceof Date ? launchDate.toISOString() : launchDate) : undefined,
        }),
        signal: abortControllerRef.current.signal,
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      if (data.keywords) {
        setGroundingKeywords(data.keywords)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('Grounding failed:', err)
      setError('Failed to fetch grounding signals')
    } finally {
      setIsGroundingLoading(false)
    }
  }, [productName, launchDate, setIsGroundingLoading, setGroundingKeywords])

  // Auto-run grounding when entering step 3 if not already done
  useEffect(() => {
    // Auto-run if: product exists, no keywords yet, not loading, and haven't auto-run
    if (
      productName &&
      groundingKeywords.length === 0 &&
      !isGroundingLoading &&
      !hasAutoRun.current
    ) {
      hasAutoRun.current = true
      handleRunGrounding()
    }
  }, [productName, groundingKeywords.length, isGroundingLoading, handleRunGrounding])

  // Combine keywords from brief and grounding for selection
  const allKeywords = [
    ...briefUsps.filter((k) => !groundingKeywords.some((g) => g.term === k)),
    ...groundingKeywords.map((g) => g.term),
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {/* Brief USPs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t.generate.keywordSelector.briefUsps}
              <span className="text-muted-foreground font-normal text-sm">
                ({t.generate.keywordSelector.samsungPriority})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {briefUsps.length > 0 ? (
              <ul className="space-y-2">
                {briefUsps.map((usp, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {i + 1}
                    </span>
                    {usp}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t.generate.keywordSelector.noBriefFound}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Grounding Results */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendUp className="h-4 w-4" />
                {t.generate.keywordSelector.groundingResults}
                <span className="text-muted-foreground font-normal text-sm">
                  ({t.generate.keywordSelector.userInterest})
                </span>
              </CardTitle>
              <TierExplanationDialog language="ko" />
            </div>
          </CardHeader>
          <CardContent>
            {isGroundingLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : groundingKeywords.length > 0 ? (
              <TooltipProvider>
                <div className="space-y-3">
                  {groundingKeywords.map((kw, i) => {
                    const recommendation = getScoreRecommendation(kw.score)
                    // Use pre-computed tier from GroundingSource objects
                    const bestTier = kw.sources.length > 0
                      ? Math.min(...kw.sources.map(s => s.tier)) as 1 | 2 | 3 | 4
                      : 4
                    const tierConfig = TIER_CONFIG[bestTier]
                    const TierIcon = tierConfig.icon

                    const isExpanded = expandedItems.has(i)

                    return (
                      <div
                        key={i}
                        className={cn(
                          "rounded-lg border transition-all",
                          recommendation.level === 'high' && "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20",
                          recommendation.level === 'medium' && "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/20",
                          recommendation.level === 'low' && "border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/20"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleExpanded(i)}
                          className="w-full p-3 text-left"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                recommendation.level === 'high' && "bg-green-500 text-white",
                                recommendation.level === 'medium' && "bg-yellow-500 text-white",
                                recommendation.level === 'low' && "bg-gray-400 text-white"
                              )}>
                                {i + 1}
                              </span>
                              <span className="font-medium truncate">{kw.term}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className={cn("text-xs", tierConfig.color)}>
                                    <TierIcon className="h-3 w-3 mr-1" />
                                    {tierConfig.label}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">{tierConfig.description}</p>
                                </TooltipContent>
                              </Tooltip>
                              <span className={cn(
                                "text-sm font-bold tabular-nums",
                                recommendation.level === 'high' && "text-green-600 dark:text-green-400",
                                recommendation.level === 'medium' && "text-yellow-600 dark:text-yellow-400",
                                recommendation.level === 'low' && "text-gray-500"
                              )}>
                                {kw.score}
                              </span>
                              {isExpanded ? (
                                <CaretUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <CaretDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            {recommendation.level === 'high' && <Lightning className="h-3 w-3 text-green-500" weight="fill" />}
                            {recommendation.level === 'medium' && <CheckCircle className="h-3 w-3 text-yellow-500" />}
                            {recommendation.level === 'low' && <Info className="h-3 w-3" />}
                            <span>{recommendation.message}</span>
                            <span className="ml-auto text-muted-foreground">
                              {kw.sources.length}개 소스
                            </span>
                          </div>
                        </button>

                        {/* Expanded Source List */}
                        {isExpanded && kw.sources.length > 0 && (
                          <div className="px-3 pb-3 pt-0 border-t border-dashed mt-1">
                            <p className="text-xs font-medium text-muted-foreground mt-2 mb-2">
                              그라운딩 소스 ({kw.sources.length})
                            </p>
                            <div className="space-y-1.5">
                              {kw.sources.map((source, sIdx) => {
                                // source is now GroundingSource object with {uri, title, tier}
                                const sourceTierConfig = TIER_CONFIG[source.tier]
                                const SourceTierIcon = sourceTierConfig.icon
                                let hostname = source.uri
                                try {
                                  hostname = new URL(source.uri).hostname.replace('www.', '')
                                } catch {
                                  // Keep original if not a valid URL
                                }

                                return (
                                  <div
                                    key={sIdx}
                                    className="flex items-center gap-2 p-2 rounded bg-background/50 text-xs group"
                                  >
                                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", sourceTierConfig.color)}>
                                      <SourceTierIcon className="h-2.5 w-2.5" />
                                    </Badge>
                                    <div className="flex flex-col flex-1 min-w-0">
                                      {source.title && (
                                        <span className="truncate text-muted-foreground">{source.title}</span>
                                      )}
                                      <span className="font-mono truncate">{hostname}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleCopyUrl(source.uri)
                                            }}
                                          >
                                            {copiedUrl === source.uri ? (
                                              <Check className="h-3 w-3 text-green-600" />
                                            ) : (
                                              <Copy className="h-3 w-3" />
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{copiedUrl === source.uri ? '복사됨' : 'URL 복사'}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <a
                                            href={normalizeUrl(source.uri)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-accent"
                                          >
                                            <ArrowSquareOut className="h-3 w-3" />
                                          </a>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>새 탭에서 열기</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* Summary insights */}
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Sparkle className="h-4 w-4 text-primary" />
                    {t.generate.keywordSelector.groundingInsights}
                  </div>
                  <p className="text-muted-foreground">
                    {groundingKeywords.filter(k => k.score >= 80).length > 0 && (
                      <span className="text-green-600 dark:text-green-400">
                        {groundingKeywords.filter(k => k.score >= 80).length} {t.generate.keywordSelector.highInterestTopics}{' '}
                      </span>
                    )}
                    {groundingKeywords.some(k => k.sources.some(s => s.tier === 1)) && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {t.generate.keywordSelector.includesOfficialSources}{' '}
                      </span>
                    )}
                    <span>
                      {t.generate.keywordSelector.selectAlignWithBrief}
                    </span>
                  </p>
                </div>
              </TooltipProvider>
            ) : (
              <div className="text-center py-4">
                <Button
                  onClick={handleRunGrounding}
                  disabled={!productName}
                  variant="outline"
                  className="gap-2"
                >
                  <MagnifyingGlass className="h-4 w-4" />
                  {t.generate.keywordSelector.runGrounding}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {t.generate.keywordSelector.groundingHint}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Keyword Selection */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <Label className="text-sm sm:text-base">{t.generate.keywordSelector.selectKeywords}</Label>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              {t.generate.keywordSelector.humanDecisionRequired}
            </div>
          </div>
          {/* Keyword Selection Guidance */}
          <div className="p-3 rounded-lg border border-dashed bg-muted/30 text-xs space-y-2">
            <p className="font-medium flex items-center gap-1">
              <Lightning className="h-3 w-3 text-primary" />
              {t.generate.keywordSelector.selectionTips}
            </p>
            <ul className="space-y-1 text-muted-foreground pl-4">
              <li>• {t.generate.keywordSelector.tipPrioritize}</li>
              <li>• {t.generate.keywordSelector.tipHighScore}</li>
              <li>• {t.generate.keywordSelector.tipBalance}</li>
              <li>• {t.generate.keywordSelector.tipEmphasis}</li>
            </ul>
          </div>
        </div>

        {allKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {allKeywords.map((keyword) => {
              const isSelected = selectedKeywords.includes(keyword)
              const isDisabled = !isSelected && selectedKeywords.length >= 3
              const groundingData = groundingKeywords.find((g) => g.term === keyword)

              return (
                <label
                  key={keyword}
                  className={cn(
                    'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border cursor-pointer transition-all focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 min-h-[44px]',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:border-primary/50',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => !isDisabled && toggleKeyword(keyword)}
                    disabled={isDisabled}
                    aria-label={`${keyword}${groundingData ? `, score ${groundingData.score}` : ''}${isSelected ? ', selected' : ''}`}
                    aria-describedby={isDisabled ? 'keyword-limit' : undefined}
                  />
                  <span className="font-medium">{keyword}</span>
                  {groundingData && (
                    <span className="text-xs text-muted-foreground" aria-hidden="true">
                      ({groundingData.score})
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t.generate.keywordSelector.runGroundingOrAddBrief}
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div
            id="keyword-limit"
            className="text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {t.generate.keywordSelector.selected}: {selectedKeywords.length}/3
            {selectedKeywords.length >= 3 && (
              <span className="sr-only"> - maximum reached</span>
            )}
            {selectedKeywords.length > 0 && (
              <span className="ml-2">
                ({selectedKeywords.join(', ')})
              </span>
            )}
          </div>

          {/* Save Template Button */}
          <SaveTemplateDialog />
        </div>
      </div>
    </div>
  )
}
