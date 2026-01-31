'use client'

/**
 * Review Page
 * Based on GEO Solution Brief Task 1 (Slide 2)
 * 
 * Provides:
 * - Mode toggle: Generate vs Review
 * - Pre-review: Content Submission Form (WIP content)
 * - Post-review: URL submission for published content
 * - Review Result Report: Pass/Fail checklist
 */

import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGenerationStore } from '@/store/generation-store'
import { 
  ReviewModeSelector, 
  ContentSubmissionForm, 
  ReviewResultReport 
} from '@/components/features/review'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  MagnifyingGlass,
  CheckCircle,
  Warning,
  ListChecks,
  FileText,
  Link as LinkIcon,
  Info,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { MOTION_VARIANTS } from '@/lib/constants/ui'
import { toast } from 'sonner'
import type { ContentSubmissionForm as ContentSubmissionFormType, ReviewResult } from '@/types/geo-v2'

export default function ReviewPage() {
  // Store state
  const reviewMode = useGenerationStore((state) => state.reviewMode)
  const setReviewMode = useGenerationStore((state) => state.setReviewMode)
  const reviewTiming = useGenerationStore((state) => state.reviewTiming)
  const setReviewTiming = useGenerationStore((state) => state.setReviewTiming)
  const contentClassification = useGenerationStore((state) => state.contentClassification)
  const setContentClassification = useGenerationStore((state) => state.setContentClassification)
  const reviewResult = useGenerationStore((state) => state.reviewResult)
  const setReviewResult = useGenerationStore((state) => state.setReviewResult)
  const isReviewing = useGenerationStore((state) => state.isReviewing)
  const setIsReviewing = useGenerationStore((state) => state.setIsReviewing)
  const platform = useGenerationStore((state) => state.platform)
  const productName = useGenerationStore((state) => state.productName)

  // Handle content submission for review
  const handleSubmitContent = useCallback(async (form: ContentSubmissionFormType) => {
    setIsReviewing(true)
    try {
      // Call review API
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          platform,
          productName,
          reviewTiming,
        }),
      })

      if (!response.ok) {
        throw new Error('Review failed')
      }

      const result = await response.json()
      setReviewResult(result as ReviewResult)
      toast.success('검수가 완료되었습니다')
    } catch (error) {
      console.error('Review error:', error)
      toast.error('검수 중 오류가 발생했습니다')
    } finally {
      setIsReviewing(false)
    }
  }, [platform, productName, reviewTiming, setIsReviewing, setReviewResult])

  // Handle export report
  const handleExportReport = useCallback(() => {
    if (!reviewResult) return
    
    const reportContent = JSON.stringify(reviewResult, null, 2)
    const blob = new Blob([reportContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `geo-review-${productName || 'report'}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('리포트가 다운로드되었습니다')
  }, [reviewResult, productName])

  // Handle retry check
  const handleRetryCheck = useCallback(() => {
    setReviewResult(null)
    toast.info('검수를 다시 시작합니다')
  }, [setReviewResult])

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <motion.div
        variants={MOTION_VARIANTS.staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Page Header */}
        <motion.div variants={MOTION_VARIANTS.staggerItem} className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MagnifyingGlass className="h-6 w-6 text-primary" weight="duotone" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">GEO 검수</h1>
              <p className="text-muted-foreground">
                콘텐츠의 GEO 최적화 상태를 검수하세요
              </p>
            </div>
          </div>
        </motion.div>

        {/* Brief Reference Info */}
        <motion.div variants={MOTION_VARIANTS.staggerItem}>
          <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-300">
                    GEO Solution Brief Task 1 기반
                  </p>
                  <div className="text-blue-600 dark:text-blue-400 space-y-1">
                    <p>• <strong>사전 검수</strong>: 게시 전 WIP 콘텐츠 최적화 검토</p>
                    <p>• <strong>사후 검수</strong>: 게시된 콘텐츠 URL 분석</p>
                    <p>• 디스크립션 카피 토날리티 검수 포함</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Review Mode Selector */}
        <motion.div variants={MOTION_VARIANTS.staggerItem}>
          <ReviewModeSelector
            mode={reviewMode}
            onModeChange={setReviewMode}
            reviewTiming={reviewTiming}
            onTimingChange={setReviewTiming}
            classification={contentClassification}
            onClassificationChange={setContentClassification}
            disabled={isReviewing}
          />
        </motion.div>

        <Separator />

        {/* Content Submission Form */}
        {reviewMode === 'review' && !reviewResult && (
          <motion.div 
            variants={MOTION_VARIANTS.staggerItem}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ContentSubmissionForm
              reviewTiming={reviewTiming}
              platform={platform}
              productName={productName || 'Galaxy S26 Ultra'}
              onSubmit={handleSubmitContent}
              isLoading={isReviewing}
            />
          </motion.div>
        )}

        {/* Review Result */}
        <AnimatePresence mode="wait">
          {reviewResult && (
            <motion.div
              key="review-result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ReviewResultReport
                result={reviewResult}
                productName={productName || 'Unknown Product'}
                onExportReport={handleExportReport}
                onRetryCheck={handleRetryCheck}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State when in generate mode */}
        {reviewMode === 'generate' && !reviewResult && (
          <motion.div 
            variants={MOTION_VARIANTS.staggerItem}
            className="text-center py-12"
          >
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-muted mb-4">
              <ListChecks className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">검수 모드를 선택하세요</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              위에서 "검수 모드"를 선택하면 콘텐츠 제출 양식이 표시됩니다.
              사전 검수는 WIP 콘텐츠를, 사후 검수는 게시된 URL을 분석합니다.
            </p>
          </motion.div>
        )}

        {/* Review Workflow Guide */}
        <motion.div variants={MOTION_VARIANTS.staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                검수 워크플로우 가이드
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pre-review */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      사전 검수
                    </Badge>
                    <span className="text-sm text-muted-foreground">Non UNPK/Event 콘텐츠</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>WIP 디스크립션 카피 (초안~최종)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>주요 제품 정보 (텍스트 & 플레이북)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>WIP 영상/이미지 (선택사항)</span>
                    </li>
                  </ul>
                </div>

                {/* Post-review */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      사후 검수
                    </Badge>
                    <span className="text-sm text-muted-foreground">UNPK/Event 신제품 콘텐츠</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <LinkIcon className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>게재된 콘텐츠 링크 제출</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>자동 메타데이터 추출 및 분석</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>보안 중요 콘텐츠에 적합</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
