'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { useTuningStore } from '@/stores/tuning-store'
import { PromptEditor } from '@/components/tuning/prompt-manager/prompt-editor'
import { VersionHistory } from '@/components/tuning/prompt-manager/version-history'
import { TestPanel, type TestVariables, type TestResult } from '@/components/tuning/prompt-manager/test-panel'
import type { TestMode } from '@/types/tuning'
import { DiffViewer } from '@/components/tuning/prompt-manager/diff-viewer'
import type { PromptVersion, PromptFormData } from '@/types/tuning'
import {
  ArrowLeft,
  Code,
  ClockCounterClockwise,
  Flask,
  GitDiff,
  Warning,
  ArrowClockwise,
  Trash,
  CheckCircle,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

type TabValue = 'edit' | 'history' | 'test' | 'compare'

const ENGINE_COLORS: Record<string, string> = {
  gemini: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  perplexity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  cohere: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export default function PromptEditorPage({ params }: PageProps) {
  const { id: promptId } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  const {
    prompts,
    isLoading,
    error,
    fetchPrompts,
    updatePrompt,
    deletePrompt,
  } = useTuningStore()

  const [activeTab, setActiveTab] = useState<TabValue>('edit')
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [compareLeftVersion, setCompareLeftVersion] = useState<PromptVersion | null>(null)
  const [compareRightVersion, setCompareRightVersion] = useState<PromptVersion | null>(null)

  // Current prompt
  const currentPrompt = prompts.find((p) => p.id === promptId)

  // Get related versions (same engine)
  const relatedVersions = currentPrompt
    ? prompts.filter((p) => p.engine === currentPrompt.engine)
    : []

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  // Set initial compare versions when current prompt loads
  useEffect(() => {
    if (currentPrompt && !compareRightVersion) {
      setCompareRightVersion(currentPrompt)
      // Find previous version if exists
      const previousVersions = relatedVersions
        .filter((v) => v.id !== currentPrompt.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      if (previousVersions.length > 0) {
        setCompareLeftVersion(previousVersions[0])
      }
    }
  }, [currentPrompt, relatedVersions, compareRightVersion])

  const handleSave = useCallback(
    async (data: PromptFormData & { is_active?: boolean }) => {
      setIsSaving(true)
      try {
        await updatePrompt(promptId, data)
        toast({
          title: 'Prompt updated',
          description: 'Your changes have been saved successfully.',
        })
      } catch (err) {
        toast({
          title: 'Failed to save',
          description: err instanceof Error ? err.message : 'An error occurred while saving.',
          variant: 'destructive',
        })
      } finally {
        setIsSaving(false)
      }
    },
    [promptId, updatePrompt, toast]
  )

  const handleDelete = useCallback(async () => {
    try {
      await deletePrompt(promptId)
      toast({
        title: 'Prompt deleted',
        description: 'The prompt has been removed.',
      })
      router.push('/tuning/prompts')
    } catch (err) {
      toast({
        title: 'Failed to delete',
        description: err instanceof Error ? err.message : 'An error occurred.',
        variant: 'destructive',
      })
    }
  }, [promptId, deletePrompt, toast, router])

  const handleVersionSelect = useCallback(
    (version: PromptVersion) => {
      if (version.id !== promptId) {
        router.push(`/tuning/prompts/${version.id}`)
      }
    },
    [promptId, router]
  )

  const handleCompare = useCallback(
    (version1: PromptVersion, version2: PromptVersion) => {
      setCompareLeftVersion(version1)
      setCompareRightVersion(version2)
      setActiveTab('compare')
    },
    []
  )

  const handleActivate = useCallback(
    async (version: PromptVersion) => {
      try {
        await updatePrompt(version.id, { is_active: true })
        toast({
          title: 'Version activated',
          description: `${version.name} v${version.version} is now active.`,
        })
      } catch (err) {
        toast({
          title: 'Failed to activate',
          description: err instanceof Error ? err.message : 'An error occurred.',
          variant: 'destructive',
        })
      }
    },
    [updatePrompt, toast]
  )

  const handleTestPrompt = useCallback(
    async (interpolatedPrompt: string, variables: TestVariables, testMode?: TestMode): Promise<TestResult> => {
      const response = await fetch('/api/tuning/prompts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: interpolatedPrompt,
          engine: currentPrompt?.engine || 'gemini',
          variables: {
            product_name: variables.product_name,
            category: variables.category,
            usps: variables.usps,
            keywords: variables.keywords,
            competitor: variables.competitor,
            language: variables.language,
          },
          testMode: testMode || 'llm',
        }),
      })

      const data = await response.json()

      return {
        output: data.output || '',
        tokens: data.tokens || { input: 0, output: 0, total: 0 },
        latency: data.latency || 0,
        timestamp: new Date().toISOString(),
        error: data.error,
        testMode: testMode || 'llm',
        groundingResult: data.groundingResult,
      }
    },
    [currentPrompt?.engine]
  )

  // Loading state
  if (isLoading && prompts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tuning/prompts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error && !currentPrompt) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tuning/prompts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Prompt Editor</h1>
            <p className="text-muted-foreground">Edit prompt configuration</p>
          </div>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Warning className="h-12 w-12 text-destructive" weight="duotone" />
            <div className="text-center">
              <p className="font-medium text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please check your connection and try again
              </p>
            </div>
            <Button onClick={() => fetchPrompts()} variant="outline" className="gap-2">
              <ArrowClockwise className="h-4 w-4" weight="bold" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not found state
  if (!currentPrompt) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tuning/prompts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Prompt Not Found</h1>
            <p className="text-muted-foreground">The requested prompt does not exist</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Code className="h-12 w-12 text-muted-foreground" weight="duotone" />
            <div className="text-center">
              <p className="font-medium">Prompt not found</p>
              <p className="text-sm text-muted-foreground mt-1">
                This prompt may have been deleted or the ID is invalid.
              </p>
            </div>
            <Button asChild>
              <Link href="/tuning/prompts">Back to Prompts</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tuning/prompts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{currentPrompt.name}</h1>
              {currentPrompt.is_active && (
                <CheckCircle className="h-5 w-5 text-primary" weight="fill" />
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>v{currentPrompt.version}</span>
              <span className="text-muted-foreground/50">|</span>
              <Badge className={cn('text-xs', ENGINE_COLORS[currentPrompt.engine])}>
                {currentPrompt.engine}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash className="h-4 w-4 mr-2" weight="duotone" />
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="edit" className="gap-2">
            <Code className="h-4 w-4" weight="duotone" />
            <span className="hidden sm:inline">Edit</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <ClockCounterClockwise className="h-4 w-4" weight="duotone" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2">
            <Flask className="h-4 w-4" weight="duotone" />
            <span className="hidden sm:inline">Test</span>
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2">
            <GitDiff className="h-4 w-4" weight="duotone" />
            <span className="hidden sm:inline">Compare</span>
          </TabsTrigger>
        </TabsList>

        {/* Edit Tab */}
        <TabsContent value="edit" className="mt-6">
          <PromptEditor
            prompt={currentPrompt}
            onSave={handleSave}
            isSaving={isSaving}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <VersionHistory
            versions={relatedVersions}
            currentVersionId={currentPrompt.id}
            onSelect={handleVersionSelect}
            onCompare={handleCompare}
            onActivate={handleActivate}
          />
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="mt-6">
          <TestPanel
            systemPrompt={currentPrompt.system_prompt}
            engine={currentPrompt.engine}
            onTest={handleTestPrompt}
          />
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare" className="mt-6">
          <DiffViewer
            leftVersion={compareLeftVersion}
            rightVersion={compareRightVersion}
            versions={relatedVersions}
            onVersionChange={(side, version) => {
              if (side === 'left') setCompareLeftVersion(version)
              else setCompareRightVersion(version)
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{currentPrompt.name}&quot; v
              {currentPrompt.version}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
