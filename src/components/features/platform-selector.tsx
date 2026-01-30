'use client'

/**
 * Platform Selector Component
 * Based on GEO Strategy p.95-104
 * Allows selection of YouTube, Instagram, or TikTok
 */

import { useGenerationStore } from '@/store/generation-store'
import { PLATFORM_CONFIGS, type Platform } from '@/types/geo-v2'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Check, Youtube, Instagram, Music2, ChevronRight, Info } from 'lucide-react'

interface PlatformSelectorProps {
  onContinue?: () => void
  className?: string
}

export function PlatformSelector({ onContinue, className }: PlatformSelectorProps) {
  const platform = useGenerationStore((state) => state.platform)
  const setPlatform = useGenerationStore((state) => state.setPlatform)
  const setStep = useGenerationStore((state) => state.setStep)

  const handleSelectPlatform = (selectedPlatform: Platform) => {
    if (PLATFORM_CONFIGS[selectedPlatform].enabled) {
      setPlatform(selectedPlatform)
    }
  }

  const handleContinue = () => {
    setStep('product')
    onContinue?.()
  }

  const getPlatformIcon = (p: Platform) => {
    switch (p) {
      case 'youtube':
        return <Youtube className="h-8 w-8" />
      case 'instagram':
        return <Instagram className="h-8 w-8" />
      case 'tiktok':
        return <Music2 className="h-8 w-8" />
    }
  }

  const getPlatformColor = (p: Platform, isSelected: boolean) => {
    const colors = {
      youtube: isSelected ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-gray-200 dark:border-gray-700',
      instagram: isSelected ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/20' : 'border-gray-200 dark:border-gray-700',
      tiktok: isSelected ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20' : 'border-gray-200 dark:border-gray-700',
    }
    return colors[p]
  }

  const getPlatformIconColor = (p: Platform) => {
    const colors = {
      youtube: 'text-red-500',
      instagram: 'text-pink-500',
      tiktok: 'text-cyan-500',
    }
    return colors[p]
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">플랫폼 선택</h2>
        <p className="text-muted-foreground">
          콘텐츠를 게시할 플랫폼을 선택하세요. 플랫폼에 따라 최적화된 결과물이 생성됩니다.
        </p>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(PLATFORM_CONFIGS) as Platform[]).map((p) => {
          const config = PLATFORM_CONFIGS[p]
          const isSelected = platform === p
          const isEnabled = config.enabled

          return (
            <motion.button
              key={p}
              onClick={() => handleSelectPlatform(p)}
              disabled={!isEnabled}
              whileHover={isEnabled ? { scale: 1.02 } : {}}
              whileTap={isEnabled ? { scale: 0.98 } : {}}
              className={cn(
                'relative p-6 rounded-xl border-2 transition-all duration-200',
                'flex flex-col items-center text-center space-y-4',
                getPlatformColor(p, isSelected),
                isEnabled 
                  ? 'cursor-pointer hover:shadow-lg' 
                  : 'cursor-not-allowed opacity-50',
              )}
            >
              {/* Selected Check */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="h-4 w-4 text-primary-foreground" />
                </motion.div>
              )}

              {/* Platform Icon */}
              <div className={cn('p-3 rounded-full bg-gray-100 dark:bg-gray-800', getPlatformIconColor(p))}>
                {getPlatformIcon(p)}
              </div>

              {/* Platform Name */}
              <div>
                <h3 className="text-lg font-semibold">{config.name}</h3>
                <p className="text-sm text-muted-foreground">{config.nameKo}</p>
              </div>

              {/* Character Limits */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>첫 {config.charLimits.firstSection}자 최적화</p>
                {config.charLimits.title && <p>타이틀 {config.charLimits.title}자</p>}
                {config.charLimits.altText && <p>Alt Text {config.charLimits.altText}자</p>}
              </div>

              {/* Output Preview */}
              <div className="w-full pt-4 border-t">
                <p className="text-xs font-medium mb-2">생성 항목:</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {config.outputs.slice(0, 4).map((output) => (
                    <span
                      key={output}
                      className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800"
                    >
                      {getOutputLabel(output)}
                    </span>
                  ))}
                  {config.outputs.length > 4 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800">
                      +{config.outputs.length - 4}
                    </span>
                  )}
                </div>
              </div>

              {/* TBD Badge for TikTok */}
              {!isEnabled && (
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                    Coming Soon
                  </span>
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">GEO 최적화 가이드</p>
            <ul className="space-y-1 text-blue-600 dark:text-blue-400">
              <li>• <strong>YouTube</strong>: 타이틀 60자, 설명 첫 130자에 핵심 키워드 배치</li>
              <li>• <strong>Instagram</strong>: 설명 첫 125자에 핵심메시지 + 키워드 + CTA</li>
              <li>• <strong>TikTok</strong>: 설명 첫 125자 + 커버 텍스트 최적화 (준비 중)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex justify-center">
        <button
          onClick={handleContinue}
          className={cn(
            'flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'shadow-lg hover:shadow-xl',
          )}
        >
          다음 단계
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

/**
 * Get localized output label
 */
function getOutputLabel(output: string): string {
  const labels: Record<string, string> = {
    title: '타이틀',
    description: '설명',
    timestamps: '타임스탬프',
    hashtags: '해시태그',
    faq: 'FAQ',
    metaTags: '메타태그',
    thumbnailText: '썸네일',
    altText: 'Alt Text',
    engagementComments: '댓글',
    coverText: '커버 텍스트',
  }
  return labels[output] || output
}

export default PlatformSelector
