'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useGenerationStore } from '@/store/generation-store'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  MagnifyingGlass,
  FileText,
  TrendUp,
  Info,
  ArrowClockwise,
  Warning,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { ICON_SIZES } from '@/lib/constants/ui'

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
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : groundingKeywords.length > 0 ? (
              <ul className="space-y-2">
                {groundingKeywords.map((kw, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                        {i + 1}
                      </span>
                      {kw.term}
                    </div>
                    <span className="text-muted-foreground">
                      {kw.score} pts
                    </span>
                  </li>
                ))}
              </ul>
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <Label className="text-sm sm:text-base">Select up to 3 keywords to emphasize</Label>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            Human decision required
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
      </div>
    </div>
  )
}
