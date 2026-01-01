'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useGenerationStore } from '@/store/generation-store'
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
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { ICON_SIZES } from '@/lib/constants/ui'
import { SOURCE_AUTHORITY_TIERS } from '@/types/geo-v2'
import { SaveTemplateDialog } from './template-manager'

// Source tier utilities
function getSourceTier(domain: string): 1 | 2 | 3 | 4 {
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
  const abortControllerRef = useRef<AbortController | null>(null)

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
          launchDate: launchDate?.toISOString(),
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
              Brief USPs
              <span className="text-muted-foreground font-normal text-sm">
                (Samsung priority)
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
                No brief found for this product
              </p>
            )}
          </CardContent>
        </Card>

        {/* Grounding Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendUp className="h-4 w-4" />
              Grounding Results
              <span className="text-muted-foreground font-normal text-sm">
                (user interest)
              </span>
            </CardTitle>
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
                    const bestTier = Math.min(...kw.sources.map(s => getSourceTier(s))) as 1 | 2 | 3 | 4
                    const tierConfig = TIER_CONFIG[bestTier]
                    const TierIcon = tierConfig.icon

                    return (
                      <div
                        key={i}
                        className={cn(
                          "p-3 rounded-lg border transition-all",
                          recommendation.level === 'high' && "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20",
                          recommendation.level === 'medium' && "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/20",
                          recommendation.level === 'low' && "border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/20"
                        )}
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
                                <p className="text-xs text-muted-foreground mt-1">
                                  Sources: {kw.sources.slice(0, 2).join(', ')}
                                </p>
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
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          {recommendation.level === 'high' && <Lightning className="h-3 w-3 text-green-500" weight="fill" />}
                          {recommendation.level === 'medium' && <CheckCircle className="h-3 w-3 text-yellow-500" />}
                          {recommendation.level === 'low' && <Info className="h-3 w-3" />}
                          <span>{recommendation.message}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Summary insights */}
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Sparkle className="h-4 w-4 text-primary" />
                    Grounding Insights
                  </div>
                  <p className="text-muted-foreground">
                    {groundingKeywords.filter(k => k.score >= 80).length > 0 && (
                      <span className="text-green-600 dark:text-green-400">
                        {groundingKeywords.filter(k => k.score >= 80).length} high-interest topics found.{' '}
                      </span>
                    )}
                    {groundingKeywords.some(k => k.sources.some(s => getSourceTier(s) === 1)) && (
                      <span className="text-blue-600 dark:text-blue-400">
                        Includes official Samsung sources.{' '}
                      </span>
                    )}
                    <span>
                      Select keywords that align with your brief USPs for best results.
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
                  Run Grounding
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Searches Reddit, Google for user interests
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
            <Label className="text-sm sm:text-base">Select up to 3 keywords to emphasize</Label>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              Human decision required
            </div>
          </div>
          {/* Keyword Selection Guidance */}
          <div className="p-3 rounded-lg border border-dashed bg-muted/30 text-xs space-y-2">
            <p className="font-medium flex items-center gap-1">
              <Lightning className="h-3 w-3 text-primary" />
              Selection Tips:
            </p>
            <ul className="space-y-1 text-muted-foreground pl-4">
              <li>• Prioritize keywords that appear in <span className="text-foreground font-medium">both Brief USPs and Grounding</span></li>
              <li>• High-score keywords (80+) indicate strong user search interest</li>
              <li>• Balance <span className="text-blue-600 dark:text-blue-400">official sources</span> with <span className="text-orange-600 dark:text-orange-400">community sentiment</span></li>
              <li>• Selected keywords will be emphasized throughout generated content</li>
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
            Run grounding or add brief USPs to see keywords
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div
            id="keyword-limit"
            className="text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Selected: {selectedKeywords.length}/3
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
