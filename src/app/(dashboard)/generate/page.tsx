'use client'

import { useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useGenerationStore } from '@/store/generation-store'
import { ProductSelector } from '@/components/features/product-selector'
import { PlatformSelector } from '@/components/features/platform-selector'
import { SrtInput } from '@/components/features/srt-input'
import { GenerationProgress } from '@/components/features/generation-progress'
import { GenerationQueuePanel } from '@/components/features/generation-queue-panel'
import { StepProgressIndicator } from '@/components/features/step-progress-indicator'
import { QuickStartButton } from '@/components/features/quick-start-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load heavy components that aren't immediately visible
const KeywordSelector = dynamic(
  () => import('@/components/features/keyword-selector').then(mod => ({ default: mod.KeywordSelector })),
  {
    loading: () => <ComponentSkeleton />,
    ssr: false,
  }
)

const OutputDisplay = dynamic(
  () => import('@/components/features/output-display').then(mod => ({ default: mod.OutputDisplay })),
  {
    loading: () => <ComponentSkeleton />,
    ssr: false,
  }
)

// Loading skeleton for lazy-loaded components
function ComponentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
import {
  Package,
  FileText,
  Tag,
  Export,
  CaretRight,
  CaretLeft,
  SpinnerGap,
  Check,
  Info,
  CheckCircle,
  DeviceMobile,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { MOTION_VARIANTS, ICON_SIZES } from '@/lib/constants/ui'
import { useTranslation } from '@/lib/i18n'

type StepId = 'platform' | 'product' | 'content' | 'keywords' | 'output'

interface StepConfig {
  id: StepId
  icon: React.ElementType
}

const stepConfigs: StepConfig[] = [
  { id: 'platform', icon: DeviceMobile },
  { id: 'product', icon: Package },
  { id: 'content', icon: FileText },
  { id: 'keywords', icon: Tag },
  { id: 'output', icon: Export },
]

export default function GeneratePage() {
  const { t } = useTranslation()

  // Build steps array with translations
  const steps = stepConfigs.map(config => ({
    ...config,
    label: t.generate.steps[config.id],
    requirement: t.generate.requirements[config.id],
  }))

  // Selective Zustand subscriptions for better performance
  const step = useGenerationStore((state) => state.step)
  const setStep = useGenerationStore((state) => state.setStep)
  const productId = useGenerationStore((state) => state.productId)
  const srtContent = useGenerationStore((state) => state.srtContent)
  const selectedKeywords = useGenerationStore((state) => state.selectedKeywords)
  const isGenerating = useGenerationStore((state) => state.isGenerating)
  const setIsGenerating = useGenerationStore((state) => state.setIsGenerating)
  const setOutput = useGenerationStore((state) => state.setOutput)
  const generationStatus = useGenerationStore((state) => state.generationStatus)
  // Samsung Standard Fields (P0-3)
  const videoFormat = useGenerationStore((state) => state.videoFormat)
  const fixedHashtags = useGenerationStore((state) => state.fixedHashtags)
  const useFixedHashtags = useGenerationStore((state) => state.useFixedHashtags)

  // Multi-session queue support
  const sessionOrder = useGenerationStore((state) => state.sessionOrder)
  const hasQueuedSessions = sessionOrder.length > 0

  // AbortController for cancelable requests
  const abortControllerRef = useRef<AbortController | null>(null)

  // Unsaved work warning
  useEffect(() => {
    const hasUnsavedWork = (srtContent.trim() || selectedKeywords.length > 0) && generationStatus === 'unsaved'

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedWork) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    if (hasUnsavedWork) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [srtContent, selectedKeywords, generationStatus])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const currentStepIndex = steps.findIndex((s) => s.id === step)

  const canProceed = useCallback(() => {
    switch (step) {
      case 'platform':
        return true // Platform always has a default selection
      case 'product':
        return !!productId
      case 'content':
        return !!srtContent.trim()
      case 'keywords':
        return selectedKeywords.length > 0
      case 'output':
        return true
      default:
        return false
    }
  }, [step, productId, srtContent, selectedKeywords])

  // Execute generation
  const executeGeneration = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsGenerating(true)
    try {
      const {
        productName,
        srtContent,
        selectedKeywords,
        videoUrl,
        categoryId,
        launchDate,
        // Samsung Standard Fields (Part 5.4)
        contentType,
        videoFormat,
        fixedHashtags,
        useFixedHashtags,
        vanityLinkCode,
      } = useGenerationStore.getState()

      // Use v2 API with full GEO pipeline (RAG, Perplexity grounding, tuning)
      const response = await fetch('/api/generate-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          youtubeUrl: videoUrl || '',
          srtContent,
          keywords: selectedKeywords,
          productCategory: categoryId || 'all',
          usePlaybook: true,
          launchDate: launchDate ? (launchDate instanceof Date ? launchDate.toISOString() : launchDate) : undefined,
          pipelineConfig: 'full',
          language: 'ko',
          // Samsung Standard Fields (Part 5.4)
          contentType,
          videoFormat,
          fixedHashtags,
          useFixedHashtags,
          vanityLinkCode,
        }),
        signal: abortControllerRef.current.signal,
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Map v2 response to store format
      // V2 returns: description.full, chapters.timestamps, hashtags[], faq.faqs
      const description = typeof data.description === 'object'
        ? data.description.full
        : data.description || ''

      const timestamps = typeof data.chapters === 'object'
        ? data.chapters.timestamps
        : data.timestamps || ''

      const faqContent = data.faq?.faqs
        ? data.faq.faqs.map((f: { question: string; answer: string }) =>
            `Q: ${f.question}\nA: ${f.answer}`
          ).join('\n\n')
        : data.faq || ''

      // Build breakdown from v2 grounding metadata and USP result
      const breakdown = data.groundingMetadata ? {
        playbookInfluence: {
          sectionsUsed: data.groundingMetadata.sources
            ?.filter((s: { tier: string }) => s.tier === 'official')
            .map((s: { title: string }) => s.title)
            .slice(0, 5) || [],
          guidelinesApplied: data.groundingMetadata.sources?.length || 0,
          confidence: data.finalScore?.groundingQuality?.sourceAuthority || 70,
        },
        groundingInfluence: {
          topSignals: data.groundingMetadata.webSearchQueries?.slice(0, 5).map(
            (q: string, i: number) => ({ term: q, score: 100 - i * 15 })
          ) || [],
          signalsApplied: data.groundingMetadata.totalCitations || 0,
        },
        userInputInfluence: {
          keywordsIntegrated: selectedKeywords,
          timestampsGenerated: timestamps.split('\n').filter(Boolean).length,
        },
        qualityScores: data.finalScore ? {
          overall: Math.round(data.finalScore.total || 0),
          brandVoice: Math.round((data.finalScore.sentenceStructure || 0) * 7),
          keywordIntegration: Math.round((data.finalScore.keywordDensity || 0) * 5),
          geoOptimization: Math.round((data.finalScore.aiExposure || 0) * 4),
          faqQuality: Math.round((data.finalScore.questionPatterns || 0) * 5),
          refined: false,
        } : undefined,
      } : undefined

      setOutput({
        description,
        timestamps,
        hashtags: data.hashtags || [],
        faq: faqContent,
        breakdown,
        tuningMetadata: data.tuningMetadata,
        imageAltResult: data.imageAltResult,
      })

      setStep('output')
    } catch (error) {
      // Ignore aborted requests
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [setIsGenerating, setOutput, setStep])

  // Generation handler - AI auto-corrects to Samsung standards
  const handleGenerate = useCallback(async () => {
    await executeGeneration()
  }, [executeGeneration])

  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setStep(steps[currentStepIndex - 1].id)
    }
  }, [currentStepIndex, setStep])

  const handleNext = useCallback(async () => {
    if (step === 'keywords') {
      await handleGenerate()
    } else if (currentStepIndex < steps.length - 1) {
      setStep(steps[currentStepIndex + 1].id)
    }
  }, [step, currentStepIndex, handleGenerate, setStep])

  // Global keyboard shortcuts for step navigation
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Skip if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Alt+ArrowRight: Go to next step
      if (e.altKey && e.key === 'ArrowRight' && canProceed() && !isGenerating && step !== 'output') {
        e.preventDefault()
        handleNext()
      }

      // Alt+ArrowLeft: Go to previous step
      if (e.altKey && e.key === 'ArrowLeft' && currentStepIndex > 0) {
        e.preventDefault()
        handleBack()
      }

      // Alt+Enter: Generate (when on keywords step)
      if (e.altKey && e.key === 'Enter' && step === 'keywords' && canProceed() && !isGenerating) {
        e.preventDefault()
        handleGenerate()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, currentStepIndex, isGenerating, canProceed, handleNext, handleBack, handleGenerate])

  const renderStepContent = () => {
    // Show progress indicator during generation
    if (isGenerating) {
      return <GenerationProgress isGenerating={isGenerating} />
    }

    switch (step) {
      case 'platform':
        return <PlatformSelector />
      case 'product':
        return <ProductSelector />
      case 'content':
        return <SrtInput />
      case 'keywords':
        return <KeywordSelector />
      case 'output':
        return <OutputDisplay />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{t.generate.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          {t.generate.subtitle}
        </p>
      </div>

      {/* Quick Start - for experienced users (Iteration 4) */}
      {step === 'platform' && <QuickStartButton />}

      {/* Enhanced Step Progress Indicator */}
      <StepProgressIndicator
        steps={steps}
        currentStep={step}
        onStepClick={setStep}
        canProceed={canProceed()}
        isGenerating={isGenerating}
      />

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={MOTION_VARIANTS.slideRight}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStepIndex === 0}
          className="gap-2 w-full sm:w-auto min-h-[44px]"
        >
          <CaretLeft className="w-4 h-4" />
          {t.common.back}
        </Button>

        {step !== 'output' && (
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isGenerating}
            className="gap-2 w-full sm:w-auto min-h-[44px]"
          >
            {isGenerating ? (
              <>
                <SpinnerGap className="w-4 h-4 animate-spin" />
                {t.generate.generating}
              </>
            ) : step === 'keywords' ? (
              <>
                {t.generate.generateButton}
                <CaretRight className="w-4 h-4" />
              </>
            ) : (
              <>
                {t.common.next}
                <CaretRight className="w-4 h-4" />
              </>
            )}
          </Button>
        )}
      </div>

      {/* Generation Queue Panel - shows when there are queued sessions */}
      {hasQueuedSessions && (
        <GenerationQueuePanel
          className="mt-6"
          collapsible={true}
          defaultExpanded={true}
        />
      )}
    </div>
  )
}
