'use client'

/**
 * Quick Start Button Component
 * Enables experienced users to quickly restart with previous settings
 * Iteration 4: Flow Improvements
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Lightning,
  Clock,
  ArrowRight,
  YoutubeLogo,
  InstagramLogo,
  TiktokLogo,
  X,
} from '@phosphor-icons/react'
import { getQuickStartSuggestion, isExperiencedUser } from '@/lib/smart-defaults'
import { useGenerationStore } from '@/store/generation-store'
import type { Platform } from '@/types/geo-v2'

interface QuickStartButtonProps {
  className?: string
  onQuickStart?: () => void
}

export function QuickStartButton({ className, onQuickStart }: QuickStartButtonProps) {
  const [suggestion, setSuggestion] = useState<ReturnType<typeof getQuickStartSuggestion> | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  
  const setPlatform = useGenerationStore((state) => state.setPlatform)
  const setCategory = useGenerationStore((state) => state.setCategory)
  const setProduct = useGenerationStore((state) => state.setProduct)
  const setContentType = useGenerationStore((state) => state.setContentType)
  const setStep = useGenerationStore((state) => state.setStep)

  useEffect(() => {
    // Load suggestion on mount (client-side only)
    const s = getQuickStartSuggestion()
    setSuggestion(s)
  }, [])

  if (!suggestion?.available || isDismissed) {
    return null
  }

  const handleQuickStart = () => {
    if (suggestion.platform) {
      setPlatform(suggestion.platform)
    }
    if (suggestion.categoryId) {
      setCategory(suggestion.categoryId)
    }
    // Skip to content step
    setStep('content')
    onQuickStart?.()
  }

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'youtube':
        return <YoutubeLogo className="h-4 w-4 text-red-500" weight="fill" />
      case 'instagram':
        return <InstagramLogo className="h-4 w-4 text-pink-500" weight="fill" />
      case 'tiktok':
        return <TiktokLogo className="h-4 w-4 text-cyan-500" weight="fill" />
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'relative flex items-center gap-3 p-4 rounded-xl',
          'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent',
          'border border-primary/20',
          className
        )}
      >
        {/* Dismiss Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <Lightning className="h-5 w-5 text-primary" weight="fill" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            빠른 시작
            {suggestion.platform && getPlatformIcon(suggestion.platform)}
          </h4>
          <p className="text-xs text-muted-foreground">
            이전 설정으로 바로 콘텐츠 입력 단계로 이동합니다
          </p>
        </div>

        {/* Action */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleQuickStart}
                size="sm"
                className="gap-2 shrink-0"
              >
                <span className="hidden sm:inline">바로 시작</span>
                <ArrowRight className="h-4 w-4" weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>이전 설정으로 콘텐츠 입력 단계로 이동</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Usage Stats Badge - shows in settings or footer
 */
export function UsageStatsBadge() {
  const [isExperienced, setIsExperienced] = useState(false)

  useEffect(() => {
    setIsExperienced(isExperiencedUser())
  }, [])

  if (!isExperienced) return null

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
      <Clock className="h-3 w-3" />
      경험 있는 사용자
    </span>
  )
}

export default QuickStartButton
