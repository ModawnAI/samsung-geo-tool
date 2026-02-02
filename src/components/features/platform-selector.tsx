'use client'

/**
 * Platform Selector Component
 * Based on GEO Strategy p.95-104
 * Enhanced with better visual feedback and keyboard navigation
 * Iteration 2: UI/UX Improvements
 */

import { useEffect, useCallback, useMemo } from 'react'
import { useGenerationStore } from '@/store/generation-store'
import { PLATFORM_CONFIGS, type Platform } from '@/types/geo-v2'
import { cn } from '@/lib/utils'
import { featureFlags } from '@/lib/feature-flags'
import { motion, AnimatePresence } from 'framer-motion'
import {
  YoutubeLogo,
  InstagramLogo,
  TiktokLogo,
  Check,
  CaretRight,
  Info,
  Lightning,
  ArrowRight,
  Clock,
} from '@phosphor-icons/react'

interface PlatformSelectorProps {
  onContinue?: () => void
  className?: string
}

// Platform-specific configurations
const PLATFORM_DETAILS: Record<Platform, {
  gradient: string
  gradientHover: string
  iconBg: string
  borderSelected: string
  features: string[]
  bestFor: string
}> = {
  youtube: {
    gradient: 'from-red-500/10 via-red-500/5 to-transparent',
    gradientHover: 'group-hover:from-red-500/15 group-hover:via-red-500/10',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    borderSelected: 'border-red-500 ring-2 ring-red-500/20',
    features: ['SEO 최적화 타이틀', '타임스탬프 자동 생성', 'FAQ 섹션', '메타태그 추천'],
    bestFor: '검색 최적화 중심의 긴 형식 콘텐츠',
  },
  instagram: {
    gradient: 'from-pink-500/10 via-purple-500/5 to-transparent',
    gradientHover: 'group-hover:from-pink-500/15 group-hover:via-purple-500/10',
    iconBg: 'bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30',
    borderSelected: 'border-pink-500 ring-2 ring-pink-500/20',
    features: ['125자 최적화 캡션', 'Alt Text 생성', 'GEO 해시태그', '인게이지먼트 댓글'],
    bestFor: '시각적 스토리텔링과 발견 최적화',
  },
  tiktok: {
    gradient: 'from-cyan-500/10 via-pink-500/5 to-transparent',
    gradientHover: 'group-hover:from-cyan-500/15 group-hover:via-pink-500/10',
    iconBg: 'bg-gradient-to-br from-cyan-100 to-pink-100 dark:from-cyan-900/30 dark:to-pink-900/30',
    borderSelected: 'border-cyan-500 ring-2 ring-cyan-500/20',
    features: ['숏폼 캡션', '커버 텍스트', '트렌드 해시태그', '바이럴 최적화'],
    bestFor: '숏폼 바이럴 콘텐츠',
  },
}

export function PlatformSelector({ onContinue, className }: PlatformSelectorProps) {
  const platform = useGenerationStore((state) => state.platform)
  const setPlatform = useGenerationStore((state) => state.setPlatform)
  const setStep = useGenerationStore((state) => state.setStep)

  // Filter platforms based on feature flags
  const availablePlatforms = useMemo(() => {
    const all = Object.keys(PLATFORM_CONFIGS) as Platform[]
    return all.filter(p => {
      if (p === 'tiktok' && !featureFlags.tiktok) return false
      return PLATFORM_CONFIGS[p].enabled
    })
  }, [])

  // Fallback to youtube if current platform is not available
  useEffect(() => {
    if (!availablePlatforms.includes(platform)) {
      setPlatform('youtube')
    }
  }, [availablePlatforms, platform, setPlatform])

  const handleSelectPlatform = useCallback((selectedPlatform: Platform) => {
    if (availablePlatforms.includes(selectedPlatform)) {
      setPlatform(selectedPlatform)
    }
  }, [availablePlatforms, setPlatform])

  const handleContinue = useCallback(() => {
    setStep('product')
    onContinue?.()
  }, [setStep, onContinue])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const currentIndex = availablePlatforms.indexOf(platform)

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        const newIndex = currentIndex > 0 ? currentIndex - 1 : availablePlatforms.length - 1
        handleSelectPlatform(availablePlatforms[newIndex])
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        const newIndex = currentIndex < availablePlatforms.length - 1 ? currentIndex + 1 : 0
        handleSelectPlatform(availablePlatforms[newIndex])
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleContinue()
      } else {
        // Number keys select platforms by position in available list
        const keyNum = parseInt(e.key)
        if (keyNum >= 1 && keyNum <= availablePlatforms.length) {
          handleSelectPlatform(availablePlatforms[keyNum - 1])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [platform, availablePlatforms, handleSelectPlatform, handleContinue])

  const getPlatformIcon = (p: Platform, size: 'sm' | 'lg' = 'lg') => {
    const sizeClass = size === 'lg' ? 'h-10 w-10' : 'h-5 w-5'
    switch (p) {
      case 'youtube':
        return <YoutubeLogo className={sizeClass} weight="fill" />
      case 'instagram':
        return <InstagramLogo className={sizeClass} weight="fill" />
      case 'tiktok':
        return <TiktokLogo className={sizeClass} weight="fill" />
    }
  }

  const getPlatformTextColor = (p: Platform) => {
    const colors = {
      youtube: 'text-red-600 dark:text-red-400',
      instagram: 'text-pink-600 dark:text-pink-400',
      tiktok: 'text-cyan-600 dark:text-cyan-400',
    }
    return colors[p]
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold"
        >
          플랫폼 선택
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground max-w-xl mx-auto"
        >
          콘텐츠를 게시할 플랫폼을 선택하세요.
          <br className="hidden sm:block" />
          각 플랫폼의 특성에 맞게 최적화된 결과물이 생성됩니다.
        </motion.p>
      </div>

      {/* Platform Cards */}
      <div className={cn(
        "grid grid-cols-1 gap-4 lg:gap-6",
        availablePlatforms.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
      )}>
        {availablePlatforms.map((p, index) => {
          const config = PLATFORM_CONFIGS[p]
          const details = PLATFORM_DETAILS[p]
          const isSelected = platform === p
          const isEnabled = config.enabled

          return (
            <motion.button
              key={p}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelectPlatform(p)}
              disabled={!isEnabled}
              className={cn(
                'group relative overflow-hidden rounded-2xl border-2 transition-all duration-300',
                'flex flex-col text-left',
                isEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                isSelected 
                  ? details.borderSelected 
                  : 'border-border hover:border-muted-foreground/50',
                isEnabled && !isSelected && 'hover:shadow-xl hover:-translate-y-1',
              )}
            >
              {/* Background Gradient */}
              <div 
                className={cn(
                  'absolute inset-0 bg-gradient-to-br transition-all duration-300',
                  details.gradient,
                  isEnabled && details.gradientHover,
                )}
              />

              {/* Content */}
              <div className="relative p-6 space-y-5">
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div className={cn('p-3 rounded-xl', details.iconBg, getPlatformTextColor(p))}>
                    {getPlatformIcon(p)}
                  </div>
                  
                  {/* Selected Check */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center',
                          'bg-primary text-primary-foreground shadow-lg'
                        )}
                      >
                        <Check className="h-5 w-5" weight="bold" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Coming Soon Badge */}
                  {!isEnabled && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                      Coming Soon
                    </span>
                  )}
                </div>

                {/* Platform Name */}
                <div>
                  <h3 className="text-xl font-bold">{config.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{details.bestFor}</p>
                </div>

                {/* Character Limits */}
                <div className="flex flex-wrap gap-2">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
                    'bg-background/80 border',
                    getPlatformTextColor(p)
                  )}>
                    <Lightning weight="fill" className="h-3 w-3" />
                    첫 {config.charLimits.firstSection}자 최적화
                  </span>
                  {config.charLimits.title && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-background/80 border text-muted-foreground">
                      타이틀 {config.charLimits.title}자
                    </span>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    생성 항목
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {details.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Check className={cn('h-4 w-4 flex-shrink-0', getPlatformTextColor(p))} weight="bold" />
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keyboard Hint */}
                {isEnabled && (
                  <div className="text-xs text-muted-foreground/60 pt-2">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">
                      {index + 1}
                    </kbd>
                    <span className="ml-1">키로 선택</span>
                  </div>
                )}
              </div>

              {/* Selection Indicator Bar */}
              <motion.div
                className={cn('h-1 w-full', getPlatformTextColor(p).replace('text-', 'bg-'))}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: isSelected ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                style={{ transformOrigin: 'left' }}
              />
            </motion.button>
          )
        })}
      </div>

      {/* Selected Platform Quick Info */}
      <AnimatePresence mode="wait">
        <motion.div
          key={platform}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 rounded-xl bg-muted/50 border"
        >
          <div className="flex items-start gap-4">
            <div className={cn(
              'p-2 rounded-lg flex-shrink-0',
              PLATFORM_DETAILS[platform].iconBg,
              getPlatformTextColor(platform)
            )}>
              {getPlatformIcon(platform, 'sm')}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold flex items-center gap-2">
                {PLATFORM_CONFIGS[platform].name} GEO 최적화 팁
                <Info className="h-4 w-4 text-muted-foreground" />
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {platform === 'youtube' && '타이틀 첫 60자와 설명 첫 130자에 핵심 키워드를 배치하세요. 타임스탬프와 FAQ는 AI 검색 노출에 중요합니다.'}
                {platform === 'instagram' && '캡션 첫 125자에 핵심메시지, 제품명, 기능명, 브랜드명, CTA를 모두 포함하세요. Alt Text는 접근성과 검색에 필수입니다.'}
                {platform === 'tiktok' && '짧고 임팩트 있는 첫 줄이 중요합니다. 커버 텍스트는 영상 내용을 명확히 전달해야 합니다.'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>~30초</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Continue Button */}
      <motion.div 
        className="flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.button
          onClick={handleContinue}
          whileHover={{ scale: 1.02, x: 5 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'flex items-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all',
            'bg-primary text-primary-foreground',
            'shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30',
          )}
        >
          <span>다음 단계로</span>
          <ArrowRight className="h-5 w-5" weight="bold" />
        </motion.button>
      </motion.div>

      {/* Keyboard Navigation Hint */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-muted-foreground"
      >
        <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">←</kbd>
        <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] mx-1">→</kbd>
        키로 플랫폼 변경 • 
        <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] mx-1">Enter</kbd>
        로 계속
      </motion.p>
    </div>
  )
}

export default PlatformSelector
