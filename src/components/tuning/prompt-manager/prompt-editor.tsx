'use client'

import * as React from 'react'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Engine = 'gemini' | 'perplexity' | 'cohere'

interface PromptVersion {
  id: string
  name: string
  version: string
  engine: Engine
  system_prompt: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at?: string
  created_by?: string
}

interface PromptEditorProps {
  prompt?: PromptVersion | null
  onSave: (data: Omit<PromptVersion, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<void>
  onCancel?: () => void
  isSaving?: boolean
  className?: string
}

const ENGINE_CONFIG: Record<Engine, { label: string; description: string; color: string }> = {
  gemini: {
    label: 'Google Gemini',
    description: 'Best for structured content generation',
    color: 'bg-blue-500',
  },
  perplexity: {
    label: 'Perplexity',
    description: 'Best for research and fact-checking',
    color: 'bg-purple-500',
  },
  cohere: {
    label: 'Cohere',
    description: 'Best for embedding and retrieval',
    color: 'bg-green-500',
  },
}

const TEMPLATE_VARIABLES = [
  { name: '{{product_name}}', description: 'Product name' },
  { name: '{{category}}', description: 'Product category' },
  { name: '{{usps}}', description: 'Unique selling points' },
  { name: '{{keywords}}', description: 'Target keywords' },
  { name: '{{competitor}}', description: 'Competitor name' },
  { name: '{{language}}', description: 'Target language' },
]

export function PromptEditor({
  prompt,
  onSave,
  onCancel,
  isSaving = false,
  className,
}: PromptEditorProps) {
  const [name, setName] = useState(prompt?.name || '')
  const [version, setVersion] = useState(prompt?.version || '1.0.0')
  const [engine, setEngine] = useState<Engine>(prompt?.engine || 'gemini')
  const [systemPrompt, setSystemPrompt] = useState(prompt?.system_prompt || '')
  const [description, setDescription] = useState(prompt?.description || '')
  const [isActive, setIsActive] = useState(prompt?.is_active || false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!version.trim()) {
      newErrors.version = 'Version is required'
    } else if (!/^\d+\.\d+\.\d+$/.test(version)) {
      newErrors.version = 'Version must be in format X.Y.Z'
    }

    if (!systemPrompt.trim()) {
      newErrors.systemPrompt = 'System prompt is required'
    } else if (systemPrompt.length < 50) {
      newErrors.systemPrompt = 'System prompt should be at least 50 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [name, version, systemPrompt])

  const handleSave = useCallback(async () => {
    if (!validate()) return

    await onSave({
      name: name.trim(),
      version: version.trim(),
      engine,
      system_prompt: systemPrompt.trim(),
      description: description.trim() || undefined,
      is_active: isActive,
    })
  }, [name, version, engine, systemPrompt, description, isActive, validate, onSave])

  const insertVariable = useCallback((variable: string) => {
    const textarea = document.getElementById('system-prompt') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = systemPrompt.slice(0, start) + variable + systemPrompt.slice(end)
      setSystemPrompt(newValue)
      // Restore cursor position
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    } else {
      setSystemPrompt((prev) => prev + variable)
    }
  }, [systemPrompt])

  const characterCount = systemPrompt.length
  const wordCount = systemPrompt.trim().split(/\s+/).filter(Boolean).length

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{prompt ? 'Edit Prompt' : 'Create Prompt'}</CardTitle>
        <CardDescription>
          {prompt
            ? 'Modify the prompt configuration and content'
            : 'Create a new prompt version for content generation'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., GEO Content Generator"
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              className={cn(errors.version && 'border-destructive')}
            />
            {errors.version && <p className="text-xs text-destructive">{errors.version}</p>}
          </div>
        </div>

        {/* Engine selection */}
        <div className="space-y-2">
          <Label htmlFor="engine">Engine</Label>
          <Select value={engine} onValueChange={(v) => setEngine(v as Engine)}>
            <SelectTrigger id="engine">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ENGINE_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', config.color)} />
                    <span>{config.label}</span>
                    <span className="text-xs text-muted-foreground">- {config.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this prompt version"
          />
        </div>

        {/* Template variables */}
        <div className="space-y-2">
          <Label>Template Variables</Label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.map((variable) => (
              <Button
                key={variable.name}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertVariable(variable.name)}
                title={variable.description}
              >
                {variable.name}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Click a variable to insert it at cursor position
          </p>
        </div>

        {/* System prompt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>{characterCount} characters</span>
              <span>|</span>
              <span>{wordCount} words</span>
            </div>
          </div>
          <Textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter the system prompt for content generation..."
            className={cn('min-h-[300px] font-mono text-sm', errors.systemPrompt && 'border-destructive')}
          />
          {errors.systemPrompt && <p className="text-xs text-destructive">{errors.systemPrompt}</p>}
        </div>

        {/* Active status */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <h4 className="font-medium">Active Status</h4>
            <p className="text-sm text-muted-foreground">
              Set this prompt as the active version for {ENGINE_CONFIG[engine].label}
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

        {/* Metadata (for existing prompts) */}
        {prompt && (
          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="mb-2 text-sm font-medium">Metadata</h4>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>ID: {prompt.id}</span>
              <span>Created: {new Date(prompt.created_at).toLocaleString()}</span>
              {prompt.updated_at && (
                <span>Updated: {new Date(prompt.updated_at).toLocaleString()}</span>
              )}
              {prompt.is_active && <Badge variant="default">Active</Badge>}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : prompt ? 'Update Prompt' : 'Create Prompt'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export type { Engine, PromptVersion, PromptEditorProps }
