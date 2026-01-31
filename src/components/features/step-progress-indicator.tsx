'use client'

/**
 * Step Progress Indicator Component
 * Enhanced visual hierarchy for the generation wizard
 * Iteration 1: UI/UX Improvements
 */

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Check,
  Lightning,
} from '@phosphor-icons/react'
import type { GenerationStep } from '@/store/generation-store'

interface Step {
  id: GenerationStep
  label: string
  requirement?: string
  icon: React.ElementType
}

interface StepProgressIndicatorProps {
  steps: Step[]
  currentStep: GenerationStep
  onStepClick: (stepId: GenerationStep) => void
  canProceed: boolean
  isGenerating?: boolean
  className?: string
}

export function StepProgressIndicator({
  steps,
  currentStep,
  onStepClick,
  canProceed,
  isGenerating = false,
  className,
}: StepProgressIndicatorProps) {
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)
  const progressPercentage = ((currentStepIndex + (canProceed ? 1 : 0.5)) / steps.length) * 100

  return (
    <div className={cn('space-y-3', className)}>
      {/* Overall Progress Bar */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            단계 {currentStepIndex + 1} / {steps.length}
          </span>
          <span className="text-sm font-medium text-primary">
            {Math.round(progressPercentage)}% 완료
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <nav aria-label="Progress" className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <ol className="flex items-center justify-between min-w-max sm:min-w-0 relative">
          {/* Connecting Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted hidden sm:block" />
          <motion.div
            className="absolute top-5 left-0 h-0.5 bg-primary hidden sm:block"
            initial={{ width: 0 }}
            animate={{
              width: `${(currentStepIndex / (steps.length - 1)) * 100}%`,
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />

          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = step.id === currentStep
            const isCompleted = index < currentStepIndex
            const isClickable = index <= currentStepIndex
            const isNext = index === currentStepIndex + 1

            return (
              <li key={step.id} className="relative flex flex-col items-center z-10">
                <button
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable || isGenerating}
                  className={cn(
                    'group flex flex-col items-center gap-2 transition-all',
                    isClickable && !isActive && !isGenerating && 'cursor-pointer',
                    (!isClickable || isGenerating) && 'cursor-not-allowed'
                  )}
                >
                  {/* Step Circle */}
                  <motion.div
                    className={cn(
                      'relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all',
                      isActive && 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25',
                      isCompleted && 'border-primary bg-primary text-primary-foreground',
                      isNext && 'border-primary/50 bg-primary/10 text-primary',
                      !isActive && !isCompleted && !isNext && 'border-muted-foreground/30 bg-background text-muted-foreground'
                    )}
                    whileHover={isClickable && !isGenerating ? { scale: 1.1 } : {}}
                    whileTap={isClickable && !isGenerating ? { scale: 0.95 } : {}}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 sm:w-6 sm:h-6" weight="bold" />
                    ) : isGenerating && isActive ? (
                      <Lightning className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" weight="fill" />
                    ) : (
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" weight={isActive ? 'fill' : 'regular'} />
                    )}

                    {/* Active Pulse Ring */}
                    {isActive && !isGenerating && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-primary"
                        initial={{ scale: 1, opacity: 1 }}
                        animate={{ scale: 1.3, opacity: 0 }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeOut',
                        }}
                      />
                    )}

                    {/* Generating Animation */}
                    {isActive && isGenerating && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-primary"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        style={{
                          borderTopColor: 'transparent',
                          borderRightColor: 'transparent',
                        }}
                      />
                    )}
                  </motion.div>

                  {/* Step Label */}
                  <div className="text-center">
                    <span
                      className={cn(
                        'text-xs sm:text-sm font-medium transition-colors',
                        isActive && 'text-primary',
                        isCompleted && 'text-foreground',
                        !isActive && !isCompleted && 'text-muted-foreground'
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Current Step Requirement */}
      {steps[currentStepIndex]?.requirement && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm',
            canProceed
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
          )}
        >
          {canProceed ? (
            <Check className="h-4 w-4" weight="bold" />
          ) : (
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
          <span>
            {canProceed ? '다음 단계로 진행할 수 있습니다' : steps[currentStepIndex].requirement}
          </span>
        </motion.div>
      )}
    </div>
  )
}

export default StepProgressIndicator
