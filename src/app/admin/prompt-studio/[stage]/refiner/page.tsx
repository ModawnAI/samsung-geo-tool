'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner, Warning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  RefinerFullscreen,
  loadRefinerPromptData,
  type RefinerPromptData,
} from '@/components/prompt-studio/refiner-fullscreen'
import {
  PROMPT_STAGES,
  DEFAULT_LLM_PARAMETERS,
  type PromptStage,
  type StagePrompt,
} from '@/types/prompt-studio'

interface PageParams {
  stage: string
}

export default function RefinerPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const stageId = resolvedParams.stage as PromptStage

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [promptData, setPromptData] = useState<{
    systemPrompt: string
    stagePrompt: StagePrompt | null
  } | null>(null)

  // Validate stage
  if (!PROMPT_STAGES.includes(stageId)) {
    router.replace('/admin/prompt-studio')
    return null
  }

  useEffect(() => {
    const initializePrompt = async () => {
      setIsLoading(true)
      setError(null)

      // First, try to load from session storage (passed from stage editor)
      const storedData = loadRefinerPromptData()
      if (storedData && storedData.stageId === stageId) {
        setPromptData({
          systemPrompt: storedData.systemPrompt,
          stagePrompt: storedData.stagePrompt,
        })
        setIsLoading(false)
        return
      }

      // Otherwise, fetch from API
      try {
        const response = await fetch(`/api/prompt-studio/stages/${stageId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch stage prompt')
        }
        const data = await response.json()

        let systemPrompt = ''
        let stagePrompt: StagePrompt | null = null

        if (data.stagePrompt) {
          stagePrompt = data.stagePrompt
          systemPrompt = data.stagePrompt.stage_system_prompt || ''
        } else if (data.defaultPrompt) {
          systemPrompt = data.defaultPrompt
        }

        setPromptData({ systemPrompt, stagePrompt })
      } catch (err) {
        console.error('Error fetching stage prompt:', err)
        setError(err instanceof Error ? err.message : 'Failed to load prompt')
      } finally {
        setIsLoading(false)
      }
    }

    initializePrompt()
  }, [stageId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading prompt...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Warning className="h-12 w-12 text-red-600" />
              <div>
                <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">
                  Failed to Load
                </h2>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/admin/prompt-studio/${stageId}`)}
                >
                  Back to Editor
                </Button>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!promptData) {
    return null
  }

  return (
    <RefinerFullscreen
      stageId={stageId}
      initialPrompt={promptData.systemPrompt}
      stagePrompt={promptData.stagePrompt}
    />
  )
}
