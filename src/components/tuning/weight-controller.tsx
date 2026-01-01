'use client'

import * as React from 'react'
import { useCallback, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface WeightConfig {
  id: string
  name: string
  description?: string
  weights: Record<string, number>
  is_active: boolean
  created_at: string
  updated_at?: string
}

interface WeightCategory {
  id: string
  name: string
  description: string
  weights: WeightItem[]
}

interface WeightItem {
  id: string
  name: string
  description: string
  defaultValue: number
  min: number
  max: number
  step: number
}

interface WeightControllerProps {
  config?: WeightConfig | null
  categories: WeightCategory[]
  onSave: (weights: Record<string, number>, name: string) => Promise<void>
  onReset?: () => void
  isSaving?: boolean
  className?: string
}

const DEFAULT_CATEGORIES: WeightCategory[] = [
  {
    id: 'content',
    name: 'Content Quality',
    description: 'Weights for content quality scoring',
    weights: [
      {
        id: 'relevance',
        name: 'Relevance',
        description: 'How well content addresses the query',
        defaultValue: 0.25,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'accuracy',
        name: 'Accuracy',
        description: 'Factual correctness of information',
        defaultValue: 0.25,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'completeness',
        name: 'Completeness',
        description: 'Coverage of topic aspects',
        defaultValue: 0.2,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'clarity',
        name: 'Clarity',
        description: 'Readability and structure',
        defaultValue: 0.15,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'engagement',
        name: 'Engagement',
        description: 'User engagement potential',
        defaultValue: 0.15,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    id: 'seo',
    name: 'SEO Factors',
    description: 'Search engine optimization weights',
    weights: [
      {
        id: 'keyword_density',
        name: 'Keyword Density',
        description: 'Optimal keyword usage',
        defaultValue: 0.2,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'semantic_relevance',
        name: 'Semantic Relevance',
        description: 'Topic and entity relevance',
        defaultValue: 0.25,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'structure',
        name: 'Structure',
        description: 'Heading hierarchy and formatting',
        defaultValue: 0.2,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'readability',
        name: 'Readability',
        description: 'Reading level appropriateness',
        defaultValue: 0.15,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'freshness',
        name: 'Freshness',
        description: 'Content recency signals',
        defaultValue: 0.2,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    id: 'brand',
    name: 'Brand Alignment',
    description: 'Brand consistency weights',
    weights: [
      {
        id: 'tone',
        name: 'Tone',
        description: 'Voice and tone consistency',
        defaultValue: 0.3,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'messaging',
        name: 'Messaging',
        description: 'Key message incorporation',
        defaultValue: 0.3,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'differentiation',
        name: 'Differentiation',
        description: 'Competitive differentiation',
        defaultValue: 0.25,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'values',
        name: 'Values',
        description: 'Brand values alignment',
        defaultValue: 0.15,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
]

export function WeightController({
  config,
  categories = DEFAULT_CATEGORIES,
  onSave,
  onReset,
  isSaving = false,
  className,
}: WeightControllerProps) {
  const [configName, setConfigName] = useState(config?.name || 'Default Configuration')
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    if (config?.weights) return config.weights
    const defaultWeights: Record<string, number> = {}
    categories.forEach((category) => {
      category.weights.forEach((weight) => {
        defaultWeights[weight.id] = weight.defaultValue
      })
    })
    return defaultWeights
  })
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || '')

  const updateWeight = useCallback((id: string, value: number) => {
    setWeights((prev) => ({ ...prev, [id]: value }))
  }, [])

  const resetToDefaults = useCallback(() => {
    const defaultWeights: Record<string, number> = {}
    categories.forEach((category) => {
      category.weights.forEach((weight) => {
        defaultWeights[weight.id] = weight.defaultValue
      })
    })
    setWeights(defaultWeights)
    onReset?.()
  }, [categories, onReset])

  const handleSave = useCallback(async () => {
    await onSave(weights, configName)
  }, [weights, configName, onSave])

  // Calculate category totals
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    categories.forEach((category) => {
      totals[category.id] = category.weights.reduce(
        (sum, weight) => sum + (weights[weight.id] || 0),
        0
      )
    })
    return totals
  }, [categories, weights])

  // Check if weights are normalized (sum to 1)
  const normalizationStatus = useMemo(() => {
    const status: Record<string, 'valid' | 'warning' | 'error'> = {}
    categories.forEach((category) => {
      const total = categoryTotals[category.id]
      if (Math.abs(total - 1) < 0.01) {
        status[category.id] = 'valid'
      } else if (Math.abs(total - 1) < 0.1) {
        status[category.id] = 'warning'
      } else {
        status[category.id] = 'error'
      }
    })
    return status
  }, [categories, categoryTotals])

  const normalizeWeights = useCallback(
    (categoryId: string) => {
      const category = categories.find((c) => c.id === categoryId)
      if (!category) return

      const total = categoryTotals[categoryId]
      if (total === 0) return

      const newWeights = { ...weights }
      category.weights.forEach((weight) => {
        newWeights[weight.id] = (weights[weight.id] || 0) / total
      })
      setWeights(newWeights)
    },
    [categories, categoryTotals, weights]
  )

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Weight Configuration</CardTitle>
            <CardDescription>
              Adjust scoring weights for content optimization
            </CardDescription>
          </div>
          {config?.is_active && (
            <Badge variant="default">Active</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Config name */}
        <div className="space-y-2">
          <Label htmlFor="config-name">Configuration Name</Label>
          <Input
            id="config-name"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="Enter configuration name"
          />
        </div>

        {/* Weight categories */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }}>
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="relative">
                {category.name}
                <span
                  className={cn(
                    'absolute -right-1 -top-1 h-2 w-2 rounded-full',
                    normalizationStatus[category.id] === 'valid' && 'bg-green-500',
                    normalizationStatus[category.id] === 'warning' && 'bg-yellow-500',
                    normalizationStatus[category.id] === 'error' && 'bg-red-500'
                  )}
                />
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{category.description}</p>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      normalizationStatus[category.id] === 'valid' && 'text-green-600',
                      normalizationStatus[category.id] === 'warning' && 'text-yellow-600',
                      normalizationStatus[category.id] === 'error' && 'text-red-600'
                    )}
                  >
                    Total: {categoryTotals[category.id].toFixed(2)}
                  </span>
                  {normalizationStatus[category.id] !== 'valid' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => normalizeWeights(category.id)}
                    >
                      Normalize
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {category.weights.map((weight) => (
                  <WeightSlider
                    key={weight.id}
                    weight={weight}
                    value={weights[weight.id] ?? weight.defaultValue}
                    onChange={(value) => updateWeight(weight.id, value)}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Summary */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="mb-3 text-sm font-medium">Weight Summary</h4>
          <div className="grid gap-2 sm:grid-cols-3">
            {categories.map((category) => (
              <div key={category.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{category.name}</span>
                  <Badge
                    variant={
                      normalizationStatus[category.id] === 'valid'
                        ? 'default'
                        : normalizationStatus[category.id] === 'warning'
                          ? 'secondary'
                          : 'destructive'
                    }
                    className="text-xs"
                  >
                    {categoryTotals[category.id].toFixed(2)}
                  </Badge>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full transition-all',
                      normalizationStatus[category.id] === 'valid' && 'bg-green-500',
                      normalizationStatus[category.id] === 'warning' && 'bg-yellow-500',
                      normalizationStatus[category.id] === 'error' && 'bg-red-500'
                    )}
                    style={{ width: `${Math.min(categoryTotals[category.id] * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metadata */}
        {config && (
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>ID: {config.id}</span>
              <span>Created: {new Date(config.created_at).toLocaleString()}</span>
              {config.updated_at && (
                <span>Updated: {new Date(config.updated_at).toLocaleString()}</span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={resetToDefaults} disabled={isSaving}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : config ? 'Update Configuration' : 'Save Configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface WeightSliderProps {
  weight: WeightItem
  value: number
  onChange: (value: number) => void
}

function WeightSlider({ weight, value, onChange }: WeightSliderProps) {
  const percentage = ((value - weight.min) / (weight.max - weight.min)) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor={weight.id} className="text-sm font-medium">
            {weight.name}
          </Label>
          <p className="text-xs text-muted-foreground">{weight.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            id={weight.id}
            value={value.toFixed(2)}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value)
              if (!isNaN(newValue) && newValue >= weight.min && newValue <= weight.max) {
                onChange(newValue)
              }
            }}
            min={weight.min}
            max={weight.max}
            step={weight.step}
            className="h-8 w-20 text-right"
          />
          <span className="w-12 text-right text-sm text-muted-foreground">
            {(value * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="relative">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={weight.min}
          max={weight.max}
          step={weight.step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 h-2 w-full cursor-pointer opacity-0"
          aria-label={weight.name}
        />
      </div>
    </div>
  )
}

export type { WeightConfig, WeightCategory, WeightItem, WeightControllerProps }
