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
import { cn } from '@/lib/utils'
import type { Engine } from '@/types/tuning'

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
}

export interface TestPanelProps {
  systemPrompt: string
  engine: Engine
  onTest: (prompt: string, variables: TestVariables) => Promise<TestResult>
  className?: string
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
      const result = await onTest(interpolatedPrompt, variables)
      setResults((prev) => [result, ...prev].slice(0, 10)) // Keep last 10 results
      setActiveTab('results')
    } catch (error) {
      setResults((prev) => [
        {
          output: '',
          tokens: { input: 0, output: 0, total: 0 },
          latency: 0,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        ...prev,
      ])
    } finally {
      setIsLoading(false)
    }
  }, [systemPrompt, variables, interpolatePrompt, onTest])

  const previewPrompt = interpolatePrompt(systemPrompt)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Test Prompt</CardTitle>
            <CardDescription>Test the prompt with sample variables</CardDescription>
          </div>
          <Badge variant="outline" className="capitalize">
            {engine}
          </Badge>
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
              {isLoading ? 'Testing...' : 'Run Test'}
            </Button>
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
                        <span className="text-xs text-muted-foreground">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {!result.error && (
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Latency: {result.latency}ms</span>
                          <span>Tokens: {result.tokens.total}</span>
                        </div>
                      )}
                    </div>

                    {result.error ? (
                      <p className="text-sm text-destructive">{result.error}</p>
                    ) : (
                      <div className="max-h-[200px] overflow-y-auto rounded bg-muted/50 p-3">
                        <pre className="whitespace-pre-wrap font-mono text-sm">{result.output}</pre>
                      </div>
                    )}

                    {!result.error && (
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
