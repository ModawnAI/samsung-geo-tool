'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from '@/components/ui/progress'
import { useGenerationStore } from '@/store/generation-store'
import {
  FileText,
  Clock,
  Hash,
  ChatCircleText,
  SpinnerGap,
  Check,
  Lightbulb,
  BookOpen,
  Tag,
  TreeStructure,
} from '@phosphor-icons/react'
import { MOTION_VARIANTS } from '@/lib/constants/ui'
import { cn } from '@/lib/utils'

interface GenerationProgressProps {
  isGenerating: boolean
}

// Actual pipeline stages matching generate-v2 API
const GENERATION_STEPS = [
  { id: 'usps', label: 'Extracting USPs', icon: Lightbulb },
  { id: 'faq', label: 'Generating FAQ', icon: ChatCircleText },
  { id: 'case-studies', label: 'Creating Case Studies', icon: BookOpen },
  { id: 'keywords', label: 'Extracting Keywords', icon: Tag },
  { id: 'hashtags', label: 'Generating Hashtags', icon: Hash },
  { id: 'description', label: 'Writing Description', icon: FileText },
  { id: 'chapters', label: 'Creating Chapters', icon: TreeStructure },
] as const

export function GenerationProgress({ isGenerating }: GenerationProgressProps) {
  // Get current generation stage from store (for future real-time updates)
  const generationStage = useGenerationStore((state) => state.generationStage)
  const setGenerationStage = useGenerationStore((state) => state.setGenerationStage)

  // Simulated step progression (until we have streaming API)
  const [simulatedStep, setSimulatedStep] = useState(0)
  const [progress, setProgress] = useState(0)

  // Use store stage if available, otherwise fall back to simulation
  const currentStep = useMemo(() => {
    if (generationStage) {
      const index = GENERATION_STEPS.findIndex(s => s.id === generationStage)
      return index >= 0 ? index : simulatedStep
    }
    return simulatedStep
  }, [generationStage, simulatedStep])

  // Simulate progress through stages with realistic timing
  useEffect(() => {
    if (!isGenerating) {
      setSimulatedStep(0)
      setProgress(0)
      setGenerationStage(null)
      return
    }

    // Each stage takes approximately 1.5-2 seconds on average
    // Total ~10-15 seconds for 7 stages
    const avgStageTime = 1800 // ms per stage
    let elapsed = 0
    let currentStageStart = 0

    const progressInterval = setInterval(() => {
      elapsed += 100
      const totalTime = GENERATION_STEPS.length * avgStageTime

      // Calculate which stage we should be on
      const stageIndex = Math.min(
        Math.floor(elapsed / avgStageTime),
        GENERATION_STEPS.length - 1
      )

      // Update stage if changed
      if (stageIndex !== simulatedStep) {
        setSimulatedStep(stageIndex)
        setGenerationStage(GENERATION_STEPS[stageIndex].id)
        currentStageStart = elapsed
      }

      // Calculate overall progress (cap at 95%)
      const overallProgress = Math.min(95, (elapsed / totalTime) * 100)
      setProgress(overallProgress)

    }, 100)

    return () => clearInterval(progressInterval)
  }, [isGenerating, setGenerationStage, simulatedStep])

  if (!isGenerating) return null

  return (
    <AnimatePresence>
      <motion.div
        variants={MOTION_VARIANTS.staggerContainer}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="space-y-6 py-8"
        role="status"
        aria-live="polite"
        aria-label={`Generating content: ${GENERATION_STEPS[currentStep]?.label || 'Complete'}, ${Math.round(progress)}% complete`}
      >
        {/* Progress bar */}
        <motion.div variants={MOTION_VARIANTS.staggerItem} className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            {Math.round(progress)}% complete
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div variants={MOTION_VARIANTS.staggerItem} className="space-y-3">
          {GENERATION_STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: isActive || isCompleted ? 1 : 0.5,
                  x: 0
                }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-colors',
                  isActive && 'bg-primary/5 border border-primary/20',
                  isCompleted && 'text-muted-foreground'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted && 'bg-green-500 text-white',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" weight="bold" />
                  ) : isActive ? (
                    <SpinnerGap className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'font-medium',
                    isActive && 'text-primary',
                    isCompleted && 'line-through'
                  )}
                >
                  {step.label}
                </span>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Helpful message */}
        <motion.p
          variants={MOTION_VARIANTS.staggerItem}
          className="text-sm text-muted-foreground text-center"
        >
          This usually takes 10-15 seconds. Please don&apos;t close this page.
        </motion.p>
      </motion.div>
    </AnimatePresence>
  )
}
