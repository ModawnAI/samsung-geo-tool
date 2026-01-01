'use client'

import * as React from 'react'
import { useCallback, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ScoringWeight, WeightValues, WeightFormData } from '@/types/tuning'
import { WEIGHT_LABELS, DEFAULT_WEIGHTS, parseWeightValues, validateWeightTotal, normalizeWeights } from '@/types/tuning'

// Weight item configuration for UI display
interface WeightItem {
  id: keyof WeightValues
  name: string
  description: string
  defaultValue: number
  min: number
  max: number
  step: number
}

export interface WeightControllerProps {
  config?: ScoringWeight | null
  onSave: (data: WeightFormData & { is_active?: boolean }) => Promise<void>
  onReset?: () => void
  isSaving?: boolean
  className?: string
}

// Single category with all scoring weights aligned with database
const SCORING_WEIGHTS: WeightItem[] = [
  {
    id: 'usp_coverage',
    name: WEIGHT_LABELS.usp_coverage.label,
    description: WEIGHT_LABELS.usp_coverage.description,
    defaultValue: DEFAULT_WEIGHTS.usp_coverage,
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    id: 'grounding_score',
    name: WEIGHT_LABELS.grounding_score.label,
    description: WEIGHT_LABELS.grounding_score.description,
    defaultValue: DEFAULT_WEIGHTS.grounding_score,
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    id: 'semantic_similarity',
    name: WEIGHT_LABELS.semantic_similarity.label,
    description: WEIGHT_LABELS.semantic_similarity.description,
    defaultValue: DEFAULT_WEIGHTS.semantic_similarity,
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    id: 'anti_fabrication',
    name: WEIGHT_LABELS.anti_fabrication.label,
    description: WEIGHT_LABELS.anti_fabrication.description,
    defaultValue: DEFAULT_WEIGHTS.anti_fabrication,
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    id: 'keyword_density',
    name: WEIGHT_LABELS.keyword_density.label,
    description: WEIGHT_LABELS.keyword_density.description,
    defaultValue: DEFAULT_WEIGHTS.keyword_density,
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    id: 'structure_quality',
    name: WEIGHT_LABELS.structure_quality.label,
    description: WEIGHT_LABELS.structure_quality.description,
    defaultValue: DEFAULT_WEIGHTS.structure_quality,
    min: 0,
    max: 1,
    step: 0.01,
  },
]

export function WeightController({
  config,
  onSave,
  onReset,
  isSaving = false,
  className,
}: WeightControllerProps) {
  const [configName, setConfigName] = useState(config?.name || 'Default Configuration')
  const [configVersion, setConfigVersion] = useState(config?.version || '1.0.0')
  const [isActive, setIsActive] = useState(config?.is_active || false)
  const [weights, setWeights] = useState<WeightValues>(() => {
    if (config?.weights) {
      return parseWeightValues(config.weights)
    }
    return { ...DEFAULT_WEIGHTS }
  })

  const updateWeight = useCallback((id: keyof WeightValues, value: number) => {
    setWeights((prev) => ({ ...prev, [id]: value }))
  }, [])

  const resetToDefaults = useCallback(() => {
    setWeights({ ...DEFAULT_WEIGHTS })
    onReset?.()
  }, [onReset])

  const handleSave = useCallback(async () => {
    await onSave({
      name: configName.trim(),
      version: configVersion.trim(),
      weights,
      is_active: isActive,
    })
  }, [weights, configName, configVersion, isActive, onSave])

  // Validate weight total
  const { valid: isValidTotal, total: weightTotal } = useMemo(
    () => validateWeightTotal(weights),
    [weights]
  )

  const normalizationStatus = useMemo(() => {
    if (isValidTotal) return 'valid'
    if (Math.abs(weightTotal - 1) < 0.1) return 'warning'
    return 'error'
  }, [isValidTotal, weightTotal])

  const handleNormalize = useCallback(() => {
    setWeights(normalizeWeights(weights))
  }, [weights])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{config ? 'Edit Weight Configuration' : 'Create Weight Configuration'}</CardTitle>
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
        {/* Config name and version */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="config-name">Configuration Name</Label>
            <Input
              id="config-name"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="Enter configuration name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="config-version">Version</Label>
            <Input
              id="config-version"
              value={configVersion}
              onChange={(e) => setConfigVersion(e.target.value)}
              placeholder="1.0.0"
            />
          </div>
        </div>

        {/* Weight sliders */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Scoring Weights</Label>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-sm font-medium',
                  normalizationStatus === 'valid' && 'text-green-600',
                  normalizationStatus === 'warning' && 'text-yellow-600',
                  normalizationStatus === 'error' && 'text-red-600'
                )}
              >
                Total: {weightTotal.toFixed(2)}
              </span>
              {normalizationStatus !== 'valid' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNormalize}
                >
                  Normalize
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Weights should sum to 1.0 for proper scoring
          </p>
        </div>

        <div className="space-y-4">
          {SCORING_WEIGHTS.map((weight) => (
            <WeightSlider
              key={weight.id}
              weight={weight}
              value={weights[weight.id]}
              onChange={(value) => updateWeight(weight.id, value)}
            />
          ))}
        </div>

        {/* Summary bar */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="mb-3 text-sm font-medium">Weight Distribution</h4>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Weight</span>
              <Badge
                variant={
                  normalizationStatus === 'valid'
                    ? 'default'
                    : normalizationStatus === 'warning'
                      ? 'secondary'
                      : 'destructive'
                }
                className="text-xs"
              >
                {weightTotal.toFixed(2)}
              </Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full transition-all',
                  normalizationStatus === 'valid' && 'bg-green-500',
                  normalizationStatus === 'warning' && 'bg-yellow-500',
                  normalizationStatus === 'error' && 'bg-red-500'
                )}
                style={{ width: `${Math.min(weightTotal * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Active status toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <h4 className="font-medium">Active Status</h4>
            <p className="text-sm text-muted-foreground">
              Set this as the active weight configuration
            </p>
          </div>
          <Button
            type="button"
            variant={isActive ? 'default' : 'outline'}
            onClick={() => setIsActive(!isActive)}
          >
            {isActive ? 'Active' : 'Inactive'}
          </Button>
        </div>

        {/* Metadata */}
        {config && (
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>ID: {config.id}</span>
              <span>Created: {new Date(config.created_at).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={resetToDefaults} disabled={isSaving}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !isValidTotal}>
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
