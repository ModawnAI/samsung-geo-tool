'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { USPExtractionResult, UniqueSellingPoint, ConfidenceLevel, USPCategory } from '@/types/geo-v2'
import { USP_CATEGORY_LABELS } from '@/lib/geo-v2/usp-extraction'
import {
  Target,
  CheckCircle,
  Warning,
  Info,
  Link as LinkIcon,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { cn, normalizeUrl } from '@/lib/utils'

interface USPDisplayProps {
  uspResult: USPExtractionResult
  onSourceClick?: (sourceUri: string, sourceTitle: string) => void
}

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, {
  color: string
  bgColor: string
  icon: React.ReactNode
  label: string
  description: string
}> = {
  high: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle className="h-4 w-4" />,
    label: 'High Confidence',
    description: 'Verified by multiple official sources',
  },
  medium: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: <Info className="h-4 w-4" />,
    label: 'Medium Confidence',
    description: 'Supported by reputable tech sources',
  },
  low: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <Warning className="h-4 w-4" />,
    label: 'Low Confidence',
    description: 'Limited source verification available',
  },
}

const CATEGORY_ICONS: Record<USPCategory, string> = {
  Camera: '📷',
  Display: '📱',
  Performance: '⚡',
  AI: '🤖',
  Design: '🎨',
  Battery: '🔋',
  Security: '🔒',
  Audio: '🔊',
  Connectivity: '📡',
  Software: '💻',
  Other: '✨',
}

function USPCard({
  usp,
  index,
  onSourceClick
}: {
  usp: UniqueSellingPoint
  index: number
  onSourceClick?: (sourceUri: string, sourceTitle: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const confidence = CONFIDENCE_CONFIG[usp.confidence]
  const categoryIcon = CATEGORY_ICONS[usp.category] || '✨'
  const categoryLabel = USP_CATEGORY_LABELS[usp.category]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div
        className={cn(
          'rounded-lg border p-4 transition-all hover:shadow-md',
          confidence.bgColor,
          'bg-opacity-50'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-2xl" aria-hidden="true">
              {categoryIcon}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="outline" className="text-xs">
                  {categoryLabel?.ko || usp.category}
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        className={cn(
                          'text-xs gap-1',
                          confidence.color,
                          confidence.bgColor
                        )}
                      >
                        {confidence.icon}
                        {confidence.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{confidence.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <h4 className="font-semibold text-sm">{usp.feature}</h4>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-muted/50 transition-colors"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? (
              <CaretUp className="h-4 w-4" />
            ) : (
              <CaretDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Summary */}
        <div className="mt-2 ml-11">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">차별화:</span> {usp.differentiation}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium">사용자 혜택:</span> {usp.userBenefit}
          </p>
        </div>

        {/* Expanded Evidence */}
        {isExpanded && usp.evidence && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 ml-11 pt-3 border-t border-border/50"
          >
            {usp.evidence.quotes && usp.evidence.quotes.length > 0 && (
              <div className="mb-3">
                <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Supporting Evidence
                </h5>
                <ul className="space-y-1">
                  {usp.evidence.quotes.slice(0, 3).map((quote, i) => (
                    <li
                      key={i}
                      className="text-xs text-muted-foreground italic pl-3 border-l-2 border-muted"
                    >
                      "{quote}"
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {usp.evidence.sources && usp.evidence.sources.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Sources
                </h5>
                <div className="flex flex-wrap gap-1">
                  {usp.evidence.sources.slice(0, 5).map((source, i) => {
                    let domain = source
                    try {
                      domain = new URL(normalizeUrl(source)).hostname.replace('www.', '')
                    } catch {
                      // Keep original if not a valid URL
                    }
                    return (
                      <a
                        key={i}
                        href={normalizeUrl(source)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onSourceClick?.(source, domain)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <LinkIcon className="h-3 w-3" />
                        {domain}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export function USPDisplay({ uspResult, onSourceClick }: USPDisplayProps) {
  if (!uspResult || !uspResult.usps || uspResult.usps.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Unique Selling Points (USP)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {uspResult.usps.length} USPs
            </Badge>
            <Badge
              variant={uspResult.extractionMethod === 'grounded' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {uspResult.extractionMethod === 'grounded' ? '🔍 Grounded' : '✨ Generative'}
            </Badge>
            {/* groundingQuality badge hidden - simplifying UI before Unpacked */}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* USP Cards */}
        {uspResult.usps.map((usp, index) => (
          <USPCard
            key={index}
            usp={usp}
            index={index}
            onSourceClick={onSourceClick}
          />
        ))}

        {/* Competitive Context */}
        {uspResult.competitiveContext && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
            <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              Competitive Context
            </h5>
            <p className="text-sm text-muted-foreground">
              {uspResult.competitiveContext}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
