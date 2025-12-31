'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Scales,
  Plus,
  ArrowLeft,
  DotsThree,
  Copy,
  Trash,
  CheckCircle,
  Warning,
  ArrowClockwise,
  PencilSimple,
  Eye,
  ArrowsLeftRight,
} from '@phosphor-icons/react'
import { useTuningStore } from '@/stores/tuning-store'
import { cn } from '@/lib/utils'

interface WeightConfig {
  usp_coverage: number
  grounding_score: number
  semantic_similarity: number
  anti_fabrication: number
  keyword_density: number
  structure_quality: number
}

interface WeightFormData {
  name: string
  version: string
  weights: WeightConfig
}

const defaultWeights: WeightConfig = {
  usp_coverage: 0.25,
  grounding_score: 0.2,
  semantic_similarity: 0.15,
  anti_fabrication: 0.15,
  keyword_density: 0.15,
  structure_quality: 0.1,
}

const weightLabels: Record<keyof WeightConfig, { label: string; description: string }> = {
  usp_coverage: { label: 'USP Coverage', description: 'How well key selling points are covered' },
  grounding_score: { label: 'Grounding Score', description: 'Factual accuracy and citation quality' },
  semantic_similarity: { label: 'Semantic Similarity', description: 'Content relevance to brief' },
  anti_fabrication: { label: 'Anti-Fabrication', description: 'Prevention of hallucinated content' },
  keyword_density: { label: 'Keyword Density', description: 'Target keyword presence' },
  structure_quality: { label: 'Structure Quality', description: 'Content organization and format' },
}

export default function WeightControllerPage() {
  const searchParams = useSearchParams()
  const action = searchParams.get('action')

  const { weights, isLoading, error, fetchWeights, createWeight, updateWeight, deleteWeight } = useTuningStore()

  const [isDialogOpen, setIsDialogOpen] = useState(action === 'new')
  const [isCompareOpen, setIsCompareOpen] = useState(action === 'test')
  const [editingWeight, setEditingWeight] = useState<string | null>(null)
  const [viewingWeight, setViewingWeight] = useState<string | null>(null)
  const [compareWeights, setCompareWeights] = useState<[string | null, string | null]>([null, null])
  const [formData, setFormData] = useState<WeightFormData>({
    name: '',
    version: '1.0.0',
    weights: { ...defaultWeights },
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchWeights()
  }, [fetchWeights])

  const handleCreate = () => {
    setEditingWeight(null)
    setFormData({
      name: '',
      version: '1.0.0',
      weights: { ...defaultWeights },
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (weightId: string) => {
    const weight = weights.find((w) => w.id === weightId)
    if (!weight) return

    setEditingWeight(weightId)
    setFormData({
      name: weight.name,
      version: weight.version,
      weights: weight.weights as unknown as WeightConfig,
    })
    setIsDialogOpen(true)
  }

  const handleView = (weightId: string) => {
    setViewingWeight(weightId)
  }

  const handleDuplicate = (weightId: string) => {
    const weight = weights.find((w) => w.id === weightId)
    if (!weight) return

    const versionParts = weight.version.split('.')
    const newVersion = `${versionParts[0]}.${parseInt(versionParts[1]) + 1}.0`

    setEditingWeight(null)
    setFormData({
      name: `${weight.name} (Copy)`,
      version: newVersion,
      weights: weight.weights as unknown as WeightConfig,
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (editingWeight) {
        await updateWeight(editingWeight, {
          name: formData.name,
          version: formData.version,
          weights: formData.weights as unknown as Record<string, number>,
        })
      } else {
        await createWeight({
          name: formData.name,
          version: formData.version,
          weights: formData.weights as unknown as Record<string, number>,
        })
      }
      setIsDialogOpen(false)
      setEditingWeight(null)
    } catch {
      // Error handled by store
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (weightId: string) => {
    if (!confirm('Are you sure you want to delete this weight configuration?')) return
    await deleteWeight(weightId)
  }

  const handleToggleActive = async (weightId: string, currentActive: boolean) => {
    await updateWeight(weightId, { is_active: !currentActive })
  }

  const updateFormWeight = (key: keyof WeightConfig, value: number) => {
    setFormData((prev) => ({
      ...prev,
      weights: {
        ...prev.weights,
        [key]: value,
      },
    }))
  }

  const normalizeWeights = () => {
    const total = Object.values(formData.weights).reduce((sum, val) => sum + val, 0)
    if (total === 0) return

    const normalized: WeightConfig = {} as WeightConfig
    for (const key of Object.keys(formData.weights) as (keyof WeightConfig)[]) {
      normalized[key] = Number((formData.weights[key] / total).toFixed(3))
    }
    setFormData((prev) => ({ ...prev, weights: normalized }))
  }

  const getTotalWeight = () => {
    return Object.values(formData.weights).reduce((sum, val) => sum + val, 0)
  }

  const viewedWeight = viewingWeight ? weights.find((w) => w.id === viewingWeight) : null
  const compareWeight1 = compareWeights[0] ? weights.find((w) => w.id === compareWeights[0]) : null
  const compareWeight2 = compareWeights[1] ? weights.find((w) => w.id === compareWeights[1]) : null

  if (isLoading && weights.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tuning">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Weight Controller</h1>
            <p className="text-muted-foreground">Configure scoring weights for GEO optimization</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error && weights.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tuning">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Weight Controller</h1>
            <p className="text-muted-foreground">Configure scoring weights for GEO optimization</p>
          </div>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Warning className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="font-medium text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">Please check your connection and try again</p>
            </div>
            <Button onClick={() => fetchWeights()} variant="outline" className="gap-2">
              <ArrowClockwise className="h-4 w-4" />
              Retry
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
            <Link href="/tuning">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Weight Controller</h1>
            <p className="text-muted-foreground">Configure scoring weights for GEO optimization</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCompareOpen(true)} disabled={weights.length < 2}>
            <ArrowsLeftRight className="h-4 w-4 mr-2" />
            Compare
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Config
          </Button>
        </div>
      </div>

      {/* Weights Grid */}
      {weights.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Scales className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No weight configurations</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first weight configuration</p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Config
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {weights.map((weight) => (
            <Card key={weight.id} className={cn(weight.is_active && 'border-primary/50')}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {weight.name}
                      {weight.is_active && <CheckCircle className="h-4 w-4 text-primary" weight="fill" />}
                    </CardTitle>
                    <CardDescription>v{weight.version}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <DotsThree className="h-4 w-4" weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(weight.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(weight.id)}>
                        <PencilSimple className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(weight.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(weight.id, weight.is_active)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {weight.is_active ? 'Deactivate' : 'Set Active'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(weight.id)} className="text-destructive">
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {weight.is_active && <Badge variant="outline">Active</Badge>}
                <div className="space-y-2">
                  {Object.entries(weight.weights as unknown as WeightConfig).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {weightLabels[key as keyof WeightConfig]?.label || key}
                      </span>
                      <span className="font-mono">{(value * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWeight ? 'Edit Weight Config' : 'Create New Weight Config'}</DialogTitle>
            <DialogDescription>Configure the scoring weights for GEO optimization</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Default Weights"
                />
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.0.0"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Weight Distribution</Label>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-sm font-mono',
                      Math.abs(getTotalWeight() - 1) < 0.01 ? 'text-green-600' : 'text-amber-600'
                    )}
                  >
                    Total: {(getTotalWeight() * 100).toFixed(0)}%
                  </span>
                  <Button variant="outline" size="sm" onClick={normalizeWeights}>
                    Normalize
                  </Button>
                </div>
              </div>

              {(Object.keys(defaultWeights) as (keyof WeightConfig)[]).map((key) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{weightLabels[key].label}</Label>
                      <p className="text-xs text-muted-foreground">{weightLabels[key].description}</p>
                    </div>
                    <span className="font-mono text-sm">{(formData.weights[key] * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[formData.weights[key] * 100]}
                    onValueChange={([val]: number[]) => updateFormWeight(key, val / 100)}
                    max={100}
                    step={1}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name}>
              {isSaving ? 'Saving...' : editingWeight ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingWeight} onOpenChange={() => setViewingWeight(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewedWeight?.name}
              {viewedWeight?.is_active && <CheckCircle className="h-4 w-4 text-primary" weight="fill" />}
            </DialogTitle>
            <DialogDescription>v{viewedWeight?.version}</DialogDescription>
          </DialogHeader>
          {viewedWeight && (
            <div className="space-y-4 py-4">
              {viewedWeight.is_active && <Badge variant="outline">Active</Badge>}
              <div className="space-y-3">
                {Object.entries(viewedWeight.weights as unknown as WeightConfig).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {weightLabels[key as keyof WeightConfig]?.label || key}
                      </span>
                      <span className="font-mono text-sm">{(value * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${value * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Created {new Date(viewedWeight.created_at).toLocaleString()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingWeight(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (viewedWeight) {
                  handleEdit(viewedWeight.id)
                  setViewingWeight(null)
                }
              }}
            >
              <PencilSimple className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compare Weight Configurations</DialogTitle>
            <DialogDescription>Select two configurations to compare side by side</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Configuration A</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={compareWeights[0] || ''}
                  onChange={(e) => setCompareWeights([e.target.value || null, compareWeights[1]])}
                >
                  <option value="">Select...</option>
                  {weights.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (v{w.version})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Configuration B</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={compareWeights[1] || ''}
                  onChange={(e) => setCompareWeights([compareWeights[0], e.target.value || null])}
                >
                  <option value="">Select...</option>
                  {weights.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (v{w.version})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {compareWeight1 && compareWeight2 && (
              <div className="border rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="font-medium">Metric</div>
                  <div className="font-medium text-center">{compareWeight1.name}</div>
                  <div className="font-medium text-center">{compareWeight2.name}</div>
                </div>
                <div className="border-t mt-2 pt-2 space-y-2">
                  {(Object.keys(defaultWeights) as (keyof WeightConfig)[]).map((key) => {
                    const val1 = (compareWeight1.weights as unknown as WeightConfig)[key]
                    const val2 = (compareWeight2.weights as unknown as WeightConfig)[key]
                    const diff = val2 - val1

                    return (
                      <div key={key} className="grid grid-cols-3 gap-4 text-sm py-1">
                        <div className="text-muted-foreground">{weightLabels[key].label}</div>
                        <div className="text-center font-mono">{(val1 * 100).toFixed(0)}%</div>
                        <div className="text-center font-mono flex items-center justify-center gap-1">
                          {(val2 * 100).toFixed(0)}%
                          {diff !== 0 && (
                            <span className={cn('text-xs', diff > 0 ? 'text-green-600' : 'text-red-600')}>
                              ({diff > 0 ? '+' : ''}
                              {(diff * 100).toFixed(0)})
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompareOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
