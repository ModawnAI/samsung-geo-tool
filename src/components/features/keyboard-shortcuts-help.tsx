'use client'

/**
 * Keyboard Shortcuts Help Component
 * Shows available keyboard shortcuts in a modal
 * Iteration 5: Flow Improvements
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Keyboard,
  ArrowRight,
  ArrowLeft,
  Command,
  ArrowElbowDownRight,
} from '@phosphor-icons/react'

interface Shortcut {
  keys: string[]
  description: string
  context?: string
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: ['Alt', '→'], description: '다음 단계로 이동', context: '플랫폼 → 키워드 단계' },
  { keys: ['Alt', '←'], description: '이전 단계로 이동', context: '모든 단계' },
  { keys: ['Alt', 'Enter'], description: '콘텐츠 생성 시작', context: '키워드 단계에서' },
  
  // Platform selection
  { keys: ['1'], description: 'YouTube 선택', context: '플랫폼 단계' },
  { keys: ['2'], description: 'Instagram 선택', context: '플랫폼 단계' },
  { keys: ['3'], description: 'TikTok 선택', context: '플랫폼 단계 (준비 중)' },
  { keys: ['Enter'], description: '다음 단계로 계속', context: '플랫폼 단계' },
  
  // General
  { keys: ['?'], description: '키보드 단축키 도움말 표시', context: '언제든지' },
  { keys: ['Escape'], description: '모달 닫기', context: '모달 열림 시' },
]

interface KeyboardShortcutsHelpProps {
  className?: string
}

export function KeyboardShortcutsHelp({ className }: KeyboardShortcutsHelpProps) {
  const [open, setOpen] = useState(false)

  // Global ? key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-2 text-muted-foreground', className)}
        >
          <Keyboard className="h-4 w-4" />
          <span className="hidden sm:inline">단축키</span>
          <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">?</kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            키보드 단축키
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Navigation Section */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">탐색</h4>
            <div className="space-y-2">
              {SHORTCUTS.filter(s => s.keys.includes('Alt') || s.keys.includes('Enter') && s.context?.includes('플랫폼')).map((shortcut, i) => (
                <ShortcutRow key={i} shortcut={shortcut} />
              ))}
            </div>
          </div>

          {/* Platform Selection Section */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">플랫폼 선택</h4>
            <div className="space-y-2">
              {SHORTCUTS.filter(s => ['1', '2', '3'].includes(s.keys[0])).map((shortcut, i) => (
                <ShortcutRow key={i} shortcut={shortcut} />
              ))}
            </div>
          </div>

          {/* General Section */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">일반</h4>
            <div className="space-y-2">
              {SHORTCUTS.filter(s => s.keys[0] === '?' || s.keys[0] === 'Escape').map((shortcut, i) => (
                <ShortcutRow key={i} shortcut={shortcut} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <p>💡 팁: 텍스트 입력 중에는 단축키가 비활성화됩니다.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="flex-1">
        <p className="text-sm">{shortcut.description}</p>
        {shortcut.context && (
          <p className="text-xs text-muted-foreground">{shortcut.context}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((key, i) => (
          <span key={i} className="flex items-center gap-1">
            <Kbd>{key}</Kbd>
            {i < shortcut.keys.length - 1 && (
              <span className="text-xs text-muted-foreground">+</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-mono font-medium rounded border bg-muted">
      {children}
    </kbd>
  )
}

/**
 * Floating Keyboard Hint - shows at bottom of page
 */
export function KeyboardHint({ className }: { className?: string }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Hide after 10 seconds
    const timer = setTimeout(() => setVisible(false), 10000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={cn(
          'fixed bottom-4 left-1/2 -translate-x-1/2',
          'flex items-center gap-2 px-4 py-2 rounded-full',
          'bg-background/80 backdrop-blur border shadow-lg',
          'text-xs text-muted-foreground',
          className
        )}
      >
        <Keyboard className="h-4 w-4" />
        <span>
          <kbd className="px-1.5 py-0.5 font-mono bg-muted rounded text-[10px]">?</kbd>
          {' '}키로 단축키 확인
        </span>
        <button
          onClick={() => setVisible(false)}
          className="ml-2 text-muted-foreground/50 hover:text-muted-foreground"
        >
          ✕
        </button>
      </motion.div>
    </AnimatePresence>
  )
}

export default KeyboardShortcutsHelp
