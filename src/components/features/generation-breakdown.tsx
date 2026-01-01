'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  BookOpenText,
  MagnifyingGlass,
  PencilLine,
  Target,
  TrendUp,
  CheckCircle,
  Info,
  ChatCircleText,
  Database,
  Gear,
  Warning,
  ShieldCheck,
  Lightbulb,
  ArrowRight,
  CaretDown,
  CaretUp,
  ArrowClockwise,
  Copy,
  ListChecks,
  Lightning,
  ArrowSquareOut,
  Sparkle,
  Star,
  ClipboardText,
  TextAlignLeft,
  Quotes,
  TreeStructure,
} from '@phosphor-icons/react'
import type { GenerationBreakdown as BreakdownType, TuningMetadata, ScoreBreakdownItem } from '@/store/generation-store'
import { useState, useCallback } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Action types for the callback
export type ActionType =
  | 'regenerate_usps'
  | 'regenerate_grounded'
  | 'regenerate_aligned'
  | 'verify_claims'
  | 'add_keywords'
  | 'improve_structure'
  | 'regenerate_all'
  | 'copy_fix'

export interface ActionPayload {
  type: ActionType
  metric?: string
  details?: string
}

interface GenerationBreakdownProps {
  breakdown: BreakdownType
  tuningMetadata?: TuningMetadata | null
  onAction?: (action: ActionPayload) => void
  isRegenerating?: boolean
}

const SIGNAL_WEIGHTS = {
  playbook: 33,
  grounding: 33,
  userContent: 34,
}

export function GenerationBreakdown({
  breakdown,
  tuningMetadata,
  onAction,
  isRegenerating = false
}: GenerationBreakdownProps) {
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
          {/* Playbook Influence */}
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

          {/* Grounding Influence */}
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

          {/* User Input Influence */}
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

          {/* Quality Scores */}
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

          {/* Tuning Configuration */}
          {tuningMetadata && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3 pt-3 border-t"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gear className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium">Pipeline Configuration</span>
                  <Badge
                    variant={tuningMetadata.configSource === 'database' ? 'default' : 'secondary'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {tuningMetadata.configSource === 'database' ? 'Custom' : 'Default'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {tuningMetadata.weightsName && (
                  <div className="flex items-center gap-2">
                    <Database className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Weights:</span>
                    <span className="font-medium">{tuningMetadata.weightsName}</span>
                  </div>
                )}

                {tuningMetadata.promptVersionId && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>Prompt Version:</span>
                    <code className="text-[10px] bg-muted px-1 rounded">
                      {tuningMetadata.promptVersionId.slice(0, 8)}
                    </code>
                  </div>
                )}

                {tuningMetadata.scoreBreakdown && tuningMetadata.scoreBreakdown.length > 0 && (
                  <ScoreBreakdownSection
                    scoreBreakdown={tuningMetadata.scoreBreakdown}
                    onAction={onAction}
                    isRegenerating={isRegenerating}
                  />
                )}
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

// Metric configuration with actionable fixes
const METRIC_CONFIG: Record<string, {
  description: string
  icon: ReactNode
  actionType: ActionType
  actionLabel: string
  getRecommendation: (score: number) => { text: string; priority: 'critical' | 'warning' | 'good' } | null
  thresholds: { critical: number; warning: number }
}> = {
  usp_coverage: {
    description: 'How well the content covers key selling points from the brief',
    icon: <Target className="h-3.5 w-3.5" />,
    actionType: 'regenerate_usps',
    actionLabel: 'Add USPs',
    thresholds: { critical: 30, warning: 60 },
    getRecommendation: (score) => {
      if (score < 30) return {
        text: 'Add more USPs from the product brief. Current content misses key selling points.',
        priority: 'critical'
      }
      if (score < 60) return {
        text: 'Include additional USPs: features, benefits, or differentiators from the brief.',
        priority: 'warning'
      }
      return null
    },
  },
  grounding_score: {
    description: 'Factual accuracy verified against external sources (Google/Perplexity)',
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    actionType: 'regenerate_grounded',
    actionLabel: 'Add Sources',
    thresholds: { critical: 20, warning: 50 },
    getRecommendation: (score) => {
      if (score < 20) return {
        text: 'Content lacks verified sources. Add citations from official Samsung pages or reviews.',
        priority: 'critical'
      }
      if (score < 50) return {
        text: 'Improve grounding: Reference official specs, reviews, or trusted tech sources.',
        priority: 'warning'
      }
      return null
    },
  },
  semantic_similarity: {
    description: 'How closely the generated content matches the brief intent and context',
    icon: <BookOpenText className="h-3.5 w-3.5" />,
    actionType: 'regenerate_aligned',
    actionLabel: 'Align to Brief',
    thresholds: { critical: 30, warning: 55 },
    getRecommendation: (score) => {
      if (score < 30) return {
        text: 'Content diverges from brief. Regenerate with focus on brief requirements.',
        priority: 'critical'
      }
      if (score < 55) return {
        text: 'Align content more closely with the brief messaging and target audience.',
        priority: 'warning'
      }
      return null
    },
  },
  anti_fabrication: {
    description: 'Prevention of hallucinated or unverified claims in the content',
    icon: <Warning className="h-3.5 w-3.5" />,
    actionType: 'verify_claims',
    actionLabel: 'Verify Claims',
    thresholds: { critical: 40, warning: 65 },
    getRecommendation: (score) => {
      if (score < 40) return {
        text: 'High fabrication risk detected. Review all claims and remove unverified statements.',
        priority: 'critical'
      }
      if (score < 65) return {
        text: 'Verify all technical specs and claims against official Samsung documentation.',
        priority: 'warning'
      }
      return null
    },
  },
  keyword_density: {
    description: 'Presence and natural integration of target keywords',
    icon: <MagnifyingGlass className="h-3.5 w-3.5" />,
    actionType: 'add_keywords',
    actionLabel: 'Add Keywords',
    thresholds: { critical: 25, warning: 50 },
    getRecommendation: (score) => {
      if (score < 25) return {
        text: 'Missing target keywords. Add selected keywords naturally throughout content.',
        priority: 'critical'
      }
      if (score < 50) return {
        text: 'Increase keyword usage in headings, descriptions, and FAQ sections.',
        priority: 'warning'
      }
      return null
    },
  },
  structure_quality: {
    description: 'Content organization, formatting, and readability',
    icon: <TreeStructure className="h-3.5 w-3.5" />,
    actionType: 'improve_structure',
    actionLabel: 'Fix Structure',
    thresholds: { critical: 30, warning: 55 },
    getRecommendation: (score) => {
      if (score < 30) return {
        text: 'Poor structure. Reorganize with clear sections, headers, and formatting.',
        priority: 'critical'
      }
      if (score < 55) return {
        text: 'Improve structure: Add clearer headings, bullet points, or logical flow.',
        priority: 'warning'
      }
      return null
    },
  },
}

// Score threshold legend for user understanding
function ScoreThresholdLegend() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span>Good (≥60)</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <span>Needs Work</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span>Critical</span>
      </div>
    </div>
  )
}

// Overall score indicator with context
function OverallScoreIndicator({ score }: { score: number }) {
  const getOverallStatus = () => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', emoji: '🟢' }
    if (score >= 60) return { label: 'Good', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', emoji: '🟢' }
    if (score >= 40) return { label: 'Needs Improvement', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', emoji: '🟡' }
    return { label: 'Critical Attention', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', emoji: '🔴' }
  }

  const status = getOverallStatus()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-2 px-2 py-1 rounded-full ${status.bg} cursor-help`}>
          <span className="text-sm">{status.emoji}</span>
          <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="text-xs space-y-1">
          <p className="font-medium">Score Thresholds:</p>
          <p>🟢 80-100: Excellent - Ready for use</p>
          <p>🟢 60-79: Good - Minor improvements possible</p>
          <p>🟡 40-59: Needs Improvement - Review recommended</p>
          <p>🔴 0-39: Critical - Regeneration needed</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

interface ScoreBreakdownSectionProps {
  scoreBreakdown: ScoreBreakdownItem[]
  onAction?: (action: ActionPayload) => void
  isRegenerating?: boolean
}

function ScoreBreakdownSection({ scoreBreakdown, onAction, isRegenerating }: ScoreBreakdownSectionProps) {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null)
  const [copiedMetric, setCopiedMetric] = useState<string | null>(null)

  // Calculate overall score
  const overallScore = scoreBreakdown.reduce((sum, item) => sum + (item.weightedScore || 0), 0)

  // Calculate overall health and identify issues
  const criticalIssues = scoreBreakdown.filter(item => {
    const config = METRIC_CONFIG[item.metric]
    return config && item.score < config.thresholds.critical
  })

  const warnings = scoreBreakdown.filter(item => {
    const config = METRIC_CONFIG[item.metric]
    return config && item.score >= config.thresholds.critical && item.score < config.thresholds.warning
  })

  // Sort by priority (critical first, then by score ascending)
  const sortedBreakdown = [...scoreBreakdown].sort((a, b) => {
    const configA = METRIC_CONFIG[a.metric]
    const configB = METRIC_CONFIG[b.metric]
    if (!configA || !configB) return 0

    const aIsCritical = a.score < configA.thresholds.critical
    const bIsCritical = b.score < configB.thresholds.critical

    if (aIsCritical && !bIsCritical) return -1
    if (!aIsCritical && bIsCritical) return 1
    return a.score - b.score
  })

  const getScoreStatus = (score: number, metric: string) => {
    const config = METRIC_CONFIG[metric]
    if (!config) return { status: 'unknown', color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-muted' }

    if (score < config.thresholds.critical) {
      return {
        status: 'critical',
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800'
      }
    }
    if (score < config.thresholds.warning) {
      return {
        status: 'warning',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800'
      }
    }
    return {
      status: 'good',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800'
    }
  }

  const getProgressColor = (score: number, metric: string) => {
    const config = METRIC_CONFIG[metric]
    if (!config) return ''

    if (score < config.thresholds.critical) return '[&>div]:bg-red-500'
    if (score < config.thresholds.warning) return '[&>div]:bg-amber-500'
    return '[&>div]:bg-green-500'
  }

  const handleAction = useCallback((actionType: ActionType, metric: string) => {
    if (onAction) {
      onAction({ type: actionType, metric })
    }
  }, [onAction])

  const handleCopyFix = useCallback((metric: string, recommendation: string) => {
    navigator.clipboard.writeText(recommendation)
    setCopiedMetric(metric)
    setTimeout(() => setCopiedMetric(null), 2000)
    if (onAction) {
      onAction({ type: 'copy_fix', metric, details: recommendation })
    }
  }, [onAction])

  return (
    <div className="mt-3 space-y-3">
      {/* Header with summary and overall score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Score Breakdown</span>
            <OverallScoreIndicator score={overallScore} />
          </div>
          <div className="flex items-center gap-2">
            {criticalIssues.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
                <Warning className="h-3 w-3" />
                {criticalIssues.length} Critical
              </Badge>
            )}
            {warnings.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {warnings.length} Warning
              </Badge>
            )}
          </div>
        </div>
        {/* Score threshold legend for user context */}
        <ScoreThresholdLegend />
      </div>

      {/* Score items - prioritized */}
      <div className="space-y-2">
        {sortedBreakdown.map((item) => {
          const config = METRIC_CONFIG[item.metric]
          const { status, color, bg, border } = getScoreStatus(item.score, item.metric)
          const recommendation = config?.getRecommendation(item.score)
          const isExpanded = expandedMetric === item.metric
          const isCopied = copiedMetric === item.metric

          return (
            <div
              key={item.metric}
              className={`rounded-lg border ${recommendation ? border : 'border-transparent'} ${recommendation ? bg : ''} transition-all`}
            >
              {/* Score row */}
              <div
                className={`flex items-center gap-2 p-2 ${recommendation ? 'cursor-pointer' : ''}`}
                onClick={() => recommendation && setExpandedMetric(isExpanded ? null : item.metric)}
              >
                {/* Status indicator */}
                <div className={`flex-shrink-0 ${color}`}>
                  {config?.icon}
                </div>

                {/* Metric label with tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 cursor-help">
                      <span className="text-xs font-medium truncate">{item.label}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{config?.description || item.label}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Progress bar */}
                <div className="w-20 flex-shrink-0">
                  <Progress
                    value={item.score}
                    className={`h-2 ${getProgressColor(item.score, item.metric)}`}
                  />
                </div>

                {/* Score display */}
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold ${color}`}>
                  <span>{Math.round(item.score)}</span>
                  <span className="text-[10px] opacity-70">/100</span>
                </div>

                {/* Weight */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-muted-foreground w-10 text-right cursor-help flex-shrink-0">
                      x{(item.weight * 100).toFixed(0)}%
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Weight: {(item.weight * 100).toFixed(0)}% of total score</p>
                  </TooltipContent>
                </Tooltip>

                {/* Expand indicator for issues */}
                {recommendation && (
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <CaretUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>

              {/* Expanded action panel */}
              {recommendation && isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 pb-3 space-y-2"
                >
                  {/* Recommendation text */}
                  <div className="flex items-start gap-2 text-xs">
                    <Lightbulb className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${color}`} />
                    <p className={`${color} leading-relaxed`}>{recommendation.text}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {config && onAction && (
                      <Button
                        size="sm"
                        variant={recommendation.priority === 'critical' ? 'destructive' : 'secondary'}
                        className="h-7 text-xs gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAction(config.actionType, item.metric)
                        }}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <ArrowClockwise className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Lightning className="h-3.5 w-3.5" />
                        )}
                        {config.actionLabel}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyFix(item.metric, recommendation.text)
                      }}
                    >
                      {isCopied ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {isCopied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Actions Summary for Critical Issues */}
      {criticalIssues.length > 0 && onAction && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Warning className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                Action Required
              </span>
            </div>
            <Badge variant="destructive" className="text-[10px]">
              {criticalIssues.length} issue{criticalIssues.length > 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Priority action list */}
          <div className="space-y-2 mb-3">
            {criticalIssues.slice(0, 3).map((issue, index) => {
              const config = METRIC_CONFIG[issue.metric]
              return (
                <div key={issue.metric} className="flex items-center gap-2 text-xs">
                  <span className="w-4 h-4 rounded-full bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 flex items-center justify-center font-bold text-[10px]">
                    {index + 1}
                  </span>
                  <span className="text-red-700 dark:text-red-300 font-medium">{issue.label}</span>
                  <ArrowRight className="h-3 w-3 text-red-400" />
                  <span className="text-red-600 dark:text-red-400">{config?.actionLabel}</span>
                </div>
              )
            })}
          </div>

          {/* Bulk action button */}
          <Button
            size="sm"
            variant="destructive"
            className="w-full h-8 text-xs gap-2"
            onClick={() => onAction({ type: 'regenerate_all' })}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <>
                <ArrowClockwise className="h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <ArrowClockwise className="h-4 w-4" />
                Regenerate with All Fixes
              </>
            )}
          </Button>
        </div>
      )}

      {/* Success state when no issues */}
      {criticalIssues.length === 0 && warnings.length === 0 && (
        <div className="mt-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
            <CheckCircle className="h-4 w-4" weight="fill" />
            <span className="font-medium">All quality metrics are within acceptable ranges</span>
          </div>
        </div>
      )}
    </div>
  )
}
