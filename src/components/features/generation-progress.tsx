'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from '@/components/ui/progress'
import {
  FileText,
  Clock,
  Hash,
  ChatCircleText,
  SpinnerGap,
  Check,
} from '@phosphor-icons/react'
import { MOTION_VARIANTS } from '@/lib/constants/ui'
import { cn } from '@/lib/utils'

interface GenerationProgressProps {
  isGenerating: boolean
}

const GENERATION_STEPS = [
  { id: 'analyze', label: 'Analyzing content', icon: FileText, duration: 2000 },
  { id: 'description', label: 'Generating description', icon: FileText, duration: 3000 },
  { id: 'timestamps', label: 'Creating timestamps', icon: Clock, duration: 2000 },
  { id: 'hashtags', label: 'Generating hashtags', icon: Hash, duration: 1500 },
  { id: 'faq', label: 'Preparing FAQ', icon: ChatCircleText, duration: 1500 },
] as const

export function GenerationProgress({ isGenerating }: GenerationProgressProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isGenerating) {
      setCurrentStep(0)
      setProgress(0)
      return
    }

    // Simulate progress through steps
    let stepIndex = 0
    let stepProgress = 0
    const totalDuration = GENERATION_STEPS.reduce((sum, step) => sum + step.duration, 0)
    let elapsedDuration = 0

    const progressInterval = setInterval(() => {
      if (stepIndex >= GENERATION_STEPS.length) {
        clearInterval(progressInterval)
        return
      }

      stepProgress += 100
      elapsedDuration += 100

      // Calculate overall progress (cap at 95% to leave room for actual completion)
      const overallProgress = Math.min(95, (elapsedDuration / totalDuration) * 100)
      setProgress(overallProgress)

      // Move to next step when current step duration is reached
      const currentStepDuration = GENERATION_STEPS[stepIndex].duration
      if (stepProgress >= currentStepDuration) {
        stepIndex++
        stepProgress = 0
        setCurrentStep(stepIndex)
      }
    }, 100)

    return () => clearInterval(progressInterval)
  }, [isGenerating])

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
