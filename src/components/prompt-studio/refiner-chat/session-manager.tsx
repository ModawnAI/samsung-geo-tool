'use client'

import { useState, useEffect } from 'react'
import {
  ClockCounterClockwise,
  Star,
  Trash,
  Plus,
  Spinner,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { PromptStage, RefineSessionSummary } from '@/types/prompt-studio'

interface SessionManagerProps {
  stage: PromptStage
  currentSessionId?: string
  onLoadSession: (sessionId: string) => void
  onNewSession: () => void
  onToggleFavorite?: (sessionId: string, isFavorite: boolean) => void
}

export function SessionManager({
  stage,
  currentSessionId,
  onLoadSession,
  onNewSession,
  onToggleFavorite,
}: SessionManagerProps) {
  const [sessions, setSessions] = useState<RefineSessionSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Fetch sessions on mount and when stage changes
  useEffect(() => {
    fetchSessions()
  }, [stage])

  const fetchSessions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/prompt-studio/refine/sessions?stage=${stage}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      const response = await fetch(`/api/prompt-studio/refine/sessions/${deleteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSessions(sessions.filter((s) => s.id !== deleteId))
        if (currentSessionId === deleteId) {
          onNewSession()
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    } finally {
      setDeleteId(null)
    }
  }

  const handleToggleFavorite = async (session: RefineSessionSummary) => {
    try {
      const response = await fetch(`/api/prompt-studio/refine/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !session.isFavorite }),
      })

      if (response.ok) {
        setSessions(
          sessions.map((s) =>
            s.id === session.id ? { ...s, isFavorite: !s.isFavorite } : s
          )
        )
        onToggleFavorite?.(session.id, !session.isFavorite)
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  // Sort sessions: favorites first, then by date
  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) {
      return a.isFavorite ? -1 : 1
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <ClockCounterClockwise className="h-4 w-4 mr-1" />
                History
                {isLoading && <Spinner className="h-3 w-3 ml-1 animate-spin" />}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>이전 대화 세션 불러오기</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onClick={onNewSession}>
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {sortedSessions.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              No previous sessions
            </div>
          ) : (
            sortedSessions.map((session) => (
              <DropdownMenuItem
                key={session.id}
                className="flex items-center justify-between group"
                onClick={() => onLoadSession(session.id)}
              >
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-1">
                    {session.isFavorite && (
                      <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" weight="fill" />
                    )}
                    <span className="truncate text-sm">
                      {session.title || 'Untitled'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {session.messageCount} messages · {formatDate(session.updatedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleFavorite(session)
                    }}
                  >
                    {session.isFavorite ? (
                      <Star className="h-3.5 w-3.5 text-yellow-500" weight="fill" />
                    ) : (
                      <Star className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteId(session.id)
                    }}
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>세션 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 세션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }
}
