'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Play,
  Spinner,
  Warning,
  Check,
  Clock,
  Lightning,
  FloppyDisk,
  ArrowClockwise,
  CaretDown,
  CaretUp,
  ArrowsClockwise,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  Info,
} from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  STAGE_CONFIG,
  PROMPT_STAGES,
  type PromptStage,
  type StagePrompt,
  type StageTestResponse,
  type StageTestInput,
  type QualityScore,
  type PreviousResultsResponse,
  type StageTestInputData,
} from '@/types/prompt-studio'
import { STAGE_DEPENDENCIES, getDependencyInfo } from '@/lib/prompt-studio/stage-dependencies'
import { EvaluationPanel } from '@/components/prompt-studio/evaluation-panel'

interface PageParams {
  stage: string
}

export default function StageTestPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const stageId = resolvedParams.stage as PromptStage

  // Validate stage
  if (!PROMPT_STAGES.includes(stageId)) {
    router.replace('/admin/prompt-studio')
    return null
  }

  const config = STAGE_CONFIG[stageId]
  const depInfo = getDependencyInfo(stageId)

  // State
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stagePrompt, setStagePrompt] = useState<StagePrompt | null>(null)

  // Test inputs
  const [productName, setProductName] = useState('Galaxy Z Flip7')
  const [category, setCategory] = useState('smartphone')
  const [keywords, setKeywords] = useState('foldable, AI camera, FlexWindow, Galaxy AI')
  const [videoDescription, setVideoDescription] = useState('')
  const [srtContent, setSrtContent] = useState('')
  const [language, setLanguage] = useState<'en' | 'ko'>('en')

  // Stage-specific inputs (for stages that need previous results)
  const [usps, setUsps] = useState<string>('')
  const [previousStageResult, setPreviousStageResult] = useState<string>('')
  const [groundingData, setGroundingData] = useState<string>('')

  // Saved test inputs
  const [savedInputs, setSavedInputs] = useState<StageTestInput[]>([])
  const [selectedSavedInput, setSelectedSavedInput] = useState<string>('')

  // Previous stage results
  const [previousResults, setPreviousResults] = useState<PreviousResultsResponse | null>(null)
  const [isLoadingPreviousResults, setIsLoadingPreviousResults] = useState(false)
  const [previousResultsLoaded, setPreviousResultsLoaded] = useState(false)

  // Test result
  const [testResult, setTestResult] = useState<StageTestResponse | null>(null)
  const [showRawOutput, setShowRawOutput] = useState(false)

  // Test history
  const [testHistory, setTestHistory] = useState<StageTestResponse[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [stageId])

  const fetchInitialData = async () => {
    setIsLoading(true)
    setPreviousResultsLoaded(false)
    try {
      // Fetch stage prompt
      const promptResponse = await fetch(`/api/prompt-studio/stages/${stageId}`)
      if (promptResponse.ok) {
        const data = await promptResponse.json()
        setStagePrompt(data.stagePrompt)
      }

      // Fetch saved test inputs
      const inputsResponse = await fetch(`/api/prompt-studio/test-inputs?stage=${stageId}`)
      if (inputsResponse.ok) {
        const data = await inputsResponse.json()
        setSavedInputs(data.testInputs || [])
      }

      // Fetch previous stage results if this stage has dependencies
      if (depInfo.hasDependencies) {
        await fetchPreviousResults()
      }
    } catch (err) {
      console.error('Error fetching initial data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPreviousResults = async () => {
    setIsLoadingPreviousResults(true)
    try {
      const response = await fetch(`/api/prompt-studio/stages/${stageId}/previous-result`)
      if (response.ok) {
        const data = await response.json() as PreviousResultsResponse
        setPreviousResults(data)
      }
    } catch (err) {
      console.error('Error fetching previous results:', err)
    } finally {
      setIsLoadingPreviousResults(false)
    }
  }

  const loadPreviousResults = () => {
    if (!previousResults?.mergedInput) return

    const merged = previousResults.mergedInput

    // Apply merged input to form fields
    if (merged.productName) {
      setProductName(merged.productName as string)
    }

    if (merged.usps) {
      // Convert USPs array to JSON string for display
      setUsps(JSON.stringify(merged.usps, null, 2))
    }

    if (merged.previousStageResult) {
      // Convert to JSON string for display
      setPreviousStageResult(JSON.stringify(merged.previousStageResult, null, 2))
    }

    // For hashtags stage, also load keywords result
    if (stageId === 'hashtags' && merged.previousStageResult) {
      const prevResult = merged.previousStageResult as Record<string, unknown>
      if (prevResult.product_keywords || prevResult.generic_keywords) {
        setPreviousStageResult(JSON.stringify(merged.previousStageResult, null, 2))
      }
    }

    setPreviousResultsLoaded(true)
  }

  const loadSavedInput = (inputId: string) => {
    const saved = savedInputs.find((i) => i.id === inputId)
    if (saved && saved.input_data) {
      const data = saved.input_data as Record<string, unknown>
      setProductName((data.productName as string) || '')
      setCategory((data.category as string) || '')
      setKeywords(Array.isArray(data.keywords) ? data.keywords.join(', ') : '')
      setVideoDescription((data.videoDescription as string) || '')
      setSrtContent((data.srtContent as string) || '')
      if (data.usps) {
        setUsps(typeof data.usps === 'string' ? data.usps : JSON.stringify(data.usps, null, 2))
      }
      if (data.previousStageResult) {
        setPreviousStageResult(typeof data.previousStageResult === 'string'
          ? data.previousStageResult
          : JSON.stringify(data.previousStageResult, null, 2))
      }
      setSelectedSavedInput(inputId)
    }
  }

  const runTest = async () => {
    setIsRunning(true)
    setError(null)
    setTestResult(null)

    try {
      // Build test input based on stage requirements
      const testInput: Record<string, unknown> = {
        productName,
        category,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      }

      // Add optional fields
      if (videoDescription) testInput.videoDescription = videoDescription
      if (srtContent) testInput.srtContent = srtContent

      // Add stage-specific fields
      if (usps) {
        try {
          testInput.usps = JSON.parse(usps)
        } catch {
          testInput.usps = usps.split('\n').filter(Boolean)
        }
      }

      if (previousStageResult) {
        try {
          testInput.previousStageResult = JSON.parse(previousStageResult)
        } catch {
          testInput.previousStageResult = previousStageResult
        }
      }

      if (groundingData) {
        try {
          testInput.groundingData = JSON.parse(groundingData)
        } catch {
          testInput.groundingData = groundingData
        }
      }

      const response = await fetch(`/api/prompt-studio/stages/${stageId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stagePromptId: stagePrompt?.id,
          testInput,
          language,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Test execution failed')
      }

      const result = await response.json()
      setTestResult(result)
      setTestHistory((prev) => [result, ...prev].slice(0, 10))
    } catch (err) {
      console.error('Test error:', err)
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setIsRunning(false)
    }
  }

  const saveTestInput = async () => {
    const name = prompt('Enter a name for this test input:')
    if (!name) return

    try {
      const inputData: Record<string, unknown> = {
        productName,
        category,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      }

      if (videoDescription) inputData.videoDescription = videoDescription
      if (srtContent) inputData.srtContent = srtContent
      if (usps) {
        try {
          inputData.usps = JSON.parse(usps)
        } catch {
          inputData.usps = usps
        }
      }
      if (previousStageResult) {
        try {
          inputData.previousStageResult = JSON.parse(previousStageResult)
        } catch {
          inputData.previousStageResult = previousStageResult
        }
      }

      const response = await fetch('/api/prompt-studio/test-inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          stage: stageId,
          inputData,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSavedInputs((prev) => [data.testInput, ...prev])
      }
    } catch (err) {
      console.error('Error saving input:', err)
    }
  }

  const getGradeColor = (grade: QualityScore['grade']) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-green-600 bg-green-100'
      case 'B':
        return 'text-blue-600 bg-blue-100'
      case 'C':
        return 'text-yellow-600 bg-yellow-100'
      case 'D':
      case 'F':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/admin/prompt-studio/${stageId}`}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Editor
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>프롬프트 편집 화면으로 돌아가기</p>
            </TooltipContent>
          </Tooltip>
          <div>
            <h2 className="text-xl font-semibold">{config.label} - Test</h2>
            <p className="text-sm text-muted-foreground">Run tests with different inputs</p>
          </div>
        </div>
        {!stagePrompt && (
          <Badge variant="outline" className="text-yellow-600">
            No prompt configured - using defaults
          </Badge>
        )}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
          <CardContent className="flex items-center gap-3 py-3">
            <Warning className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Previous Stage Results Info (for dependent stages) */}
      {depInfo.hasDependencies && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-900/20">
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <LinkIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {depInfo.description}
                  </p>
                  {previousResults && (
                    <div className="flex flex-wrap gap-2">
                      {previousResults.availableStages.map((stage) => {
                        const result = previousResults.previousResults[stage]
                        return (
                          <TooltipProvider key={stage}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {STAGE_CONFIG[stage].label}
                                  {result?.qualityScore && (
                                    <span className="ml-1 opacity-70">
                                      ({result.qualityScore}점)
                                    </span>
                                  )}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Product: {result?.productName || 'N/A'}</p>
                                <p>Tested: {result?.createdAt ? formatDate(result.createdAt) : 'N/A'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      })}
                      {previousResults.missingStages.map((stage) => (
                        <TooltipProvider key={stage}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="secondary"
                                className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                {STAGE_CONFIG[stage].label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>No test result found</p>
                              <p>Run a test in {STAGE_CONFIG[stage].label} first</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadPreviousResults}
                    disabled={isLoadingPreviousResults || !previousResults?.availableStages.length}
                    className="shrink-0"
                  >
                    {isLoadingPreviousResults ? (
                      <>
                        <Spinner className="h-4 w-4 mr-1 animate-spin" />
                        Loading...
                      </>
                    ) : previousResultsLoaded ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Loaded
                      </>
                    ) : (
                      <>
                        <ArrowsClockwise className="h-4 w-4 mr-1" />
                        Load Previous Results
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>이전 단계 테스트 결과를 자동으로 불러오기</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Test Input Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Test Input</CardTitle>
                <CardDescription>Configure test parameters</CardDescription>
              </div>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={saveTestInput}>
                      <FloppyDisk className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>현재 테스트 입력값을 저장하여 재사용</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Saved Inputs Selector */}
            {savedInputs.length > 0 && (
              <div className="space-y-2">
                <Label>Load Saved Input</Label>
                <Select value={selectedSavedInput} onValueChange={loadSavedInput}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select saved input..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedInputs.map((input) => (
                      <SelectItem key={input.id} value={input.id}>
                        {input.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Input Fields */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Product Name *</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>테스트할 삼성 제품명 (예: Galaxy Z Flip7)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Galaxy Z Flip7"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Category</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>제품 카테고리 선택</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smartphone">Smartphone</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="wearable">Wearable</SelectItem>
                    <SelectItem value="tv">TV</SelectItem>
                    <SelectItem value="appliance">Appliance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Language</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>생성 결과의 언어 선택</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select value={language} onValueChange={(v: 'en' | 'ko') => setLanguage(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Keywords (comma-separated)</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>제품 관련 키워드들을 쉼표로 구분하여 입력</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., foldable, AI camera, FlexWindow"
                rows={2}
              />
            </div>

            {/* Stage-specific input fields */}
            {(stageId === 'faq' || stageId === 'case_studies') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>USPs (JSON array)</Label>
                  {previousResultsLoaded && usps && (
                    <Badge variant="outline" className="text-green-600 text-xs">
                      Auto-filled
                    </Badge>
                  )}
                </div>
                <Textarea
                  value={usps}
                  onChange={(e) => setUsps(e.target.value)}
                  placeholder='[{"feature": "FlexWindow", "user_benefit": "..."}]'
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            )}

            {(stageId === 'usp' || stageId === 'keywords' || stageId === 'hashtags') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Previous Stage Result (JSON)</Label>
                  {previousResultsLoaded && previousStageResult && (
                    <Badge variant="outline" className="text-green-600 text-xs">
                      Auto-filled
                    </Badge>
                  )}
                </div>
                <Textarea
                  value={previousStageResult}
                  onChange={(e) => setPreviousStageResult(e.target.value)}
                  placeholder='{"full_description": "...", "first_130": "..."}'
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            )}

            {(stageId === 'faq' || stageId === 'case_studies') && (
              <div className="space-y-2">
                <Label>Grounding Data (JSON, optional)</Label>
                <Textarea
                  value={groundingData}
                  onChange={(e) => setGroundingData(e.target.value)}
                  placeholder='{"sources": [...], "content": "..."}'
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>
            )}

            {(stageId === 'description' || stageId === 'chapters') && (
              <>
                <div className="space-y-2">
                  <Label>Video Description (optional)</Label>
                  <Textarea
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    placeholder="Enter video description..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>SRT Content (optional)</Label>
                  <Textarea
                    value={srtContent}
                    onChange={(e) => setSrtContent(e.target.value)}
                    placeholder="Paste SRT transcript content..."
                    rows={3}
                  />
                </div>
              </>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="w-full"
                  onClick={runTest}
                  disabled={isRunning || !productName}
                >
                  {isRunning ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2 animate-spin" />
                      Running Test...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" weight="fill" />
                      Run Test
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>현재 설정으로 프롬프트 테스트 실행</p>
              </TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>

        {/* Test Output Panel */}
        <div className="space-y-4">
          {testResult ? (
            <>
              {/* Metrics Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Test Result</CardTitle>
                    <Badge
                      className={`${getGradeColor(testResult.qualityScore.grade)} border-0`}
                    >
                      Grade: {testResult.qualityScore.grade}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{testResult.qualityScore.total}</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Lightning className="h-3 w-3" />
                        Score
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{testResult.metrics.latencyMs}ms</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        Latency
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{testResult.metrics.inputTokens}</p>
                      <p className="text-xs text-muted-foreground">Input Tokens</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{testResult.metrics.outputTokens}</p>
                      <p className="text-xs text-muted-foreground">Output Tokens</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Score Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(testResult.qualityScore.breakdown).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(value / 30) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono w-8 text-right">{value}</span>
                      </div>
                    </div>
                  ))}

                  {testResult.qualityScore.suggestions.length > 0 && (
                    <div className="pt-4 border-t space-y-2">
                      <p className="text-sm font-medium">Suggestions</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {testResult.qualityScore.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-yellow-500">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Output Content */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Output</CardTitle>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowRawOutput(!showRawOutput)}
                        >
                          {showRawOutput ? 'Show Parsed' : 'Show Raw'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{showRawOutput ? '파싱된 결과 보기' : '원본 응답 보기'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                <CardContent>
                  {showRawOutput ? (
                    <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                      {testResult.rawResponse}
                    </pre>
                  ) : (
                    <div className="space-y-4">
                      {testResult.output.first_130 && (
                        <div>
                          <p className="text-sm font-medium mb-1">First 130 Characters</p>
                          <p className="text-sm bg-muted p-3 rounded-lg">
                            {testResult.output.first_130}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {testResult.output.first_130.length} characters
                          </p>
                        </div>
                      )}
                      {testResult.output.full_description && (
                        <div>
                          <p className="text-sm font-medium mb-1">Full Description</p>
                          <div className="text-sm bg-muted p-3 rounded-lg max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                            {testResult.output.full_description}
                          </div>
                        </div>
                      )}
                      {testResult.output.usps && testResult.output.usps.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">USPs ({testResult.output.usps.length})</p>
                          <div className="space-y-2">
                            {testResult.output.usps.map((usp, i) => (
                              <div key={i} className="text-sm bg-muted p-3 rounded-lg">
                                <p className="font-medium">{usp.feature}</p>
                                <p className="text-muted-foreground">{usp.user_benefit}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {testResult.output.faqs && testResult.output.faqs.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">FAQs ({testResult.output.faqs.length})</p>
                          <div className="space-y-2">
                            {testResult.output.faqs.map((faq, i) => (
                              <div key={i} className="text-sm bg-muted p-3 rounded-lg">
                                <p className="font-medium">Q: {faq.question}</p>
                                <p className="text-muted-foreground">A: {faq.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {testResult.output.chapters && testResult.output.chapters.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Chapters ({testResult.output.chapters.length})</p>
                          <div className="space-y-1">
                            {testResult.output.chapters.map((chapter, i) => (
                              <div key={i} className="text-sm flex gap-3">
                                <span className="font-mono text-muted-foreground">{chapter.time}</span>
                                <span>{chapter.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {testResult.output.case_studies && testResult.output.case_studies.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Case Studies ({testResult.output.case_studies.length})</p>
                          <div className="space-y-2">
                            {testResult.output.case_studies.map((cs, i) => (
                              <div key={i} className="text-sm bg-muted p-3 rounded-lg">
                                <p className="font-medium">{cs.persona}</p>
                                <p className="text-muted-foreground">{cs.challenge}</p>
                                <p className="text-green-600">{cs.outcome}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {testResult.output.product_keywords && testResult.output.product_keywords.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Product Keywords</p>
                          <div className="flex flex-wrap gap-2">
                            {testResult.output.product_keywords.map((kw, i) => (
                              <Badge key={i} variant="secondary">
                                {kw.keyword}
                                {kw.frequency && <span className="ml-1 opacity-50">({kw.frequency})</span>}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {testResult.output.generic_keywords && testResult.output.generic_keywords.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Generic Keywords</p>
                          <div className="flex flex-wrap gap-2">
                            {testResult.output.generic_keywords.map((kw, i) => (
                              <Badge key={i} variant="outline">
                                {kw.keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {testResult.output.hashtags && testResult.output.hashtags.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Hashtags</p>
                          <div className="flex flex-wrap gap-2">
                            {testResult.output.hashtags.map((tag, i) => (
                              <Badge key={i} variant="secondary">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {testResult.output.parsed && !testResult.output.first_130 && !testResult.output.usps && !testResult.output.faqs && !testResult.output.hashtags && (
                        <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(testResult.output.parsed, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Evaluation Panel */}
              <EvaluationPanel
                stage={stageId}
                input={{
                  productName,
                  category,
                  keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
                  videoDescription: videoDescription || undefined,
                  srtContent: srtContent || undefined,
                } as StageTestInputData}
                output={testResult.output}
                prompt={stagePrompt?.stage_system_prompt || ''}
                testRunId={testResult.id}
              />
            </>
          ) : (
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <Play className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Run a test to see results</p>
                {depInfo.hasDependencies && previousResults?.missingStages.length && (
                  <p className="text-xs mt-2 text-yellow-600">
                    Missing: {previousResults.missingStages.map(s => STAGE_CONFIG[s].label).join(', ')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Test History */}
      {testHistory.length > 1 && (
        <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Test History</CardTitle>
                  <CardDescription>{testHistory.length} tests in this session</CardDescription>
                </div>
                {showHistory ? (
                  <CaretUp className="h-5 w-5" />
                ) : (
                  <CaretDown className="h-5 w-5" />
                )}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-2">
                  {testHistory.slice(1).map((result, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Badge className={`${getGradeColor(result.qualityScore.grade)} border-0`}>
                          {result.qualityScore.grade}
                        </Badge>
                        <span className="text-sm">Score: {result.qualityScore.total}</span>
                        <span className="text-sm text-muted-foreground">
                          {result.metrics.latencyMs}ms
                        </span>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTestResult(result)}
                          >
                            <ArrowClockwise className="h-4 w-4 mr-1" />
                            Load
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>이 테스트 결과 다시 보기</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
    </TooltipProvider>
  )
}
