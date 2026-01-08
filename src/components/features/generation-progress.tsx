'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from '@/components/ui/progress'
import { useGenerationStore } from '@/store/generation-store'
import {
  FileText,
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

// Actual pipeline stages matching generate-v2 API execution order
const GENERATION_STEPS = [
  { id: 'description', label: '설명 작성 중', icon: FileText },
  { id: 'usps', label: 'USP 추출 중', icon: Lightbulb },
  { id: 'chapters', label: '챕터 생성 중', icon: TreeStructure },
  { id: 'faq', label: 'FAQ 생성 중', icon: ChatCircleText },
  { id: 'case-studies', label: '활용 사례 생성 중', icon: BookOpen },
  { id: 'keywords', label: '키워드 추출 중', icon: Tag },
  { id: 'hashtags', label: '해시태그 생성 중', icon: Hash },
] as const

export function GenerationProgress({ isGenerating }: GenerationProgressProps) {
  // Get current generation stage from store (for future real-time updates)
  const generationStage = useGenerationStore((state) => state.generationStage)
  const setGenerationStage = useGenerationStore((state) => state.setGenerationStage)

  // Simulated step progression (until we have streaming API)
  const [simulatedStep, setSimulatedStep] = useState(0)
  const [progress, setProgress] = useState(0)

  // Use ref to track start time and previous step to avoid dependency issues
  const startTimeRef = useRef<number | null>(null)
  const prevStepRef = useRef(0)

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
      startTimeRef.current = null
      prevStepRef.current = 0
      return
    }

    // Initialize start time on first run
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now()
    }

    // Each stage takes approximately 8 seconds on average (pipeline takes ~55s total)
    // Total ~56 seconds for 7 stages
    const avgStageTime = 8000 // ms per stage
    const totalTime = GENERATION_STEPS.length * avgStageTime

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - (startTimeRef.current ?? Date.now())

      // Calculate which stage we should be on
      const stageIndex = Math.min(
        Math.floor(elapsed / avgStageTime),
        GENERATION_STEPS.length - 1
      )

      // Update stage if changed (use ref to avoid closure issues)
      if (stageIndex !== prevStepRef.current) {
        prevStepRef.current = stageIndex
        setSimulatedStep(stageIndex)
        setGenerationStage(GENERATION_STEPS[stageIndex].id)
      }

      // Calculate overall progress (cap at 95%)
      const overallProgress = Math.min(95, (elapsed / totalTime) * 100)
      setProgress(overallProgress)

    }, 100)

    return () => clearInterval(progressInterval)
  }, [isGenerating, setGenerationStage]) // Removed simulatedStep from deps!

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
        aria-label={`콘텐츠 생성 중: ${GENERATION_STEPS[currentStep]?.label || '완료'}, ${Math.round(progress)}% 완료`}
      >
        {/* Progress bar */}
        <motion.div variants={MOTION_VARIANTS.staggerItem} className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            {Math.round(progress)}% 완료
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
                  isActive && 'bg-[#040523]/5 dark:bg-[#040523]/20 border border-[#040523]/20 dark:border-slate-600',
                  isCompleted && 'text-muted-foreground'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full',
                    isActive && 'bg-[#040523] dark:bg-slate-200 text-white dark:text-[#040523]',
                    isCompleted && 'bg-[#040523]/70 dark:bg-slate-400 text-white dark:text-[#040523]',
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
                    isActive && 'text-[#040523] dark:text-slate-200',
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
          보통 50-60초 정도 소요됩니다. 페이지를 닫지 마세요.
        </motion.p>
      </motion.div>
    </AnimatePresence>
  )
}
