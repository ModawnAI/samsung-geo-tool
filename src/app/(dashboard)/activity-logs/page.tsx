'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ClipboardText,
  CaretDown,
  CaretUp,
  MagnifyingGlass,
  Download,
  ArrowsDownUp,
  Lightning,
  Code,
  Sparkle,
  User,
  Clock,
  Check,
  X,
  Warning,
  Info,
  CalendarBlank,
  Funnel,
  Export,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ActivityCategory, GenerationEventType } from '@/types/database'

// Types
interface ActivityLog {
  id: string
  user_id: string | null
  user_email: string | null
  session_id: string | null
  action_type: string
  action_category: ActivityCategory
  action_description: string | null
  resource_type: string | null
  resource_id: string | null
  resource_name: string | null
  ip_address: string | null
  user_agent: string | null
  request_path: string | null
  request_method: string | null
  metadata: Record<string, unknown>
  status: 'success' | 'failure' | 'pending'
  error_message: string | null
  duration_ms: number | null
  created_at: string
}

interface ApiCallLog {
  id: string
  user_id: string | null
  user_email: string | null
  endpoint: string
  method: string
  request_body: Record<string, unknown> | null
  response_status: number | null
  response_body: Record<string, unknown> | null
  duration_ms: number | null
  external_apis_called: Array<{ name: string; durationMs: number; status: number | string }>
  error_type: string | null
  error_message: string | null
  trace_id: string | null
  estimated_cost: number | null
  tokens_used: { input?: number; output?: number; total?: number } | null
  created_at: string
}

interface GenerationEventLog {
  id: string
  activity_log_id: string | null
  api_call_log_id: string | null
  generation_id: string | null
  user_id: string | null
  event_type: GenerationEventType
  product_id: string | null
  product_name: string | null
  keywords_used: string[] | null
  srt_length: number | null
  video_url: string | null
  pipeline_config: Record<string, unknown> | null
  prompt_version_id: string | null
  weights_version_id: string | null
  description_length: number | null
  timestamps_count: number | null
  hashtags_count: number | null
  faq_count: number | null
  quality_scores: Record<string, number> | null
  final_score: number | null
  grounding_sources_count: number | null
  grounding_citations_count: number | null
  total_duration_ms: number | null
  stage_durations: Record<string, number> | null
  is_refined: boolean
  refinement_focus: string | null
  refinement_iteration: number
  created_at: string
}

type TabValue = 'activity' | 'api' | 'generation'
type SortOrder = 'asc' | 'desc'
type DateRange = 'today' | 'week' | 'month' | 'all'

const statusColors = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failure: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
}

const categoryColors: Record<ActivityCategory, string> = {
  auth: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  generation: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  navigation: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  configuration: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  data: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  system: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
}

function StatusIcon({ status }: { status: 'success' | 'failure' | 'pending' }) {
  switch (status) {
    case 'success':
      return <Check className="h-4 w-4 text-green-600" weight="bold" />
    case 'failure':
      return <X className="h-4 w-4 text-red-600" weight="bold" />
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-600" />
    default:
      return <Info className="h-4 w-4 text-gray-600" />
  }
}

function ActivityLogRow({
  log,
  expanded,
  onToggle,
}: {
  log: ActivityLog
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell className="w-[180px]">
          <span className="text-sm text-muted-foreground">
            {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate max-w-[150px]">
              {log.user_email || t.activityLogs.activityTable.anonymous}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <Badge className={cn('text-xs', categoryColors[log.action_category])}>
            {log.action_category}
          </Badge>
        </TableCell>
        <TableCell>
          <span className="text-sm font-medium">{log.action_type}</span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <StatusIcon status={log.status} />
            <Badge variant="outline" className={cn('text-xs', statusColors[log.status])}>
              {log.status}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="text-right">
          {log.duration_ms !== null ? (
            <span className="text-sm text-muted-foreground">{log.duration_ms}ms</span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="w-[40px]">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {expanded ? <CaretUp className="h-4 w-4" /> : <CaretDown className="h-4 w-4" />}
          </Button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={7} className="py-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">
              {log.action_description && (
                <div>
                  <span className="font-medium text-muted-foreground">{t.activityLogs.activityTable.description}:</span>
                  <p className="mt-1">{log.action_description}</p>
                </div>
              )}
              {log.resource_type && (
                <div>
                  <span className="font-medium text-muted-foreground">{t.activityLogs.activityTable.resource}:</span>
                  <p className="mt-1">{log.resource_type}: {log.resource_name || log.resource_id}</p>
                </div>
              )}
              {log.request_path && (
                <div>
                  <span className="font-medium text-muted-foreground">{t.activityLogs.activityTable.request}:</span>
                  <p className="mt-1 font-mono text-xs">{log.request_method} {log.request_path}</p>
                </div>
              )}
              {log.ip_address && (
                <div>
                  <span className="font-medium text-muted-foreground">{t.activityLogs.activityTable.ipAddress}:</span>
                  <p className="mt-1 font-mono text-xs">{log.ip_address}</p>
                </div>
              )}
              {log.error_message && (
                <div className="md:col-span-2">
                  <span className="font-medium text-red-600">{t.activityLogs.activityTable.error}:</span>
                  <p className="mt-1 text-red-600">{log.error_message}</p>
                </div>
              )}
              {Object.keys(log.metadata).length > 0 && (
                <div className="md:col-span-3">
                  <span className="font-medium text-muted-foreground">{t.activityLogs.activityTable.metadata}:</span>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function ApiLogRow({
  log,
  expanded,
  onToggle,
}: {
  log: ApiCallLog
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const statusClass = log.response_status
    ? log.response_status >= 400
      ? 'text-red-600'
      : 'text-green-600'
    : 'text-yellow-600'

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell className="w-[180px]">
          <span className="text-sm text-muted-foreground">
            {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate max-w-[150px]">
              {log.user_email || t.activityLogs.activityTable.anonymous}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs font-mono">
            {log.method}
          </Badge>
        </TableCell>
        <TableCell>
          <span className="text-sm font-mono truncate max-w-[200px] block">{log.endpoint}</span>
        </TableCell>
        <TableCell>
          <span className={cn('text-sm font-medium', statusClass)}>
            {log.response_status || 'pending'}
          </span>
        </TableCell>
        <TableCell className="text-right">
          {log.duration_ms !== null ? (
            <span className="text-sm text-muted-foreground">{log.duration_ms}ms</span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="w-[40px]">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {expanded ? <CaretUp className="h-4 w-4" /> : <CaretDown className="h-4 w-4" />}
          </Button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={7} className="py-4">
            <div className="grid gap-4 text-sm">
              {log.trace_id && (
                <div>
                  <span className="font-medium text-muted-foreground">{t.activityLogs.apiTable.traceId}:</span>
                  <p className="mt-1 font-mono text-xs">{log.trace_id}</p>
                </div>
              )}
              {log.tokens_used && (
                <div>
                  <span className="font-medium text-muted-foreground">{t.activityLogs.apiTable.tokens}:</span>
                  <p className="mt-1">
                    {t.activityLogs.apiTable.input}: {log.tokens_used.input || 0} | {t.activityLogs.apiTable.output}: {log.tokens_used.output || 0} | {t.activityLogs.apiTable.total}: {log.tokens_used.total || 0}
                  </p>
                </div>
              )}
              {log.estimated_cost !== null && (
                <div>
                  <span className="font-medium text-muted-foreground">{t.activityLogs.apiTable.estimatedCost}:</span>
                  <p className="mt-1">${log.estimated_cost.toFixed(6)}</p>
                </div>
              )}
              {log.external_apis_called && log.external_apis_called.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">{t.activityLogs.apiTable.externalApis}:</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {log.external_apis_called.map((api, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {api.name}: {api.durationMs}ms ({api.status})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {log.error_message && (
                <div className="md:col-span-2">
                  <span className="font-medium text-red-600">{t.activityLogs.apiTable.error} ({log.error_type}):</span>
                  <p className="mt-1 text-red-600">{log.error_message}</p>
                </div>
              )}
              {log.request_body && (
                <div>
                  <span className="font-medium text-muted-foreground">{t.activityLogs.apiTable.requestBody}:</span>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(log.request_body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function GenerationLogRow({
  log,
  expanded,
  onToggle,
}: {
  log: GenerationEventLog
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const eventTypeColors: Record<string, string> = {
    generation_started: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    generation_completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    generation_failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    regeneration_requested: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    content_refined: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    content_saved: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    content_confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    content_exported: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  }

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell className="w-[180px]">
          <span className="text-sm text-muted-foreground">
            {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
          </span>
        </TableCell>
        <TableCell>
          <span className="text-sm truncate max-w-[150px] block">
            {log.product_name || t.activityLogs.generationsTable.unknownProduct}
          </span>
        </TableCell>
        <TableCell>
          <Badge className={cn('text-xs', eventTypeColors[log.event_type] || 'bg-gray-100')}>
            {log.event_type.replace(/_/g, ' ')}
          </Badge>
        </TableCell>
        <TableCell>
          {log.final_score !== null ? (
            <span className={cn(
              'text-sm font-medium',
              log.final_score >= 80 ? 'text-green-600' :
                log.final_score >= 60 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {log.final_score.toFixed(1)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          {log.keywords_used && log.keywords_used.length > 0 ? (
            <span className="text-sm text-muted-foreground">{log.keywords_used.length} {t.activityLogs.generationsTable.keywords.toLowerCase()}</span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          {log.total_duration_ms !== null ? (
            <span className="text-sm text-muted-foreground">
              {log.total_duration_ms > 1000
                ? `${(log.total_duration_ms / 1000).toFixed(1)}s`
                : `${log.total_duration_ms}ms`
              }
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="w-[40px]">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {expanded ? <CaretUp className="h-4 w-4" /> : <CaretDown className="h-4 w-4" />}
          </Button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={7} className="py-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">
              {log.keywords_used && log.keywords_used.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">{t.activityLogs.generationsTable.keywordsUsed}:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {log.keywords_used.map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {log.description_length !== null && (
                <div>
                  <span className="font-medium text-muted-foreground">{t.activityLogs.generationsTable.outputMetrics}:</span>
                  <p className="mt-1">
                    {t.activityLogs.generationsTable.description}: {log.description_length} chars |
                    {t.activityLogs.generationsTable.timestamps}: {log.timestamps_count || 0} |
                    {t.activityLogs.generationsTable.hashtags}: {log.hashtags_count || 0} |
                    {t.activityLogs.generationsTable.faqs}: {log.faq_count || 0}
                  </p>
                </div>
              )}
              {log.grounding_sources_count !== null && (
                <div>
                  <span className="font-medium text-muted-foreground">{t.activityLogs.generationsTable.grounding}:</span>
                  <p className="mt-1">
                    {t.activityLogs.generationsTable.sources}: {log.grounding_sources_count} | {t.activityLogs.generationsTable.citations}: {log.grounding_citations_count || 0}
                  </p>
                </div>
              )}
              {log.quality_scores && (
                <div className="md:col-span-2">
                  <span className="font-medium text-muted-foreground">{t.activityLogs.generationsTable.qualityScores}:</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(log.quality_scores).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {typeof value === 'number' ? value.toFixed(1) : value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {log.stage_durations && (
                <div className="md:col-span-3">
                  <span className="font-medium text-muted-foreground">{t.activityLogs.generationsTable.stageDurations}:</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(log.stage_durations).map(([stage, duration]) => (
                      <Badge key={stage} variant="secondary" className="text-xs">
                        {stage}: {typeof duration === 'number' && duration > 1000
                          ? `${(duration / 1000).toFixed(1)}s`
                          : `${duration}ms`
                        }
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {log.is_refined && (
                <div>
                  <span className="font-medium text-muted-foreground">{t.activityLogs.generationsTable.refinement}:</span>
                  <p className="mt-1">
                    {t.activityLogs.generationsTable.focus}: {log.refinement_focus || t.activityLogs.generationsTable.general} | {t.activityLogs.generationsTable.iteration}: {log.refinement_iteration}
                  </p>
                </div>
              )}
              {log.video_url && (
                <div>
                  <span className="font-medium text-muted-foreground">{t.activityLogs.generationsTable.videoUrl}:</span>
                  <p className="mt-1 text-xs font-mono truncate">{log.video_url}</p>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export default function ActivityLogsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabValue>('activity')
  const [isLoading, setIsLoading] = useState(true)

  // Data
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [apiLogs, setApiLogs] = useState<ApiCallLog[]>([])
  const [generationLogs, setGenerationLogs] = useState<GenerationEventLog[]>([])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'success' | 'failure' | 'pending' | 'all'>('all')
  const [dateRange, setDateRange] = useState<DateRange>('week')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const supabase = createClient()

  const getDateFilter = useCallback(() => {
    switch (dateRange) {
      case 'today':
        return { from: startOfDay(new Date()), to: endOfDay(new Date()) }
      case 'week':
        return { from: subDays(new Date(), 7), to: new Date() }
      case 'month':
        return { from: subDays(new Date(), 30), to: new Date() }
      case 'all':
        return { from: null, to: null }
    }
  }, [dateRange])

  const fetchActivityLogs = useCallback(async () => {
    const dateFilter = getDateFilter()

    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: sortOrder === 'asc' })
      .limit(200)

    if (dateFilter.from) {
      query = query.gte('created_at', dateFilter.from.toISOString())
    }
    if (dateFilter.to) {
      query = query.lte('created_at', dateFilter.to.toISOString())
    }
    if (categoryFilter !== 'all') {
      query = query.eq('action_category', categoryFilter)
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }
    if (searchQuery) {
      query = query.or(`action_type.ilike.%${searchQuery}%,action_description.ilike.%${searchQuery}%,user_email.ilike.%${searchQuery}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching activity logs:', error)
      toast.error(t.activityLogs.loadError)
      return
    }

    setActivityLogs(data || [])
  }, [supabase, dateRange, categoryFilter, statusFilter, searchQuery, sortOrder, getDateFilter])

  const fetchApiLogs = useCallback(async () => {
    const dateFilter = getDateFilter()

    let query = supabase
      .from('api_call_logs')
      .select('*')
      .order('created_at', { ascending: sortOrder === 'asc' })
      .limit(200)

    if (dateFilter.from) {
      query = query.gte('created_at', dateFilter.from.toISOString())
    }
    if (dateFilter.to) {
      query = query.lte('created_at', dateFilter.to.toISOString())
    }
    if (searchQuery) {
      query = query.or(`endpoint.ilike.%${searchQuery}%,user_email.ilike.%${searchQuery}%,error_message.ilike.%${searchQuery}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching API logs:', error)
      toast.error(t.activityLogs.loadError)
      return
    }

    setApiLogs(data || [])
  }, [supabase, dateRange, searchQuery, sortOrder, getDateFilter])

  const fetchGenerationLogs = useCallback(async () => {
    const dateFilter = getDateFilter()

    let query = supabase
      .from('generation_event_logs')
      .select('*')
      .order('created_at', { ascending: sortOrder === 'asc' })
      .limit(200)

    if (dateFilter.from) {
      query = query.gte('created_at', dateFilter.from.toISOString())
    }
    if (dateFilter.to) {
      query = query.lte('created_at', dateFilter.to.toISOString())
    }
    if (searchQuery) {
      query = query.or(`product_name.ilike.%${searchQuery}%,event_type.ilike.%${searchQuery}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching generation logs:', error)
      toast.error(t.activityLogs.loadError)
      return
    }

    setGenerationLogs(data || [])
  }, [supabase, dateRange, searchQuery, sortOrder, getDateFilter])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchActivityLogs(),
        fetchApiLogs(),
        fetchGenerationLogs(),
      ])
    } finally {
      setIsLoading(false)
    }
  }, [fetchActivityLogs, fetchApiLogs, fetchGenerationLogs])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleExport = (type: 'json' | 'csv') => {
    let data: unknown[]
    let filename: string

    switch (activeTab) {
      case 'activity':
        data = activityLogs
        filename = `activity-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}`
        break
      case 'api':
        data = apiLogs
        filename = `api-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}`
        break
      case 'generation':
        data = generationLogs
        filename = `generation-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}`
        break
    }

    if (type === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      // CSV export
      if (data.length === 0) {
        toast.error(t.activityLogs.noDataToExport)
        return
      }
      const headers = Object.keys(data[0] as object)
      const csvContent = [
        headers.join(','),
        ...data.map((row) =>
          headers.map((h) => {
            const value = (row as Record<string, unknown>)[h]
            if (value === null || value === undefined) return ''
            if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
            return `"${String(value).replace(/"/g, '""')}"`
          }).join(',')
        ),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }

    toast.success(`${data.length} ${t.activityLogs.exportedSuccess}`)
  }

  // Summary stats
  const stats = {
    totalActivity: activityLogs.length,
    successActivity: activityLogs.filter((l) => l.status === 'success').length,
    failedActivity: activityLogs.filter((l) => l.status === 'failure').length,
    totalApi: apiLogs.length,
    errorApi: apiLogs.filter((l) => l.response_status && l.response_status >= 400).length,
    totalGeneration: generationLogs.length,
    completedGeneration: generationLogs.filter((l) => l.event_type === 'generation_completed').length,
    failedGeneration: generationLogs.filter((l) => l.event_type === 'generation_failed').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ClipboardText className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">{t.activityLogs.title}</h1>
            <p className="text-sm text-muted-foreground">
              {t.activityLogs.subtitle}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t.activityLogs.export}
              <CaretDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('json')}>
              {t.activityLogs.exportJson}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              {t.activityLogs.exportCsv}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lightning className="h-4 w-4" />
              {t.activityLogs.summary.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActivity}</div>
            <p className="text-xs text-muted-foreground">
              {stats.successActivity} {t.activityLogs.filters.success.toLowerCase()} / {stats.failedActivity} {t.activityLogs.filters.failure.toLowerCase()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Code className="h-4 w-4" />
              {t.activityLogs.summary.apiCalls}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApi}</div>
            <p className="text-xs text-muted-foreground">
              {stats.errorApi} {t.activityLogs.filters.error.toLowerCase()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkle className="h-4 w-4" />
              {t.activityLogs.summary.generations}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGeneration}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedGeneration} {t.common.completed.toLowerCase()} / {stats.failedGeneration} {t.activityLogs.filters.failure.toLowerCase()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarBlank className="h-4 w-4" />
              {t.activityLogs.summary.timeRange}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {dateRange === 'today' ? t.activityLogs.filters.today :
               dateRange === 'week' ? t.activityLogs.filters.lastWeek :
               dateRange === 'month' ? t.activityLogs.filters.lastMonth :
               t.activityLogs.filters.allTime}
            </div>
            <p className="text-xs text-muted-foreground">
              {dateRange === 'all' ? t.activityLogs.filters.allTime :
               dateRange === 'today' ? t.activityLogs.filters.today :
               dateRange === 'week' ? t.activityLogs.filters.lastWeek :
               t.activityLogs.filters.lastMonth}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.activityLogs.filters.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder={t.activityLogs.filters.dateRange} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t.activityLogs.filters.today}</SelectItem>
                  <SelectItem value="week">{t.activityLogs.filters.lastWeek}</SelectItem>
                  <SelectItem value="month">{t.activityLogs.filters.lastMonth}</SelectItem>
                  <SelectItem value="all">{t.activityLogs.filters.allTime}</SelectItem>
                </SelectContent>
              </Select>

              {activeTab === 'activity' && (
                <>
                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={t.activityLogs.filters.category} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.activityLogs.filters.allCategories}</SelectItem>
                      <SelectItem value="auth">{t.activityLogs.categories.auth}</SelectItem>
                      <SelectItem value="generation">{t.activityLogs.categories.generation}</SelectItem>
                      <SelectItem value="navigation">{t.activityLogs.categories.navigation}</SelectItem>
                      <SelectItem value="configuration">{t.activityLogs.categories.configuration}</SelectItem>
                      <SelectItem value="data">{t.activityLogs.categories.data}</SelectItem>
                      <SelectItem value="system">{t.activityLogs.categories.system}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder={t.activityLogs.filters.status} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.activityLogs.filters.allStatus}</SelectItem>
                      <SelectItem value="success">{t.activityLogs.filters.success}</SelectItem>
                      <SelectItem value="failure">{t.activityLogs.filters.failure}</SelectItem>
                      <SelectItem value="pending">{t.activityLogs.filters.pending}</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                title={sortOrder === 'desc' ? t.activityLogs.newestFirst : t.activityLogs.oldestFirst}
              >
                <ArrowsDownUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs and Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity" className="gap-2">
            <Lightning className="h-4 w-4" />
            {t.activityLogs.tabs.activity} ({stats.totalActivity})
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Code className="h-4 w-4" />
            {t.activityLogs.tabs.apiCalls} ({stats.totalApi})
          </TabsTrigger>
          <TabsTrigger value="generation" className="gap-2">
            <Sparkle className="h-4 w-4" />
            {t.activityLogs.tabs.generations} ({stats.totalGeneration})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Lightning className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t.activityLogs.activityTable.noLogs}</p>
                  <p className="text-sm mt-1">{t.activityLogs.activityTable.adjustFilters}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.activityLogs.activityTable.timestamp}</TableHead>
                      <TableHead>{t.activityLogs.activityTable.user}</TableHead>
                      <TableHead>{t.activityLogs.activityTable.category}</TableHead>
                      <TableHead>{t.activityLogs.activityTable.action}</TableHead>
                      <TableHead>{t.activityLogs.activityTable.status}</TableHead>
                      <TableHead className="text-right">{t.activityLogs.activityTable.duration}</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map((log) => (
                      <ActivityLogRow
                        key={log.id}
                        log={log}
                        expanded={expandedRows.has(log.id)}
                        onToggle={() => toggleRowExpanded(log.id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : apiLogs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t.activityLogs.apiTable.noApiCalls}</p>
                  <p className="text-sm mt-1">{t.activityLogs.apiTable.adjustFilters}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.activityLogs.apiTable.timestamp}</TableHead>
                      <TableHead>{t.activityLogs.activityTable.user}</TableHead>
                      <TableHead>{t.activityLogs.apiTable.method}</TableHead>
                      <TableHead>{t.activityLogs.apiTable.endpoint}</TableHead>
                      <TableHead>{t.activityLogs.apiTable.status}</TableHead>
                      <TableHead className="text-right">{t.activityLogs.apiTable.duration}</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiLogs.map((log) => (
                      <ApiLogRow
                        key={log.id}
                        log={log}
                        expanded={expandedRows.has(log.id)}
                        onToggle={() => toggleRowExpanded(log.id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generation" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : generationLogs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Sparkle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t.activityLogs.generationsTable.noGenerations}</p>
                  <p className="text-sm mt-1">{t.activityLogs.generationsTable.adjustFilters}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.activityLogs.generationsTable.timestamp}</TableHead>
                      <TableHead>{t.activityLogs.generationsTable.product}</TableHead>
                      <TableHead>{t.activityLogs.generationsTable.event}</TableHead>
                      <TableHead>{t.activityLogs.generationsTable.score}</TableHead>
                      <TableHead>{t.activityLogs.generationsTable.keywords}</TableHead>
                      <TableHead className="text-right">{t.activityLogs.generationsTable.duration}</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generationLogs.map((log) => (
                      <GenerationLogRow
                        key={log.id}
                        log={log}
                        expanded={expandedRows.has(log.id)}
                        onToggle={() => toggleRowExpanded(log.id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
