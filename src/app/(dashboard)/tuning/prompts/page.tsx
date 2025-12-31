'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Code,
  Plus,
  ArrowLeft,
  DotsThree,
  Copy,
  Trash,
  CheckCircle,
  Warning,
  ArrowClockwise,
  MagnifyingGlass,
  Funnel,
  PencilSimple,
  Eye,
} from '@phosphor-icons/react'
import { useTuningStore } from '@/stores/tuning-store'
import { cn } from '@/lib/utils'

type EngineType = 'gemini' | 'perplexity' | 'cohere'

interface PromptFormData {
  name: string
  version: string
  engine: EngineType
  system_prompt: string
  description: string
}

const engineLabels: Record<EngineType, string> = {
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  cohere: 'Cohere',
}

const engineColors: Record<EngineType, string> = {
  gemini: 'bg-blue-100 text-blue-700',
  perplexity: 'bg-purple-100 text-purple-700',
  cohere: 'bg-orange-100 text-orange-700',
}

export default function PromptManagerPage() {
  const searchParams = useSearchParams()
  const action = searchParams.get('action')

  const { prompts, isLoading, error, fetchPrompts, createPrompt, updatePrompt, deletePrompt } = useTuningStore()

  const [search, setSearch] = useState('')
  const [engineFilter, setEngineFilter] = useState<EngineType | 'all'>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(action === 'new')
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
  const [viewingPrompt, setViewingPrompt] = useState<string | null>(null)
  const [formData, setFormData] = useState<PromptFormData>({
    name: '',
    version: '1.0.0',
    engine: 'gemini',
    system_prompt: '',
    description: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch =
      prompt.name.toLowerCase().includes(search.toLowerCase()) ||
      prompt.description?.toLowerCase().includes(search.toLowerCase())
    const matchesEngine = engineFilter === 'all' || prompt.engine === engineFilter
    return matchesSearch && matchesEngine
  })

  const handleCreate = () => {
    setEditingPrompt(null)
    setFormData({
      name: '',
      version: '1.0.0',
      engine: 'gemini',
      system_prompt: '',
      description: '',
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (promptId: string) => {
    const prompt = prompts.find((p) => p.id === promptId)
    if (!prompt) return

    setEditingPrompt(promptId)
    setFormData({
      name: prompt.name,
      version: prompt.version,
      engine: prompt.engine,
      system_prompt: prompt.system_prompt,
      description: prompt.description || '',
    })
    setIsDialogOpen(true)
  }

  const handleView = (promptId: string) => {
    setViewingPrompt(promptId)
  }

  const handleDuplicate = (promptId: string) => {
    const prompt = prompts.find((p) => p.id === promptId)
    if (!prompt) return

    const versionParts = prompt.version.split('.')
    const newVersion = `${versionParts[0]}.${parseInt(versionParts[1]) + 1}.0`

    setEditingPrompt(null)
    setFormData({
      name: `${prompt.name} (Copy)`,
      version: newVersion,
      engine: prompt.engine,
      system_prompt: prompt.system_prompt,
      description: prompt.description || '',
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (editingPrompt) {
        await updatePrompt(editingPrompt, formData)
      } else {
        await createPrompt(formData)
      }
      setIsDialogOpen(false)
      setEditingPrompt(null)
    } catch {
      // Error handled by store
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt version?')) return
    await deletePrompt(promptId)
  }

  const handleToggleActive = async (promptId: string, currentActive: boolean) => {
    await updatePrompt(promptId, { is_active: !currentActive })
  }

  const viewedPrompt = viewingPrompt ? prompts.find((p) => p.id === viewingPrompt) : null

  if (isLoading && prompts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tuning">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Prompt Manager</h1>
            <p className="text-muted-foreground">Manage prompt versions for AI engines</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error && prompts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tuning">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Prompt Manager</h1>
            <p className="text-muted-foreground">Manage prompt versions for AI engines</p>
          </div>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Warning className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="font-medium text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">Please check your connection and try again</p>
            </div>
            <Button onClick={() => fetchPrompts()} variant="outline" className="gap-2">
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
            <h1 className="text-2xl font-bold">Prompt Manager</h1>
            <p className="text-muted-foreground">Manage prompt versions for AI engines</p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Prompt
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={engineFilter} onValueChange={(v) => setEngineFilter(v as EngineType | 'all')}>
          <SelectTrigger className="w-[180px]">
            <Funnel className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by engine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Engines</SelectItem>
            <SelectItem value="gemini">Gemini</SelectItem>
            <SelectItem value="perplexity">Perplexity</SelectItem>
            <SelectItem value="cohere">Cohere</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prompts Grid */}
      {filteredPrompts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Code className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No prompts found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || engineFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first prompt version'}
              </p>
            </div>
            {!search && engineFilter === 'all' && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Prompt
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrompts.map((prompt) => (
            <Card key={prompt.id} className={cn(prompt.is_active && 'border-primary/50')}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {prompt.name}
                      {prompt.is_active && <CheckCircle className="h-4 w-4 text-primary" weight="fill" />}
                    </CardTitle>
                    <CardDescription>v{prompt.version}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <DotsThree className="h-4 w-4" weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(prompt.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(prompt.id)}>
                        <PencilSimple className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(prompt.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(prompt.id, prompt.is_active)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {prompt.is_active ? 'Deactivate' : 'Set Active'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(prompt.id)} className="text-destructive">
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={engineColors[prompt.engine]}>{engineLabels[prompt.engine]}</Badge>
                  {prompt.is_active && <Badge variant="outline">Active</Badge>}
                </div>
                {prompt.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{prompt.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {prompt.system_prompt.length} characters
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}</DialogTitle>
            <DialogDescription>
              {editingPrompt ? 'Update the prompt configuration' : 'Create a new prompt version for an AI engine'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="GEO Prompt v1"
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
            <div className="space-y-2">
              <Label>Engine</Label>
              <Select
                value={formData.engine}
                onValueChange={(v) => setFormData({ ...formData, engine: v as EngineType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                  <SelectItem value="cohere">Cohere</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this prompt version"
              />
            </div>
            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                placeholder="Enter the system prompt..."
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">{formData.system_prompt.length} characters</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name || !formData.system_prompt}>
              {isSaving ? 'Saving...' : editingPrompt ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingPrompt} onOpenChange={() => setViewingPrompt(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewedPrompt?.name}
              {viewedPrompt?.is_active && <CheckCircle className="h-4 w-4 text-primary" weight="fill" />}
            </DialogTitle>
            <DialogDescription>v{viewedPrompt?.version}</DialogDescription>
          </DialogHeader>
          {viewedPrompt && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Badge className={engineColors[viewedPrompt.engine]}>{engineLabels[viewedPrompt.engine]}</Badge>
                {viewedPrompt.is_active && <Badge variant="outline">Active</Badge>}
              </div>
              {viewedPrompt.description && <p className="text-sm text-muted-foreground">{viewedPrompt.description}</p>}
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <div className="p-4 rounded-md bg-muted font-mono text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {viewedPrompt.system_prompt}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Created {new Date(viewedPrompt.created_at).toLocaleString()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingPrompt(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (viewedPrompt) {
                  handleEdit(viewedPrompt.id)
                  setViewingPrompt(null)
                }
              }}
            >
              <PencilSimple className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
