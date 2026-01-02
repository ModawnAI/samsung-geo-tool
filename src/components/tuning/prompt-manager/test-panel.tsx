'use client'

import * as React from 'react'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { Engine, TestMode, GroundingTestResult, GroundingSource } from '@/types/tuning'
import { Globe, MagnifyingGlass, Link as LinkIcon } from '@phosphor-icons/react'

export interface TestVariables {
  product_name: string
  category: string
  usps: string
  keywords: string
  competitor: string
  language: string
}

export interface TestResult {
  output: string
  tokens: {
    input: number
    output: number
    total: number
  }
  latency: number
  timestamp: string
  error?: string
  testMode?: TestMode
  groundingResult?: GroundingTestResult
}

export interface TestPanelProps {
  systemPrompt: string
  engine: Engine
  onTest: (prompt: string, variables: TestVariables, testMode?: TestMode) => Promise<TestResult>
  className?: string
}

// Tier badge colors and labels
const TIER_CONFIG: Record<1 | 2 | 3 | 4, { label: string; color: string; description: string }> = {
  1: { label: 'T1', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', description: 'Samsung Official' },
  2: { label: 'T2', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', description: 'Tech Media' },
  3: { label: 'T3', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', description: 'Community' },
  4: { label: 'T4', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', description: 'Other' },
}

// Source icon component
function SourceIcon({ source }: { source: 'google' | 'perplexity' | undefined }) {
  if (source === 'google') {
    return <Globe className="h-3.5 w-3.5 text-blue-500" weight="duotone" />
  }
  if (source === 'perplexity') {
    return <MagnifyingGlass className="h-3.5 w-3.5 text-purple-500" weight="duotone" />
  }
  return <LinkIcon className="h-3.5 w-3.5 text-gray-400" weight="duotone" />
}

const DEFAULT_VARIABLES: TestVariables = {
  product_name: 'Galaxy S24 Ultra',
  category: 'Smartphones',
  usps: 'Best camera, Long battery life, S Pen support',
  keywords: 'best smartphone 2024, flagship phone',
  competitor: 'iPhone 15 Pro Max',
  language: 'English',
}

export function TestPanel({ systemPrompt, engine, onTest, className }: TestPanelProps) {
  const [variables, setVariables] = useState<TestVariables>(DEFAULT_VARIABLES)
  const [userPrompt, setUserPrompt] = useState(
    'Write a compelling product description that highlights the unique features.'
  )
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [activeTab, setActiveTab] = useState('variables')
  const [testMode, setTestMode] = useState<TestMode>('llm')

  const updateVariable = useCallback((key: keyof TestVariables, value: string) => {
    setVariables((prev) => ({ ...prev, [key]: value }))
  }, [])

  const interpolatePrompt = useCallback(
    (prompt: string): string => {
      let result = prompt
      result = result.replace(/\{\{product_name\}\}/g, variables.product_name)
      result = result.replace(/\{\{category\}\}/g, variables.category)
      result = result.replace(/\{\{usps\}\}/g, variables.usps)
      result = result.replace(/\{\{keywords\}\}/g, variables.keywords)
      result = result.replace(/\{\{competitor\}\}/g, variables.competitor)
      result = result.replace(/\{\{language\}\}/g, variables.language)
      return result
    },
    [variables]
  )

  const handleTest = useCallback(async () => {
    setIsLoading(true)
    try {
      const interpolatedPrompt = interpolatePrompt(systemPrompt)
      const result = await onTest(interpolatedPrompt, variables, testMode)
      setResults((prev) => [{ ...result, testMode }, ...prev].slice(0, 10)) // Keep last 10 results
      setActiveTab('results')
    } catch (error) {
      setResults((prev) => [
        {
          output: '',
          tokens: { input: 0, output: 0, total: 0 },
          latency: 0,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          testMode,
        },
        ...prev,
      ])
    } finally {
      setIsLoading(false)
    }
  }, [systemPrompt, variables, interpolatePrompt, onTest, testMode])

  const previewPrompt = interpolatePrompt(systemPrompt)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Test Prompt</CardTitle>
            <CardDescription>
              {testMode === 'grounding'
                ? 'Test live grounding with Google & Perplexity search'
                : 'Test the prompt with sample variables'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="test-mode" className="text-xs text-muted-foreground">
                {testMode === 'llm' ? 'LLM Test' : 'Grounding'}
              </Label>
              <Switch
                id="test-mode"
                checked={testMode === 'grounding'}
                onCheckedChange={(checked) => setTestMode(checked ? 'grounding' : 'llm')}
              />
            </div>
            <Badge variant="outline" className="capitalize">
              {engine}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="variables">Variables</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="results">
              Results {results.length > 0 && `(${results.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="variables" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {(Object.keys(DEFAULT_VARIABLES) as Array<keyof TestVariables>).map((key) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="capitalize">
                    {key.replace('_', ' ')}
                  </Label>
                  <Input
                    id={key}
                    value={variables[key]}
                    onChange={(e) => updateVariable(key, e.target.value)}
                    placeholder={DEFAULT_VARIABLES[key]}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-prompt">User Prompt</Label>
              <Textarea
                id="user-prompt"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Enter a test user prompt..."
                className="min-h-[100px]"
              />
            </div>

            <Button onClick={handleTest} disabled={isLoading} className="w-full">
              {isLoading
                ? (testMode === 'grounding' ? 'Fetching Sources...' : 'Testing...')
                : (testMode === 'grounding' ? 'Run Grounding Test' : 'Run LLM Test')}
            </Button>
            {testMode === 'grounding' && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Tests live search with Google Custom Search & Perplexity APIs
              </p>
            )}
          </TabsContent>

          <TabsContent value="preview" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Interpolated System Prompt</Label>
              <div className="max-h-[300px] overflow-y-auto rounded-lg border bg-muted/30 p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm">{previewPrompt}</pre>
              </div>
              <p className="text-xs text-muted-foreground">
                {previewPrompt.length} characters | {previewPrompt.split(/\s+/).length} words
              </p>
            </div>

            <div className="space-y-2">
              <Label>User Prompt</Label>
              <div className="rounded-lg border bg-muted/30 p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm">{userPrompt}</pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="mt-4 space-y-4">
            {results.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No test results yet. Run a test to see results.
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={cn(
                      'rounded-lg border p-4',
                      result.error && 'border-destructive bg-destructive/10'
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={result.error ? 'destructive' : 'default'}>
                          {result.error ? 'Error' : 'Success'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {result.testMode === 'grounding' ? 'Grounding' : 'LLM'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {!result.error && (
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Latency: {result.latency}ms</span>
                          {result.testMode !== 'grounding' && (
                            <span>Tokens: {result.tokens.total}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {result.error ? (
                      <p className="text-sm text-destructive">{result.error}</p>
                    ) : result.testMode === 'grounding' && result.groundingResult ? (
                      <div className="space-y-4">
                        {/* Grounding Summary */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="rounded-lg bg-muted/50 p-3 text-center">
                            <div className="text-2xl font-bold">{result.groundingResult.totalResults}</div>
                            <div className="text-xs text-muted-foreground">Total Sources</div>
                          </div>
                          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {result.groundingResult.googleResults}
                            </div>
                            <div className="text-xs text-muted-foreground">Google</div>
                          </div>
                          <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-3 text-center">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              {result.groundingResult.perplexityResults}
                            </div>
                            <div className="text-xs text-muted-foreground">Perplexity</div>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-3 text-center">
                            <div className="text-2xl font-bold">{result.groundingResult.queriesUsed.length}</div>
                            <div className="text-xs text-muted-foreground">Queries</div>
                          </div>
                        </div>

                        {/* Tier Breakdown */}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">Source Tiers</Label>
                          <div className="flex gap-2 flex-wrap">
                            {([1, 2, 3, 4] as const).map((tier) => (
                              <div key={tier} className="flex items-center gap-1.5">
                                <Badge className={cn('text-xs', TIER_CONFIG[tier].color)}>
                                  {TIER_CONFIG[tier].label}: {result.groundingResult!.tierBreakdown[tier]}
                                </Badge>
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  {TIER_CONFIG[tier].description}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Queries Used */}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">Queries Used</Label>
                          <div className="flex flex-wrap gap-1">
                            {result.groundingResult.queriesUsed.map((query, qi) => (
                              <Badge key={qi} variant="outline" className="text-xs font-normal">
                                {query}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Sources List */}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            Sources ({result.groundingResult.sources.length})
                          </Label>
                          <div className="max-h-[300px] overflow-y-auto space-y-2">
                            {result.groundingResult.sources.map((source, si) => (
                              <div
                                key={si}
                                className="rounded border bg-muted/30 p-2.5 text-sm hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-start gap-2">
                                  <SourceIcon source={source.source} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium truncate">{source.title || 'Untitled'}</span>
                                      {source.tier && (
                                        <Badge className={cn('text-[10px] px-1.5', TIER_CONFIG[source.tier].color)}>
                                          {TIER_CONFIG[source.tier].label}
                                        </Badge>
                                      )}
                                    </div>
                                    {source.snippet && (
                                      <p className="text-xs text-muted-foreground line-clamp-2">{source.snippet}</p>
                                    )}
                                    {source.url && (
                                      <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-500 hover:underline truncate block mt-1"
                                      >
                                        {source.url}
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-[200px] overflow-y-auto rounded bg-muted/50 p-3">
                        <pre className="whitespace-pre-wrap font-mono text-sm">{result.output}</pre>
                      </div>
                    )}

                    {!result.error && result.testMode !== 'grounding' && (
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                        <span>Input: {result.tokens.input}</span>
                        <span>Output: {result.tokens.output}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
