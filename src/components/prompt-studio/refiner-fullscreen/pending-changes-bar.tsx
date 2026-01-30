'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
              Pending changes
            </Badge>
            <span className="text-sm text-muted-foreground">
              Review the diff and apply or revert changes
            </span>
          </>
        )}
        {pendingStatus === 'applied' && (
          <>
            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
              <Check className="h-3 w-3 mr-1" />
              Changes applied
            </Badge>
            <span className="text-sm text-muted-foreground">
              Remember to save your changes
            </span>
          </>
        )}
        {pendingStatus === 'none' && hasUnsavedChanges && (
          <>
            <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
              <Warning className="h-3 w-3 mr-1" />
              Unsaved changes
            </Badge>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Pending changes actions */}
        {pendingStatus === 'preview' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onRevert}
              disabled={isSaving}
            >
              <ArrowCounterClockwise className="h-4 w-4 mr-1" />
              Discard
            </Button>
            <Button
              size="sm"
              onClick={onApply}
              disabled={isSaving}
            >
              <Check className="h-4 w-4 mr-1" />
              Apply Changes
            </Button>
          </>
        )}

        {/* Save actions - always show when there are unsaved changes */}
        {(pendingStatus !== 'preview' && hasUnsavedChanges) && (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}

export type { PendingChangesBarProps }
