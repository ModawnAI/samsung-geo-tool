'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Play,
  Spinner,
  Warning,
  Check,
  Clock,
  Lightning,
  ArrowsClockwise,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  STAGE_CONFIG,
  type PromptStage,
  type StagePrompt,
  type StageTestResponse,
  type QualityScore,
  type PreviousResultsResponse,
  type StageTestInputData,
} from '@/types/prompt-studio'
import { getDependencyInfo } from '@/lib/prompt-studio/stage-dependencies'
import { EvaluationPanel } from '@/components/prompt-studio/evaluation-panel'

interface StageTestPanelProps {
  stage: PromptStage
  stagePrompt: StagePrompt | null
  language: 'ko' | 'en'
}

export function StageTestPanel({ stage, stagePrompt, language }: StageTestPanelProps) {
  const config = STAGE_CONFIG[stage]
  const depInfo = getDependencyInfo(stage)

  // State
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Test inputs
  const [productName, setProductName] = useState('Galaxy Z Flip7')
  const [category, setCategory] = useState('smartphone')
  const [keywords, setKeywords] = useState('foldable, AI camera, FlexWindow, Galaxy AI')
  const [videoDescription, setVideoDescription] = useState('')
  const [srtContent, setSrtContent] = useState('')
  const [testLanguage, setTestLanguage] = useState<'en' | 'ko'>('en')

  // Stage-specific inputs
  const [usps, setUsps] = useState<string>('')
  const [previousStageResult, setPreviousStageResult] = useState<string>('')
  const [groundingData, setGroundingData] = useState<string>('')

  // Previous stage results
  const [previousResults, setPreviousResults] = useState<PreviousResultsResponse | null>(null)
  const [isLoadingPreviousResults, setIsLoadingPreviousResults] = useState(false)
  const [previousResultsLoaded, setPreviousResultsLoaded] = useState(false)

  // Test result
  const [testResult, setTestResult] = useState<StageTestResponse | null>(null)
  const [showRawOutput, setShowRawOutput] = useState(false)
  const [showScoreDetails, setShowScoreDetails] = useState(true)

  useEffect(() => {
    // Fetch and auto-load previous stage results if this stage has dependencies
    if (depInfo.hasDependencies) {
      fetchAndAutoLoad()
    }
  }, [stage, depInfo.hasDependencies])

  const fetchAndAutoLoad = async () => {
    setIsLoadingPreviousResults(true)
    setPreviousResultsLoaded(false)
    try {
      const response = await fetch(`/api/prompt-studio/stages/${stage}/previous-result`)
      if (response.ok) {
        const data = (await response.json()) as PreviousResultsResponse
        setPreviousResults(data)
        // Auto-load results into form fields
        if (data.availableStages.length > 0 && data.mergedInput) {
          autoLoadResults(data)
        }
      }
    } catch (err) {
      console.error('Error fetching previous results:', err)
    } finally {
      setIsLoadingPreviousResults(false)
    }
  }

  const autoLoadResults = (data: PreviousResultsResponse) => {
    const merged = data.mergedInput
    if (merged.productName) setProductName(merged.productName as string)
    if (merged.usps) setUsps(JSON.stringify(merged.usps, null, 2))
    if (merged.previousStageResult) setPreviousStageResult(JSON.stringify(merged.previousStageResult, null, 2))
    if (stage === 'hashtags' && merged.previousStageResult) {
      const prevResult = merged.previousStageResult as Record<string, unknown>
      if (prevResult.product_keywords || prevResult.generic_keywords) {
        setPreviousStageResult(JSON.stringify(merged.previousStageResult, null, 2))
      }
    }
    setPreviousResultsLoaded(true)
  }

  const runTest = async () => {
    setIsRunning(true)
    setError(null)
    setTestResult(null)

    try {
      const testInput: Record<string, unknown> = {
        productName,
        category,
        keywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      }

      if (videoDescription) testInput.videoDescription = videoDescription
      if (srtContent) testInput.srtContent = srtContent

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

      const response = await fetch(`/api/prompt-studio/stages/${stage}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stagePromptId: stagePrompt?.id,
          testInput,
          language: testLanguage,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Test execution failed')
      }

      const result = await response.json()
      setTestResult(result)
    } catch (err) {
      console.error('Test error:', err)
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setIsRunning(false)
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
    return new Date(dateStr).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Previous Stage Results Info */}
        {depInfo.hasDependencies && (
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-900/20">
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <LinkIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {depInfo.description}
                    </p>
                    {previousResults && (
                      <div className="flex flex-wrap gap-2">
                        {previousResults.availableStages.map((s) => {
                          const result = previousResults.previousResults[s]
                          return (
                            <Tooltip key={s}>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {STAGE_CONFIG[s].label}
                                  {result?.qualityScore && (
                                    <span className="ml-1 opacity-70">
                                      ({result.qualityScore}점)
                                    </span>
                                  )}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Product: {result?.productName || 'N/A'}</p>
                                <p>
                                  Tested: {result?.createdAt ? formatDate(result.createdAt) : 'N/A'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )
                        })}
                        {previousResults.missingStages.map((s) => (
                          <Tooltip key={s}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="secondary"
                                className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                {STAGE_CONFIG[s].label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>No test result found</p>
                              <p>Run a test in {STAGE_CONFIG[s].label} first</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isLoadingPreviousResults ? (
                    <Badge variant="secondary" className="text-xs">
                      <Spinner className="h-3 w-3 mr-1 animate-spin" />
                      {language === 'ko' ? '로딩...' : 'Loading...'}
                    </Badge>
                  ) : previousResultsLoaded ? (
                    <Badge variant="secondary" className="text-xs text-green-600">
                      <Check className="h-3 w-3 mr-1" />
                      {language === 'ko' ? '자동 로드됨' : 'Auto-loaded'}
                    </Badge>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchAndAutoLoad()}
                          disabled={isLoadingPreviousResults}
                          className="h-7 text-xs"
                        >
                          <ArrowsClockwise className="h-3 w-3 mr-1" />
                          {language === 'ko' ? '다시 로드' : 'Reload'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {language === 'ko'
                            ? '이전 단계 테스트 결과를 다시 불러오기'
                            : 'Reload previous stage test results'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
            <CardContent className="flex items-center gap-3 py-3">
              <Warning className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Test Input */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">
                {language === 'ko' ? '테스트 입력' : 'Test Input'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Product Name */}
              <div className="space-y-1">
                <Label className="text-xs">
                  {language === 'ko' ? '제품명' : 'Product Name'} *
                </Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g., Galaxy Z Flip7"
                  className="h-8 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Category */}
                <div className="space-y-1">
                  <Label className="text-xs">{language === 'ko' ? '카테고리' : 'Category'}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-8 text-sm">
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

                {/* Language */}
                <div className="space-y-1">
                  <Label className="text-xs">{language === 'ko' ? '언어' : 'Language'}</Label>
                  <Select
                    value={testLanguage}
                    onValueChange={(v: 'en' | 'ko') => setTestLanguage(v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ko">Korean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Keywords */}
              <div className="space-y-1">
                <Label className="text-xs">{language === 'ko' ? '키워드' : 'Keywords'}</Label>
                <Textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="foldable, AI camera, FlexWindow"
                  rows={2}
                  className="text-sm"
                />
              </div>

              {/* Stage-specific fields */}
              {(stage === 'faq' || stage === 'case_studies') && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">USPs (JSON)</Label>
                    {previousResultsLoaded && usps && (
                      <Badge variant="outline" className="text-green-600 text-[10px]">
                        Auto-filled
                      </Badge>
                    )}
                  </div>
                  <Textarea
                    value={usps}
                    onChange={(e) => setUsps(e.target.value)}
                    placeholder='[{"feature": "FlexWindow", "user_benefit": "..."}]'
                    rows={3}
                    className="font-mono text-xs"
                  />
                </div>
              )}

              {(stage === 'usp' || stage === 'keywords' || stage === 'hashtags') && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">
                      {language === 'ko' ? '이전 단계 결과' : 'Previous Stage Result'} (JSON)
                    </Label>
                    {previousResultsLoaded && previousStageResult && (
                      <Badge variant="outline" className="text-green-600 text-[10px]">
                        Auto-filled
                      </Badge>
                    )}
                  </div>
                  <Textarea
                    value={previousStageResult}
                    onChange={(e) => setPreviousStageResult(e.target.value)}
                    placeholder='{"full_description": "...", "first_130": "..."}'
                    rows={3}
                    className="font-mono text-xs"
                  />
                </div>
              )}

              {(stage === 'description' || stage === 'chapters') && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {language === 'ko' ? '영상 설명' : 'Video Description'}
                    </Label>
                    <Textarea
                      value={videoDescription}
                      onChange={(e) => setVideoDescription(e.target.value)}
                      placeholder="Enter video description..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">SRT Content</Label>
                    <Textarea
                      value={srtContent}
                      onChange={(e) => setSrtContent(e.target.value)}
                      placeholder="Paste SRT transcript..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </>
              )}

              <Button
                className="w-full"
                size="sm"
                onClick={runTest}
                disabled={isRunning || !productName}
              >
                {isRunning ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2 animate-spin" />
                    {language === 'ko' ? '테스트 중...' : 'Running...'}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" weight="fill" />
                    {language === 'ko' ? '테스트 실행' : 'Run Test'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Test Result */}
          <div className="space-y-4">
            {testResult ? (
              <>
                {/* Metrics Summary */}
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        {language === 'ko' ? '결과' : 'Result'}
                      </CardTitle>
                      <Badge className={cn(getGradeColor(testResult.qualityScore.grade), 'border-0')}>
                        Grade: {testResult.qualityScore.grade}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{testResult.qualityScore.total}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                          <Lightning className="h-3 w-3" />
                          Score
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{testResult.metrics.latencyMs}ms</p>
                        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3" />
                          Latency
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{testResult.metrics.inputTokens}</p>
                        <p className="text-[10px] text-muted-foreground">In Tokens</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{testResult.metrics.outputTokens}</p>
                        <p className="text-[10px] text-muted-foreground">Out Tokens</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Score Breakdown */}
                <Collapsible open={showScoreDetails} onOpenChange={setShowScoreDetails}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="py-2 cursor-pointer hover:bg-muted/30">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            {language === 'ko' ? '점수 상세' : 'Score Breakdown'}
                          </CardTitle>
                          {showScoreDetails ? (
                            <CaretUp className="h-4 w-4" />
                          ) : (
                            <CaretDown className="h-4 w-4" />
                          )}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-2">
                        {Object.entries(testResult.qualityScore.breakdown).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="capitalize text-xs">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${(value / 30) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono w-6 text-right">{value}</span>
                            </div>
                          </div>
                        ))}

                        {testResult.qualityScore.suggestions.length > 0 && (
                          <div className="pt-2 border-t space-y-1">
                            <p className="text-xs font-medium">
                              {language === 'ko' ? '개선 제안' : 'Suggestions'}
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {testResult.qualityScore.suggestions.map((s, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-yellow-500">•</span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Output Preview */}
                <Card>
                  <CardHeader className="py-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Output</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRawOutput(!showRawOutput)}
                        className="h-6 text-xs"
                      >
                        {showRawOutput ? 'Parsed' : 'Raw'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {showRawOutput ? (
                      <pre className="text-xs font-mono bg-muted p-2 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {testResult.rawResponse}
                      </pre>
                    ) : (
                      <div className="text-xs space-y-2 max-h-[200px] overflow-y-auto">
                        {testResult.output.first_130 && (
                          <div>
                            <p className="font-medium mb-1">First 130 Characters</p>
                            <p className="bg-muted p-2 rounded">{testResult.output.first_130}</p>
                          </div>
                        )}
                        {testResult.output.usps && testResult.output.usps.length > 0 && (
                          <div>
                            <p className="font-medium mb-1">USPs ({testResult.output.usps.length})</p>
                            <div className="space-y-1">
                              {testResult.output.usps.slice(0, 3).map((usp, i) => (
                                <div key={i} className="bg-muted p-2 rounded">
                                  <p className="font-medium">{usp.feature}</p>
                                  <p className="text-muted-foreground">{usp.user_benefit}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {testResult.output.faqs && testResult.output.faqs.length > 0 && (
                          <div>
                            <p className="font-medium mb-1">FAQs ({testResult.output.faqs.length})</p>
                            <div className="space-y-1">
                              {testResult.output.faqs.slice(0, 2).map((faq, i) => (
                                <div key={i} className="bg-muted p-2 rounded">
                                  <p className="font-medium">Q: {faq.question}</p>
                                  <p className="text-muted-foreground">A: {faq.answer}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {testResult.output.hashtags && testResult.output.hashtags.length > 0 && (
                          <div>
                            <p className="font-medium mb-1">Hashtags</p>
                            <div className="flex flex-wrap gap-1">
                              {testResult.output.hashtags.map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {testResult.output.parsed &&
                          !testResult.output.first_130 &&
                          !testResult.output.usps &&
                          !testResult.output.faqs &&
                          !testResult.output.hashtags && (
                            <pre className="font-mono bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(testResult.output.parsed, null, 2)}
                            </pre>
                          )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* AI Evaluation Panel */}
                <EvaluationPanel
                  stage={stage}
                  input={
                    {
                      productName,
                      category,
                      keywords: keywords
                        .split(',')
                        .map((k) => k.trim())
                        .filter(Boolean),
                      videoDescription: videoDescription || undefined,
                      srtContent: srtContent || undefined,
                    } as StageTestInputData
                  }
                  output={testResult.output}
                  prompt={stagePrompt?.stage_system_prompt || ''}
                  testRunId={testResult.id}
                />
              </>
            ) : (
              <Card className="h-full min-h-[300px] flex items-center justify-center">
                <CardContent className="text-center text-muted-foreground">
                  <Play className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">
                    {language === 'ko' ? '테스트를 실행하세요' : 'Run a test to see results'}
                  </p>
                  {depInfo.hasDependencies && previousResults?.missingStages.length ? (
                    <p className="text-xs mt-2 text-yellow-600">
                      Missing:{' '}
                      {previousResults.missingStages.map((s) => STAGE_CONFIG[s].label).join(', ')}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
