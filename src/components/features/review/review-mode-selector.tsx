'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import {
  Sparkle,
  MagnifyingGlass,
  FileMagnifyingGlass,
  Link as LinkIcon,
} from '@phosphor-icons/react'
import type { ReviewMode, ReviewTiming, ContentClassification } from '@/types/geo-v2'

interface ReviewModeSelectorProps {
  mode: ReviewMode
  onModeChange: (mode: ReviewMode) => void
  reviewTiming: ReviewTiming
  onTimingChange: (timing: ReviewTiming) => void
  classification: ContentClassification
  onClassificationChange: (classification: ContentClassification) => void
  disabled?: boolean
}

export function ReviewModeSelector({
  mode,
  onModeChange,
  reviewTiming,
  onTimingChange,
  classification,
  onClassificationChange,
  disabled = false,
}: ReviewModeSelectorProps) {
  return (
    <Card className="border-[#040523]/10 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          검수 모드 선택
          <Badge variant="outline" className="text-xs">
            GEO Brief Task 1
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection: 생성 vs 검수 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">모드 선택</Label>
          <RadioGroup
            value={mode}
            onValueChange={(value) => onModeChange(value as ReviewMode)}
            disabled={disabled}
            className="grid grid-cols-2 gap-3"
          >
            <Label
              htmlFor="mode-generate"
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                mode === 'generate'
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-primary/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RadioGroupItem value="generate" id="mode-generate" className="sr-only" />
              <Sparkle className="h-8 w-8 text-primary" weight="duotone" />
              <span className="font-medium">생성 모드</span>
              <span className="text-xs text-muted-foreground text-center">
                새로운 콘텐츠 생성
              </span>
            </Label>
            <Label
              htmlFor="mode-review"
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                mode === 'review'
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-primary/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RadioGroupItem value="review" id="mode-review" className="sr-only" />
              <MagnifyingGlass className="h-8 w-8 text-primary" weight="duotone" />
              <span className="font-medium">검수 모드</span>
              <span className="text-xs text-muted-foreground text-center">
                기존 콘텐츠 GEO 점검
              </span>
            </Label>
          </RadioGroup>
        </div>

        {/* Review Timing Selection (only for review mode) */}
        {mode === 'review' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <Label className="text-sm font-medium">검수 시기</Label>
            <RadioGroup
              value={reviewTiming}
              onValueChange={(value) => onTimingChange(value as ReviewTiming)}
              disabled={disabled}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="timing-pre"
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  reviewTiming === 'pre'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : 'border-muted hover:border-blue-500/50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RadioGroupItem value="pre" id="timing-pre" className="sr-only" />
                <FileMagnifyingGlass className="h-6 w-6 text-blue-500" />
                <span className="font-medium text-sm">사전 검수</span>
                <span className="text-xs text-muted-foreground text-center">
                  게시 전 콘텐츠
                </span>
              </Label>
              <Label
                htmlFor="timing-post"
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  reviewTiming === 'post'
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-muted hover:border-green-500/50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RadioGroupItem value="post" id="timing-post" className="sr-only" />
                <LinkIcon className="h-6 w-6 text-green-500" />
                <span className="font-medium text-sm">사후 검수</span>
                <span className="text-xs text-muted-foreground text-center">
                  게재된 콘텐츠 링크
                </span>
              </Label>
            </RadioGroup>
          </motion.div>
        )}

        {/* Content Classification (only for review mode) */}
        {mode === 'review' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <Label className="text-sm font-medium">콘텐츠 분류</Label>
            <RadioGroup
              value={classification}
              onValueChange={(value) => onClassificationChange(value as ContentClassification)}
              disabled={disabled}
              className="space-y-2"
            >
              <div
                className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  classification === 'unpacked_event'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                    : 'border-muted'
                }`}
              >
                <RadioGroupItem value="unpacked_event" id="class-unpacked" />
                <div className="flex-1">
                  <Label htmlFor="class-unpacked" className="font-medium">
                    UNPK/Event 신제품 관련
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    보안이 중요한 언팩 행사 및 이벤트 콘텐츠 → 사후 검수 권장
                  </p>
                </div>
                {classification === 'unpacked_event' && reviewTiming !== 'post' && (
                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                    사후 검수 권장
                  </Badge>
                )}
              </div>
              <div
                className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  classification === 'non_unpacked_general'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : 'border-muted'
                }`}
              >
                <RadioGroupItem value="non_unpacked_general" id="class-general" />
                <div className="flex-1">
                  <Label htmlFor="class-general" className="font-medium">
                    Non UNPK/Event 일반
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    일반 콘텐츠 → 사전/사후 검수 모두 가능
                  </p>
                </div>
              </div>
            </RadioGroup>
          </motion.div>
        )}

        {/* Info Box */}
        {mode === 'review' && (
          <div className="p-3 rounded-lg bg-muted/50 border text-xs">
            <p className="font-medium mb-1">검수 모드 안내</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>사전 검수:</strong> WIP 디스크립션, 제품 정보, 미디어 파일 제출</li>
              <li>• <strong>사후 검수:</strong> 게재된 콘텐츠 URL만 제출</li>
              <li>• 보안이 중요한 UNPK/Event 콘텐츠는 사후 검수 권장</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
