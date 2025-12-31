'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BookOpenText,
  MagnifyingGlass,
  PencilLine,
  Target,
  TrendUp,
  CheckCircle,
  Info,
  ChatCircleText,
} from '@phosphor-icons/react'
import type { GenerationBreakdown as BreakdownType, QualityScores } from '@/store/generation-store'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Sparkle, Star } from '@phosphor-icons/react'

interface GenerationBreakdownProps {
  breakdown: BreakdownType
}

const SIGNAL_WEIGHTS = {
  playbook: 33,
  grounding: 33,
  userContent: 34,
}

export function GenerationBreakdown({ breakdown }: GenerationBreakdownProps) {
  const { playbookInfluence, groundingInfluence, userInputInfluence } = breakdown

  return (
    <TooltipProvider>
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Generation Breakdown
            </CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Shows how each signal source influenced the generated content using weighted fusion.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Playbook Influence (60%) */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpenText className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Brand Guidelines</span>
                <Badge variant="outline" className="text-xs">
                  {SIGNAL_WEIGHTS.playbook}%
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {playbookInfluence.guidelinesApplied} guidelines
              </span>
            </div>
            <Progress value={playbookInfluence.confidence} className="h-2" />
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
                    +{playbookInfluence.sectionsUsed.length - 4} more
                  </Badge>
                )}
              </div>
            )}
          </motion.div>

          {/* Grounding Influence (25%) */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MagnifyingGlass className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">User Intent Signals</span>
                <Badge variant="outline" className="text-xs">
                  {SIGNAL_WEIGHTS.grounding}%
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {groundingInfluence.signalsApplied} signals
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
                            ? 'text-green-500'
                            : i === 1
                              ? 'text-yellow-500'
                              : 'text-muted-foreground'
                        }`}
                      />
                      <span className="truncate font-medium">{signal.term}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Progress
                        value={signal.score}
                        className="h-1.5 w-16"
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
                No grounding signals available
              </p>
            )}
          </motion.div>

          {/* User Input Influence (15%) */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PencilLine className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Your Content</span>
                <Badge variant="outline" className="text-xs">
                  {SIGNAL_WEIGHTS.userContent}%
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>
                  {userInputInfluence.keywordsIntegrated.length} keywords integrated
                </span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>
                  {userInputInfluence.timestampsGenerated} timestamps generated
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

          {/* Quality Scores - AI Self-Critique Results */}
          {breakdown.qualityScores && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 pt-3 border-t"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkle className="h-4 w-4 text-yellow-500" weight="fill" />
                  <span className="text-sm font-medium">Quality Assessment</span>
                  {breakdown.qualityScores.refined && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-500">
                      Refined
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-primary">
                    {breakdown.qualityScores.overall}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>

              {/* Individual Score Bars */}
              <div className="space-y-2">
                <ScoreBar
                  label="Brand Voice"
                  score={breakdown.qualityScores.brandVoice}
                  icon={<Star className="h-3 w-3 text-blue-500" weight="fill" />}
                />
                <ScoreBar
                  label="Keyword Integration"
                  score={breakdown.qualityScores.keywordIntegration}
                  icon={<Target className="h-3 w-3 text-green-500" />}
                />
                <ScoreBar
                  label="GEO Optimization"
                  score={breakdown.qualityScores.geoOptimization}
                  icon={<TrendUp className="h-3 w-3 text-amber-500" />}
                />
                <ScoreBar
                  label="FAQ Quality"
                  score={breakdown.qualityScores.faqQuality}
                  icon={<ChatCircleText className="h-3 w-3 text-purple-500" />}
                />
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
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-500'
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5 w-32 min-w-0">
        {icon}
        <span className="truncate text-muted-foreground">{label}</span>
      </div>
      <div className="flex-1">
        <Progress value={score} className="h-1.5" />
      </div>
      <span className={`w-8 text-right font-medium ${getScoreColor(score)}`}>
        {score}
      </span>
    </div>
  )
}
