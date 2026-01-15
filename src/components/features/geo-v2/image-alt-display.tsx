'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ImageAltResult, ImageAltTemplate, ImageCategory } from '@/types/geo-v2'
import { IMAGE_CATEGORY_LABELS } from '@/types/geo-v2'
import {
  Image as ImageIcon,
  Copy,
  Check,
  CaretDown,
  CaretUp,
  Info,
  Translate,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface ImageAltDisplayProps {
  imageAltResult: ImageAltResult
  language?: 'ko' | 'en'
}

const CATEGORY_ICONS: Record<ImageCategory, string> = {
  front_view: '📱',
  back_view: '🔙',
  side_view: '📐',
  camera_closeup: '📷',
  display_closeup: '🖥️',
  lifestyle: '🏃',
  color_options: '🎨',
  package_contents: '📦',
  feature_highlight: '✨',
  comparison: '⚖️',
  accessories: '🎧',
}

function ImageAltCard({
  template,
  language,
}: {
  template: ImageAltTemplate
  language: 'ko' | 'en'
}) {
  const [copied, setCopied] = useState<'ko' | 'en' | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const isKorean = language === 'ko'

  const label = IMAGE_CATEGORY_LABELS[template.category]
  const icon = CATEGORY_ICONS[template.category] || '🖼️'

  const handleCopy = async (text: string, lang: 'ko' | 'en') => {
    await navigator.clipboard.writeText(text)
    setCopied(lang)
    setTimeout(() => setCopied(null), 2000)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30'
    if (score >= 60) return 'bg-amber-100 dark:bg-amber-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl" aria-hidden="true">
              {icon}
            </span>
            <div>
              <h4 className="text-sm font-medium">
                {isKorean ? label.ko : label.en}
              </h4>
              <p className="text-xs text-muted-foreground">
                {label.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className={cn(
                      'text-xs gap-1',
                      getScoreColor(template.seoScore),
                      getScoreBg(template.seoScore)
                    )}
                  >
                    SEO {template.seoScore}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isKorean ? 'SEO 최적화 점수' : 'SEO Optimization Score'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {isExpanded ? (
              <CaretUp className="h-4 w-4" />
            ) : (
              <CaretDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Korean Alt Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  🇰🇷 한국어
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {template.characterCount.ko} / 125자
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopy(template.altTextKo, 'ko')
                }}
                className="h-7 gap-1.5"
              >
                {copied === 'ko' ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {isKorean ? '복사' : 'Copy'}
              </Button>
            </div>
            <p className="text-sm bg-muted/50 p-3 rounded-lg">
              {template.altTextKo}
            </p>
          </div>

          {/* English Alt Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  🇺🇸 English
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {template.characterCount.en} / 125 chars
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopy(template.altTextEn, 'en')
                }}
                className="h-7 gap-1.5"
              >
                {copied === 'en' ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Copy
              </Button>
            </div>
            <p className="text-sm bg-muted/50 p-3 rounded-lg">
              {template.altTextEn}
            </p>
          </div>

          {/* Keywords */}
          {template.keywords && template.keywords.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                {isKorean ? '포함된 키워드' : 'Included Keywords'}
              </p>
              <div className="flex flex-wrap gap-1">
                {template.keywords.map((keyword, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Accessibility Score */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className={cn(
                      'text-xs gap-1',
                      getScoreColor(template.accessibilityScore),
                      getScoreBg(template.accessibilityScore)
                    )}
                  >
                    <Info className="h-3 w-3" />
                    {isKorean ? '접근성' : 'A11y'} {template.accessibilityScore}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isKorean
                      ? '스크린 리더 호환성 점수'
                      : 'Screen Reader Compatibility Score'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function ImageAltDisplay({ imageAltResult, language = 'ko' }: ImageAltDisplayProps) {
  const [copyAllState, setCopyAllState] = useState<'ko' | 'en' | null>(null)
  const isKorean = language === 'ko'

  if (!imageAltResult || !imageAltResult.templates || imageAltResult.templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {isKorean
            ? '이미지 Alt 텍스트 템플릿이 없습니다'
            : 'No image alt text templates available'}
        </CardContent>
      </Card>
    )
  }

  const handleCopyAll = async (lang: 'ko' | 'en') => {
    const allTexts = imageAltResult.templates
      .map((t) => {
        const label = IMAGE_CATEGORY_LABELS[t.category]
        const categoryName = lang === 'ko' ? label.ko : label.en
        const altText = lang === 'ko' ? t.altTextKo : t.altTextEn
        return `[${categoryName}]\n${altText}`
      })
      .join('\n\n')

    await navigator.clipboard.writeText(allTexts)
    setCopyAllState(lang)
    setTimeout(() => setCopyAllState(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <ImageIcon className="h-5 w-5 text-[#040523] dark:text-slate-200" weight="fill" />
              <div>
                <CardTitle className="text-base">
                  {isKorean ? '이미지 Alt 텍스트' : 'Image Alt Text'}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {imageAltResult.productName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {imageAltResult.totalTemplates} {isKorean ? '템플릿' : 'templates'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {isKorean ? '평균 SEO' : 'Avg SEO'}: {imageAltResult.metadata.avgSeoScore}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyAll('ko')}
              className="gap-1.5"
            >
              {copyAllState === 'ko' ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {isKorean ? '전체 복사 (한국어)' : 'Copy All (Korean)'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyAll('en')}
              className="gap-1.5"
            >
              {copyAllState === 'en' ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Translate className="h-4 w-4" />
              )}
              {isKorean ? '전체 복사 (영어)' : 'Copy All (English)'}
            </Button>
          </div>

          {/* Metadata */}
          {imageAltResult.metadata.uspsIncorporated.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                {isKorean ? '반영된 USP' : 'Incorporated USPs'}
              </p>
              <div className="flex flex-wrap gap-1">
                {imageAltResult.metadata.uspsIncorporated.slice(0, 5).map((usp, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {usp}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Cards */}
      <div className="space-y-3">
        {imageAltResult.templates.map((template, idx) => (
          <ImageAltCard
            key={idx}
            template={template}
            language={language}
          />
        ))}
      </div>
    </div>
  )
}
