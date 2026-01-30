'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PencilSimple, Eye, Info } from '@phosphor-icons/react'
import { STAGE_CONFIG, type PromptStage } from '@/types/prompt-studio'
import { DiffViewer } from './diff-viewer'
import type { DiffMode } from './hooks/use-refiner-state'

interface PromptPanelProps {
  stageId: PromptStage
  prompt: string
  originalPrompt: string
  pendingPrompt: string | null
  isEditMode: boolean
  showDiff: boolean
  diffMode: DiffMode
  hasChanges: boolean
  onPromptChange: (prompt: string) => void
  onEditModeChange: (isEdit: boolean) => void
  onDiffModeChange: (mode: DiffMode) => void
  className?: string
}

/**
 * Highlight template variables in prompt text
 */
function HighlightedPrompt({ text }: { text: string }) {
  // Match template variables like {{variable_name}}
  const parts = text.split(/(\{\{[^}]+\}\})/g)

  return (
    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
      {parts.map((part, index) => {
        if (part.match(/^\{\{[^}]+\}\}$/)) {
          return (
            <span
              key={index}
              className="bg-primary/10 text-primary px-1 py-0.5 rounded font-medium"
            >
              {part}
            </span>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </pre>
  )
}

export function PromptPanel({
  stageId,
  prompt,
  originalPrompt,
  pendingPrompt,
  isEditMode,
  showDiff,
  diffMode,
  hasChanges,
  onPromptChange,
  onEditModeChange,
  onDiffModeChange,
  className,
}: PromptPanelProps) {
  const config = STAGE_CONFIG[stageId]
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Focus textarea when entering edit mode
  React.useEffect(() => {
    if (isEditMode && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditMode])

  // Insert template variable at cursor position
  const insertVariable = React.useCallback(
    (variable: string) => {
      if (!textareaRef.current) {
        onPromptChange(prompt + variable)
        return
      }

      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      const newValue = prompt.slice(0, start) + variable + prompt.slice(end)
      onPromptChange(newValue)

      // Restore cursor position after the inserted variable
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = start + variable.length
          textareaRef.current.setSelectionRange(newPosition, newPosition)
          textareaRef.current.focus()
        }
      }, 0)
    },
    [prompt, onPromptChange]
  )

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Prompt Editor Card */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-3 px-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Current Prompt</CardTitle>
              {hasChanges && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                  Modified
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isEditMode ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => onEditModeChange(!isEditMode)}
              >
                {isEditMode ? (
                  <>
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    View
                  </>
                ) : (
                  <>
                    <PencilSimple className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
          {/* Prompt content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isEditMode ? (
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="Enter stage-specific system prompt instructions..."
                className="min-h-full h-full resize-none font-mono text-sm border-0 focus-visible:ring-0 shadow-none p-0"
              />
            ) : (
              <div className="h-full">
                {prompt ? (
                  <HighlightedPrompt text={prompt} />
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    No prompt configured. Click Edit to add one.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Variable Inserter - only show in edit mode if stage has variables */}
          {isEditMode && config.templateVariables.length > 0 && (
            <div className="shrink-0 border-t px-4 py-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Insert Variable
                </span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Variables are replaced with actual values during test execution
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {config.templateVariables.map((v) => (
                  <Tooltip key={v.name}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs font-mono"
                        onClick={() => insertVariable(v.name)}
                      >
                        {v.name}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{v.description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diff Viewer */}
      {showDiff && pendingPrompt && (
        <div className="mt-4 shrink-0">
          <DiffViewer
            oldText={prompt}
            newText={pendingPrompt}
            mode={diffMode}
            onModeChange={onDiffModeChange}
            title="Pending Changes"
          />
        </div>
      )}
    </div>
  )
}

export type { PromptPanelProps }
