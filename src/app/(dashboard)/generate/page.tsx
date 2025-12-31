'use client'

import { useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useGenerationStore } from '@/store/generation-store'
import { ProductSelector } from '@/components/features/product-selector'
import { SrtInput } from '@/components/features/srt-input'
import { GenerationProgress } from '@/components/features/generation-progress'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { MOTION_VARIANTS, ICON_SIZES } from '@/lib/constants/ui'

const steps = [
  { id: 'product', label: 'Product', icon: Package },
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'keywords', label: 'Keywords', icon: Tag },
  { id: 'output', label: 'Output', icon: Export },
] as const

export default function GeneratePage() {
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

  const handleGenerate = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsGenerating(true)
    try {
      const { productName, srtContent, selectedKeywords, briefUsps } =
        useGenerationStore.getState()

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          srtContent,
          keywords: selectedKeywords,
          briefUsps,
        }),
        signal: abortControllerRef.current.signal,
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setOutput({
        description: data.description || '',
        timestamps: data.timestamps || '',
        hashtags: data.hashtags || [],
        faq: data.faq || '',
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
        <h1 className="text-xl sm:text-2xl font-bold">Generate Content</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Create optimized descriptions for YouTube and Instagram
        </p>
      </div>

      {/* Step Indicator */}
      <nav aria-label="Progress" className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <ol className="flex items-center min-w-max sm:min-w-0">
          {steps.map((s, index) => {
            const Icon = s.icon
            const isActive = s.id === step
            const isCompleted = index < currentStepIndex
            const isClickable = index <= currentStepIndex

            return (
              <li key={s.id} className="flex items-center">
                <button
                  onClick={() => isClickable && setStep(s.id)}
                  disabled={!isClickable}
                  className={cn(
                    'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all min-h-[44px]',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted && 'text-primary',
                    !isActive && !isCompleted && 'text-muted-foreground',
                    isClickable && !isActive && 'hover:bg-muted cursor-pointer',
                    !isClickable && 'cursor-not-allowed'
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all flex-shrink-0',
                      isActive && 'border-primary-foreground bg-primary-foreground/20',
                      isCompleted && 'border-primary bg-primary text-primary-foreground',
                      !isActive && !isCompleted && 'border-muted-foreground/50'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" weight="bold" />
                    ) : (
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                  </span>
                  <span className="font-medium hidden sm:inline">{s.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <CaretRight className="w-4 h-4 sm:w-5 sm:h-5 mx-1 sm:mx-2 text-muted-foreground flex-shrink-0" />
                )}
              </li>
            )
          })}
        </ol>
      </nav>

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
          Back
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
                Generating...
              </>
            ) : step === 'keywords' ? (
              <>
                Generate
                <CaretRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <CaretRight className="w-4 h-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
