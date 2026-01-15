'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGenerationStore, type GenerationSession, type SessionStatus } from '@/store/generation-store'
import { useQueueManager } from '@/lib/generation-queue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  X,
  SpinnerGap,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Trash,
  Eye,
  CaretDown,
  CaretUp,
  Queue,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ==========================================
// Status Badge Component
// ==========================================

interface StatusBadgeProps {
  status: SessionStatus
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<SessionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    pending: { label: '대기중', variant: 'outline', icon: <Clock className="h-3 w-3" /> },
    grounding: { label: 'Grounding', variant: 'secondary', icon: <SpinnerGap className="h-3 w-3 animate-spin" /> },
    generating: { label: '생성중', variant: 'default', icon: <SpinnerGap className="h-3 w-3 animate-spin" /> },
    completed: { label: '완료', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
    failed: { label: '실패', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
    cancelled: { label: '취소됨', variant: 'outline', icon: <X className="h-3 w-3" /> },
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className="gap-1 text-xs">
      {config.icon}
      {config.label}
    </Badge>
  )
}

// ==========================================
// Session Item Component
// ==========================================

interface SessionItemProps {
  session: GenerationSession
  isActive: boolean
  onSelect: () => void
  onCancel: () => void
  onRemove: () => void
}

function SessionItem({ session, isActive, onSelect, onCancel, onRemove }: SessionItemProps) {
  const isRunning = session.status === 'grounding' || session.status === 'generating'
  const canCancel = session.status === 'pending' || isRunning
  const canRemove = !isRunning

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'p-3 rounded-lg border transition-colors cursor-pointer',
        isActive
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">
              {session.input.productName}
            </span>
            <StatusBadge status={session.status} />
          </div>

          {/* Progress bar for running sessions */}
          {isRunning && (
            <div className="mt-2">
              <Progress value={session.progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                {session.currentStage || '준비중...'} ({session.progress}%)
              </p>
            </div>
          )}

          {/* Error message */}
          {session.status === 'failed' && session.error && (
            <p className="text-xs text-destructive mt-1 truncate">
              {session.error}
            </p>
          )}

          {/* Timestamp */}
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(session.createdAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {session.status === 'completed' && session.result && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation()
                onSelect()
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}

          {canCancel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onCancel()
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {canRemove && !isRunning && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
            >
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ==========================================
// Queue Panel Component
// ==========================================

interface GenerationQueuePanelProps {
  className?: string
  collapsible?: boolean
  defaultExpanded?: boolean
}

export function GenerationQueuePanel({
  className,
  collapsible = true,
  defaultExpanded = true,
}: GenerationQueuePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const {
    sessions,
    sessionOrder,
    activeSessionId,
    setActiveSession,
    removeSession,
    clearCompletedSessions,
    loadSessionResult,
  } = useGenerationStore()

  const queueManager = useQueueManager()

  // Get sessions in display order
  const orderedSessions = sessionOrder
    .map(id => sessions[id])
    .filter(Boolean)

  // Stats
  const stats = {
    pending: orderedSessions.filter(s => s.status === 'pending').length,
    active: orderedSessions.filter(s => s.status === 'grounding' || s.status === 'generating').length,
    completed: orderedSessions.filter(s => s.status === 'completed').length,
    failed: orderedSessions.filter(s => s.status === 'failed' || s.status === 'cancelled').length,
  }

  const hasContent = orderedSessions.length > 0
  const hasCompletedOrFailed = stats.completed > 0 || stats.failed > 0

  const handleSelectSession = (session: GenerationSession) => {
    setActiveSession(session.id)
    if (session.status === 'completed' && session.result) {
      loadSessionResult(session.id)
    }
  }

  const handleCancelSession = (sessionId: string) => {
    queueManager.cancelSession(sessionId)
  }

  const handleRemoveSession = (sessionId: string) => {
    removeSession(sessionId)
  }

  if (!hasContent) {
    return null
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Queue className="h-5 w-5" />
            <CardTitle className="text-base">생성 대기열</CardTitle>
            <div className="flex items-center gap-1.5 ml-2">
              {stats.active > 0 && (
                <Badge variant="default" className="text-xs">
                  {stats.active} 진행중
                </Badge>
              )}
              {stats.pending > 0 && (
                <Badge variant="outline" className="text-xs">
                  {stats.pending} 대기
                </Badge>
              )}
              {stats.completed > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {stats.completed} 완료
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasCompletedOrFailed && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => clearCompletedSessions()}
              >
                완료 항목 삭제
              </Button>
            )}

            {collapsible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <CaretUp className="h-4 w-4" />
                ) : (
                  <CaretDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 pb-3 px-4">
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {orderedSessions.map((session) => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={session.id === activeSessionId}
                        onSelect={() => handleSelectSession(session)}
                        onCancel={() => handleCancelSession(session.id)}
                        onRemove={() => handleRemoveSession(session.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// ==========================================
// Mini Queue Indicator (for header/nav)
// ==========================================

interface QueueIndicatorProps {
  onClick?: () => void
  className?: string
}

export function QueueIndicator({ onClick, className }: QueueIndicatorProps) {
  const { sessions } = useGenerationStore()

  const sessionList = Object.values(sessions)
  const activeCount = sessionList.filter(
    s => s.status === 'grounding' || s.status === 'generating'
  ).length
  const pendingCount = sessionList.filter(s => s.status === 'pending').length

  const totalActive = activeCount + pendingCount

  if (totalActive === 0) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('gap-2', className)}
      onClick={onClick}
    >
      <SpinnerGap className="h-4 w-4 animate-spin" />
      <span>{totalActive} 생성중</span>
    </Button>
  )
}
