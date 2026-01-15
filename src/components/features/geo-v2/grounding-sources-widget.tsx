'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { GroundingQualityScore, GroundingMetadata, GroundingSource } from '@/types/geo-v2'
import {
  Globe,
  CaretDown,
  CaretRight,
  ArrowSquareOut,
  Copy,
  Check,
  MagnifyingGlass,
  Buildings,
  Newspaper,
  Users,
  Question,
  X,
} from '@phosphor-icons/react'
import { cn, normalizeUrl } from '@/lib/utils'
import { trackSourceClick } from '@/lib/geo-v2/analytics'
import { TierExplanationDialog, TIER_UI_CONFIG } from './tier-explanation-dialog'

interface GroundingSourcesWidgetProps {
  groundingMetadata: GroundingMetadata
  groundingQuality: GroundingQualityScore
  language?: 'ko' | 'en'
  onSourceClick?: (uri: string, title: string) => void
}

const TIER_ICONS = {
  1: Buildings,
  2: Newspaper,
  3: Users,
  4: Question,
} as const

function SourceCard({
  source,
  language,
  onSourceClick,
}: {
  source: GroundingSource
  language: 'ko' | 'en'
  onSourceClick?: (uri: string, title: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const isKorean = language === 'ko'
  const tierConfig = TIER_UI_CONFIG[source.tier]

  const handleClick = () => {
    trackSourceClick(source.uri, source.title, 'sources_widget')
    onSourceClick?.(source.uri, source.title)
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(source.uri)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  let hostname = ''
  try {
    hostname = new URL(normalizeUrl(source.uri)).hostname.replace('www.', '')
  } catch {
    hostname = source.uri
  }

  return (
    <a
      href={normalizeUrl(source.uri)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={cn(
        'block p-3 rounded-lg border transition-all hover:shadow-md group',
        tierConfig.bgColor,
        tierConfig.borderColor
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge
              variant="outline"
              className={cn('text-xs', tierConfig.color)}
            >
              {isKorean ? tierConfig.labelKo : tierConfig.labelEn}
            </Badge>
            {source.usedIn && source.usedIn.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {isKorean
                  ? `${source.usedIn.length}개 섹션에서 사용`
                  : `Used in ${source.usedIn.length} section(s)`}
              </span>
            )}
            {source.accessCount && source.accessCount > 1 && (
              <Badge variant="secondary" className="text-xs">
                x{source.accessCount}
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium line-clamp-2 mb-1">{source.title}</p>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {hostname}
          </p>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? (isKorean ? '복사됨' : 'Copied') : (isKorean ? 'URL 복사' : 'Copy URL')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ArrowSquareOut className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </a>
  )
}

function TierSection({
  tier,
  sources,
  language,
  defaultOpen = false,
  onSourceClick,
}: {
  tier: 1 | 2 | 3 | 4
  sources: GroundingSource[]
  language: 'ko' | 'en'
  defaultOpen?: boolean
  onSourceClick?: (uri: string, title: string) => void
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const isKorean = language === 'ko'
  const tierConfig = TIER_UI_CONFIG[tier]
  const Icon = TIER_ICONS[tier]

  if (sources.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'w-full flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm',
            tierConfig.bgColor,
            tierConfig.borderColor
          )}
        >
          <div className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', tierConfig.color)} weight="fill" />
            <span className={cn('font-semibold', tierConfig.color)}>
              Tier {tier}: {isKorean ? tierConfig.labelKo : tierConfig.labelEn}
            </span>
            <Badge variant="outline" className={cn('text-xs', tierConfig.color)}>
              {sources.length}
            </Badge>
          </div>
          {isOpen ? (
            <CaretDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <CaretRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 pt-2"
          >
            {sources.map((source, index) => (
              <motion.div
                key={source.uri}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <SourceCard
                  source={source}
                  language={language}
                  onSourceClick={onSourceClick}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function GroundingSourcesWidget({
  groundingMetadata,
  groundingQuality,
  language = 'ko',
  onSourceClick,
}: GroundingSourcesWidgetProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const isKorean = language === 'ko'

  // Filter sources based on search query
  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) return groundingMetadata.sources

    const query = searchQuery.toLowerCase()
    return groundingMetadata.sources.filter((source) => {
      const titleMatch = source.title.toLowerCase().includes(query)
      const uriMatch = source.uri.toLowerCase().includes(query)
      return titleMatch || uriMatch
    })
  }, [groundingMetadata.sources, searchQuery])

  // Group sources by tier
  const groupedSources = useMemo(() => {
    const groups: Record<1 | 2 | 3 | 4, GroundingSource[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
    }

    for (const source of filteredSources) {
      groups[source.tier].push(source)
    }

    return groups
  }, [filteredSources])

  // Count by tier
  const tierCounts = {
    1: groupedSources[1].length,
    2: groupedSources[2].length,
    3: groupedSources[3].length,
    4: groupedSources[4].length,
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {isKorean ? '그라운딩 소스' : 'Grounding Sources'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {groundingMetadata.uniqueSources} {isKorean ? '소스' : 'sources'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {groundingMetadata.totalCitations} {isKorean ? '인용' : 'citations'}
            </Badge>
            <TierExplanationDialog language={language} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tier Distribution Summary */}
        <div className="flex flex-wrap gap-2">
          {([1, 2, 3, 4] as const).map((tier) => {
            const config = TIER_UI_CONFIG[tier]
            const count = tierCounts[tier]
            if (count === 0) return null

            return (
              <Badge
                key={tier}
                variant="outline"
                className={cn('text-xs', config.color)}
              >
                {isKorean ? config.labelKo : config.labelEn}: {count}
              </Badge>
            )
          })}
        </div>

        {/* Search Filter */}
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isKorean ? '소스 검색...' : 'Search sources...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* No Results */}
        {filteredSources.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">
              {isKorean
                ? '검색 결과가 없습니다.'
                : 'No sources found.'}
            </p>
          </div>
        )}

        {/* Tier Sections */}
        <div className="space-y-3">
          <TierSection
            tier={1}
            sources={groupedSources[1]}
            language={language}
            defaultOpen={true}
            onSourceClick={onSourceClick}
          />
          <TierSection
            tier={2}
            sources={groupedSources[2]}
            language={language}
            defaultOpen={groupedSources[1].length === 0}
            onSourceClick={onSourceClick}
          />
          <TierSection
            tier={3}
            sources={groupedSources[3]}
            language={language}
            defaultOpen={groupedSources[1].length === 0 && groupedSources[2].length === 0}
            onSourceClick={onSourceClick}
          />
          <TierSection
            tier={4}
            sources={groupedSources[4]}
            language={language}
            defaultOpen={false}
            onSourceClick={onSourceClick}
          />
        </div>

        {/* Search Queries Used */}
        {groundingMetadata.webSearchQueries && groundingMetadata.webSearchQueries.length > 0 && (
          <div className="pt-4 border-t">
            <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              {isKorean ? '사용된 검색 쿼리' : 'Search Queries Used'}
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {groundingMetadata.webSearchQueries.map((query, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-normal">
                  {query}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Score Summary hidden - AI automatically optimizes for best results */}
      </CardContent>
    </Card>
  )
}
