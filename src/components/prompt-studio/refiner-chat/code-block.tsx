'use client'

import { useState } from 'react'
import { Copy, Check, ArrowSquareOut } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  onApply?: (code: string) => void
  className?: string
}

export function CodeBlock({ code, onApply, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Truncate display if too long
  const displayCode = code.length > 500 ? code.slice(0, 500) + '\n...' : code
  const lineCount = code.split('\n').length

  return (
    <div className={cn('relative group rounded-lg border bg-muted/50', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <span className="text-xs text-muted-foreground font-medium">
          Improved Prompt ({lineCount} lines)
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-xs"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </>
            )}
          </Button>
          {onApply && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onApply(code)}
              className="h-7 px-2 text-xs"
            >
              <ArrowSquareOut className="h-3.5 w-3.5 mr-1" />
              Apply
            </Button>
          )}
        </div>
      </div>

      {/* Code content */}
      <pre className="p-3 text-xs font-mono overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words">
        {displayCode}
      </pre>

      {/* Show expand hint if truncated */}
      {code.length > 500 && (
        <div className="px-3 py-2 border-t text-xs text-muted-foreground text-center bg-muted/30">
          Showing first 500 characters. Use Copy to get full prompt.
        </div>
      )}
    </div>
  )
}
