'use client'

/**
 * Quick Copy Panel Component
 * Provides one-click copy functionality for all generated content
 * Iteration 3: UI/UX Improvements
 */

import { useState, useCallback, useMemo } from 'react'
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
  Copy,
  Check,
  TextAlignLeft,
  Clock,
  Hash,
  ChatCircleText,
  CaretDown,
  CaretUp,
  YoutubeLogo,
  InstagramLogo,
  TiktokLogo,
  Sparkle,
  CheckCircle,
  Files,
  Export,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { Platform } from '@/types/geo-v2'

interface CopyItem {
  id: string
  label: string
  icon: React.ElementType
  content: string
  description?: string
}

interface QuickCopyPanelProps {
  platform: Platform
  description?: string
  title?: string
  timestamps?: string
  hashtags?: string[]
  faq?: string
  youtubeReadyContent?: string
  instagramDescription?: string
  instagramAltText?: string
  className?: string
}

export function QuickCopyPanel({
  platform,
  description,
  title,
  timestamps,
  hashtags = [],
  faq,
  youtubeReadyContent,
  instagramDescription,
  instagramAltText,
  className,
}: QuickCopyPanelProps) {
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set())
  const [isExpanded, setIsExpanded] = useState(true)

  // Copy handler with feedback
  const handleCopy = useCallback(async (id: string, content: string, label: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedItems((prev) => new Set([...prev, id]))
      toast.success(`${label} 복사됨`, {
        icon: <Check className="h-4 w-4" weight="bold" />,
        duration: 2000,
      })
      
      // Reset copied state after 3 seconds
      setTimeout(() => {
        setCopiedItems((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 3000)
    } catch {
      toast.error('복사 실패')
    }
  }, [])

  // Copy all content
  const handleCopyAll = useCallback(async () => {
    const allContent = items
      .filter(item => item.content)
      .map(item => `【${item.label}】\n${item.content}`)
      .join('\n\n---\n\n')

    await handleCopy('all', allContent, '전체 콘텐츠')
  }, [])

  // Platform-specific items
  const items = useMemo((): CopyItem[] => {
    const baseItems: CopyItem[] = []

    if (platform === 'youtube') {
      if (title) {
        baseItems.push({
          id: 'title',
          label: '타이틀',
          icon: YoutubeLogo,
          content: title,
          description: '60자 최적화 타이틀',
        })
      }
      if (youtubeReadyContent) {
        baseItems.push({
          id: 'youtube-ready',
          label: 'YouTube 전체',
          icon: YoutubeLogo,
          content: youtubeReadyContent,
          description: '설명 + 타임스탬프 + FAQ + 해시태그',
        })
      }
      if (description) {
        baseItems.push({
          id: 'description',
          label: '설명',
          icon: TextAlignLeft,
          content: description,
        })
      }
      if (timestamps) {
        baseItems.push({
          id: 'timestamps',
          label: '타임스탬프',
          icon: Clock,
          content: timestamps,
        })
      }
    } else if (platform === 'instagram') {
      if (instagramDescription) {
        baseItems.push({
          id: 'ig-description',
          label: '캡션 (125자)',
          icon: InstagramLogo,
          content: instagramDescription,
          description: '첫 125자 최적화',
        })
      }
      if (instagramAltText) {
        baseItems.push({
          id: 'ig-alt',
          label: 'Alt Text',
          icon: InstagramLogo,
          content: instagramAltText,
          description: '150자 접근성 텍스트',
        })
      }
      if (description) {
        baseItems.push({
          id: 'description',
          label: '전체 설명',
          icon: TextAlignLeft,
          content: description,
        })
      }
    } else if (platform === 'tiktok') {
      if (description) {
        baseItems.push({
          id: 'description',
          label: '캡션',
          icon: TiktokLogo,
          content: description,
        })
      }
    }

    // Common items
    if (hashtags.length > 0) {
      baseItems.push({
        id: 'hashtags',
        label: '해시태그',
        icon: Hash,
        content: hashtags.join(' '),
        description: `${hashtags.length}개 태그`,
      })
    }
    if (faq) {
      baseItems.push({
        id: 'faq',
        label: 'FAQ',
        icon: ChatCircleText,
        content: faq,
      })
    }

    return baseItems.filter(item => item.content)
  }, [platform, title, description, timestamps, hashtags, faq, youtubeReadyContent, instagramDescription, instagramAltText])

  const copiedCount = copiedItems.size
  const totalCount = items.length

  if (items.length === 0) {
    return null
  }

  const getPlatformIcon = () => {
    switch (platform) {
      case 'youtube':
        return <YoutubeLogo className="h-5 w-5 text-red-500" weight="fill" />
      case 'instagram':
        return <InstagramLogo className="h-5 w-5 text-pink-500" weight="fill" />
      case 'tiktok':
        return <TiktokLogo className="h-5 w-5 text-cyan-500" weight="fill" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border bg-card shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          {getPlatformIcon()}
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              빠른 복사
              {copiedCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({copiedCount}/{totalCount} 복사됨)
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              클릭하여 개별 항목 복사
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            className="gap-1.5"
          >
            <Files className="h-4 w-4" />
            전체 복사
          </Button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <CaretUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <CaretDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Copy Items Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 pt-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              <TooltipProvider>
                {items.map((item) => {
                  const Icon = item.icon
                  const isCopied = copiedItems.has(item.id)

                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={() => handleCopy(item.id, item.content, item.label)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            'relative flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                            'hover:border-primary hover:bg-primary/5',
                            isCopied && 'border-green-500 bg-green-50 dark:bg-green-950/20'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {isCopied ? (
                              <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
                            ) : (
                              <Icon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <span className={cn(
                            'text-xs font-medium text-center',
                            isCopied && 'text-green-600 dark:text-green-400'
                          )}>
                            {item.label}
                          </span>
                          {item.description && (
                            <span className="text-[10px] text-muted-foreground text-center line-clamp-1">
                              {item.description}
                            </span>
                          )}

                          {/* Copy Icon Overlay */}
                          <div className={cn(
                            'absolute inset-0 flex items-center justify-center rounded-lg',
                            'bg-primary/10 opacity-0 hover:opacity-100 transition-opacity'
                          )}>
                            <Copy className="h-5 w-5 text-primary" weight="bold" />
                          </div>
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-xs line-clamp-3">{item.content.substring(0, 150)}...</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </TooltipProvider>
            </div>

            {/* Copy Progress */}
            {copiedCount > 0 && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300">
                  <Sparkle className="h-4 w-4" weight="fill" />
                  <span className="text-xs font-medium">
                    {copiedCount === totalCount ? '모든 항목이 복사되었습니다!' : `${copiedCount}개 항목 복사됨`}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default QuickCopyPanel
