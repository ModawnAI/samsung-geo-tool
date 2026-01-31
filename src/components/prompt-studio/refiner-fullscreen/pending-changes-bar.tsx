'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ArrowCounterClockwise,
  Check,
  FloppyDisk,
  Spinner,
  Warning,
} from '@phosphor-icons/react'
import type { PendingStatus } from './hooks/use-refiner-state'

interface PendingChangesBarProps {
  pendingStatus: PendingStatus
  hasUnsavedChanges: boolean
  isSaving: boolean
  onApply: () => void
  onRevert: () => void
  onSave: () => void
  onSaveAndClose: () => void
  className?: string
}

export function PendingChangesBar({
  pendingStatus,
  hasUnsavedChanges,
  isSaving,
  onApply,
  onRevert,
  onSave,
  onSaveAndClose,
  className,
}: PendingChangesBarProps) {
  // Don't show if no pending changes and no unsaved changes
  if (pendingStatus === 'none' && !hasUnsavedChanges) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3 border-t bg-muted/50',
        className
      )}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-3">
        {pendingStatus === 'preview' && (
          <>
            <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
              <Warning className="h-3 w-3 mr-1" />
              대기 중인 변경사항
            </Badge>
            <span className="text-sm text-muted-foreground">
              차이점을 검토하고 적용하거나 취소하세요
            </span>
          </>
        )}
        {pendingStatus === 'applied' && (
          <>
            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
              <Check className="h-3 w-3 mr-1" />
              변경사항 적용됨
            </Badge>
            <span className="text-sm text-muted-foreground">
              변경사항을 저장하는 것을 잊지 마세요
            </span>
          </>
        )}
        {pendingStatus === 'none' && hasUnsavedChanges && (
          <>
            <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
              <Warning className="h-3 w-3 mr-1" />
              저장되지 않은 변경사항
            </Badge>
          </>
        )}
      </div>

      {/* Action buttons */}
      <TooltipProvider>
        <div className="flex items-center gap-2">
          {/* Pending changes actions */}
          {pendingStatus === 'preview' && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRevert}
                    disabled={isSaving}
                  >
                    <ArrowCounterClockwise className="h-4 w-4 mr-1" />
                    Discard
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>AI 제안 변경사항을 취소하고 현재 프롬프트 유지</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={onApply}
                    disabled={isSaving}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Apply Changes
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>AI 제안 변경사항을 프롬프트에 적용</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Save actions - always show when there are unsaved changes */}
          {(pendingStatus !== 'preview' && hasUnsavedChanges) && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Spinner className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <FloppyDisk className="h-4 w-4 mr-1" />
                    )}
                    Save
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>변경사항 저장 후 계속 편집</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={onSaveAndClose}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Spinner className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <FloppyDisk className="h-4 w-4 mr-1" />
                    )}
                    Save & Close
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>변경사항 저장 후 편집 화면으로 돌아가기</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </TooltipProvider>
    </div>
  )
}

export type { PendingChangesBarProps }
