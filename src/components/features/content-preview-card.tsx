'use client'

/**
 * Content Preview Card Component
 * Shows a compact preview of generated content
 * Iteration 6: Flow Improvements
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Copy,
  Check,
  CaretDown,
  CaretUp,
  YoutubeLogo,
  InstagramLogo,
  TiktokLogo,
  TextAlignLeft,
  Clock,
  Hash,
  ChatCircleText,
  Star,
  Sparkle,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { Platform } from '@/types/geo-v2'

interface ContentPreviewCardProps {
  platform: Platform
  productName: string
  description?: string
  title?: string
  timestamps?: string
  hashtags?: string[]
  score?: number
  isRefined?: boolean
  className?: string
  onCopyAll?: () => void
}

export function ContentPreviewCard({
  platform,
  productName,
  description,
  title,
  timestamps,
  hashtags = [],
  score,
  isRefined,
  className,
  onCopyAll,
}: ContentPreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const content = [
      title && `【타이틀】\n${title}`,
      description && `【설명】\n${description}`,
      timestamps && `【타임스탬프】\n${timestamps}`,
      hashtags.length > 0 && `【해시태그】\n${hashtags.join(' ')}`,
    ].filter(Boolean).join('\n\n---\n\n')

    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success('전체 콘텐츠가 복사되었습니다')
      setTimeout(() => setCopied(false), 2000)
      onCopyAll?.()
    } catch {
      toast.error('복사 실패')
    }
  }

  const getPlatformIcon = () => {
    switch (platform) {
      case 'youtube':
        return <YoutubeLogo className="h-4 w-4 text-red-500" weight="fill" />
      case 'instagram':
        return <InstagramLogo className="h-4 w-4 text-pink-500" weight="fill" />
      case 'tiktok':
        return <TiktokLogo className="h-4 w-4 text-cyan-500" weight="fill" />
    }
  }

  const getPlatformColor = () => {
    switch (platform) {
      case 'youtube':
        return 'border-l-red-500'
      case 'instagram':
        return 'border-l-pink-500'
      case 'tiktok':
        return 'border-l-cyan-500'
    }
  }

  const previewText = description?.substring(0, 120) + (description && description.length > 120 ? '...' : '')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className={cn('border-l-4 overflow-hidden', getPlatformColor())}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getPlatformIcon()}
              <div>
                <h4 className="font-semibold text-sm">{productName}</h4>
                {title && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{title}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {score && (
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3 w-3" weight="fill" />
                  {score}
                </Badge>
              )}
              {isRefined && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkle className="h-3 w-3" weight="fill" />
                  정제됨
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <CaretUp className="h-4 w-4" />
                ) : (
                  <CaretDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Collapsed Preview */}
          {!isExpanded && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                {previewText}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    복사
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Expanded Content */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 mt-2"
            >
              {title && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <TextAlignLeft className="h-3 w-3" />
                    타이틀
                  </div>
                  <p className="text-sm p-2 rounded bg-muted/50">{title}</p>
                </div>
              )}

              {description && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <TextAlignLeft className="h-3 w-3" />
                    설명
                  </div>
                  <p className="text-sm p-2 rounded bg-muted/50 max-h-32 overflow-y-auto">
                    {description}
                  </p>
                </div>
              )}

              {timestamps && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    타임스탬프
                  </div>
                  <pre className="text-xs p-2 rounded bg-muted/50 whitespace-pre-wrap">
                    {timestamps}
                  </pre>
                </div>
              )}

              {hashtags.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    해시태그
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {hashtags.slice(0, 8).map((tag, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-muted">
                        {tag}
                      </span>
                    ))}
                    {hashtags.length > 8 && (
                      <span className="text-xs text-muted-foreground">
                        +{hashtags.length - 8}개
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      전체 복사
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default ContentPreviewCard
