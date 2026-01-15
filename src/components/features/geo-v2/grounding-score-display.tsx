'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { GroundingQualityScore, GroundingMetadata, GroundingSource } from '@/types/geo-v2'
import {
  Link as LinkIcon,
  ChartBar,
  Shield,
  Rows,
  Globe,
  ArrowSquareOut,
} from '@phosphor-icons/react'
import { cn, normalizeUrl } from '@/lib/utils'
import { trackSourceClick } from '@/lib/geo-v2/analytics'

interface GroundingScoreDisplayProps {
  groundingQuality: GroundingQualityScore
  groundingMetadata?: GroundingMetadata
}

const TIER_CONFIG: Record<1 | 2 | 3 | 4, {
  label: string
  color: string
  bgColor: string
  description: string
}> = {
  1: {
    label: 'Official',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'Samsung official sources (samsung.com, news.samsung.com)',
  },
  2: {
    label: 'Tech Media',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    description: 'Reputable tech publications (gsmarena, theverge, cnet)',
  },
  3: {
    label: 'Community',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    description: 'Community sources (reddit, youtube, twitter)',
  },
  4: {
    label: 'Other',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    description: 'Other web sources',
  },
}

function ScoreBar({
  label,
  value,
  max,
  icon,
  description,
}: {
  label: string
  value: number
  max: number
  icon: React.ReactNode
  description: string
}) {
  const percentage = (value / max) * 100

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {icon}
                <span>{label}</span>
              </div>
              <span className="text-sm font-medium">
                {value.toFixed(1)}/{max}pts
              </span>
            </div>
            <Progress
              value={percentage}
              className="h-2"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function SourceLink({
  source,
  section,
}: {
  source: GroundingSource
  section: string
}) {
  const tierConfig = TIER_CONFIG[source.tier]

  const handleClick = () => {
    trackSourceClick(source.uri, source.title, section)
  }

  let hostname = source.uri
  try {
    hostname = new URL(normalizeUrl(source.uri)).hostname.replace('www.', '')
  } catch {
    // Keep original if not a valid URL
  }

  return (
    <a
      href={normalizeUrl(source.uri)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={cn(
        'block p-2 rounded-lg border transition-all hover:shadow-md',
        tierConfig.bgColor
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className={cn('text-xs', tierConfig.color)}
            >
              {tierConfig.label}
            </Badge>
            {source.usedIn && source.usedIn.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Used in {source.usedIn.length} section(s)
              </span>
            )}
          </div>
          <p className="text-sm font-medium truncate">{source.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {hostname}
          </p>
        </div>
        <ArrowSquareOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </a>
  )
}

export function GroundingScoreDisplay({
  groundingQuality,
  groundingMetadata,
}: GroundingScoreDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 5) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent'
    if (score >= 6) return 'Good'
    if (score >= 4) return 'Fair'
    return 'Needs Improvement'
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ChartBar className="h-4 w-4" />
            Grounding Quality Score
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn('text-lg font-bold', getScoreColor(groundingQuality.total))}
            >
              {groundingQuality.total.toFixed(1)}/10
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {getScoreLabel(groundingQuality.total)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Breakdown */}
        <div className="space-y-4">
          <ScoreBar
            label="Citation Density"
            value={groundingQuality.citationDensity}
            max={3}
            icon={<LinkIcon className="h-4 w-4" />}
            description={`${groundingQuality.breakdown.citationPercentage.toFixed(0)}% of content has grounding support`}
          />
          <ScoreBar
            label="Source Authority"
            value={groundingQuality.sourceAuthority}
            max={4}
            icon={<Shield className="h-4 w-4" />}
            description={`Tier 1: ${groundingQuality.breakdown.tier1Sources}, Tier 2: ${groundingQuality.breakdown.tier2Sources}, Tier 3: ${groundingQuality.breakdown.tier3Sources} sources`}
          />
          <ScoreBar
            label="Coverage"
            value={groundingQuality.coverage}
            max={3}
            icon={<Rows className="h-4 w-4" />}
            description={`${groundingQuality.breakdown.sectionsWithGrounding}/${groundingQuality.breakdown.totalSections} sections have grounding support`}
          />
        </div>

        {/* Source Statistics */}
        {groundingMetadata && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-4 border-t"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Grounding Sources
              </h4>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {groundingMetadata.uniqueSources} sources
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {groundingMetadata.totalCitations} citations
                </Badge>
              </div>
            </div>

            {/* Source Tier Distribution */}
            <div className="flex gap-2 mb-4">
              {Object.entries(TIER_CONFIG).map(([tier, config]) => {
                const count = groundingMetadata.sources.filter(
                  (s) => s.tier === Number(tier)
                ).length
                if (count === 0) return null
                return (
                  <TooltipProvider key={tier}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', config.color)}
                        >
                          {config.label}: {count}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{config.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>

            {/* Source List (Top 5) */}
            <div className="space-y-2">
              {groundingMetadata.sources.slice(0, 5).map((source, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <SourceLink source={source} section="grounding_overview" />
                </motion.div>
              ))}

              {groundingMetadata.sources.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{groundingMetadata.sources.length - 5} more sources
                </p>
              )}
            </div>

            {/* Search Queries Used */}
            {groundingMetadata.webSearchQueries && groundingMetadata.webSearchQueries.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Search Queries Used
                </h5>
                <div className="flex flex-wrap gap-1">
                  {groundingMetadata.webSearchQueries.slice(0, 8).map((query, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal">
                      {query}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
