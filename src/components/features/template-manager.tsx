'use client'

import { useState } from 'react'
import { useGenerationStore } from '@/store/generation-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  FloppyDisk,
  SpinnerGap,
  CheckCircle,
  Tag,
  BookmarkSimple,
  Info,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface SaveTemplateDialogProps {
  onSaved?: () => void
}

// Props for saving a brief as a template
interface SaveBriefAsTemplateProps {
  briefData: {
    usps: string[]
    content?: string | null
    isActive?: boolean
    categoryId?: string | null
  }
  productName?: string
  onSaved?: (templateId: string) => void
  disabled?: boolean
}

/**
 * Button to save a brief as a reusable template
 */
export function SaveBriefAsTemplateButton({
  briefData,
  productName,
  onSaved,
  disabled,
}: SaveBriefAsTemplateProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [description, setDescription] = useState('')

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setTemplateName(productName ? `${productName} Template` : '')
      setDescription('')
    }
  }

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Template name is required')
      return
    }

    if (briefData.usps.length === 0) {
      toast.error('At least one USP is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          description: description.trim() || null,
          brief_usps: briefData.usps,
          brief_defaults: {
            content: briefData.content || undefined,
            isActive: briefData.isActive ?? true,
          },
          category_id: briefData.categoryId || null,
          is_brief_template: true,
        }),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      toast.success('Template saved successfully')
      setOpen(false)
      onSaved?.(data.template.id)
    } catch (error) {
      console.error('Failed to save brief template:', error)
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={disabled}>
          <FloppyDisk className="h-4 w-4" />
          Save as Template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FloppyDisk className="h-5 w-5" />
            Save Brief as Template
          </DialogTitle>
          <DialogDescription>
            Save this brief configuration for quick reuse in the future.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="brief-template-name">Template Name *</Label>
            <Input
              id="brief-template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Product Launch Brief"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brief-template-description">Description (optional)</Label>
            <Textarea
              id="brief-template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When to use this template..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">USPs to Include</Label>
            <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg min-h-[60px]">
              {briefData.usps.length > 0 ? (
                briefData.usps.map((usp, i) => (
                  <Badge key={i} variant="secondary" className="text-xs font-normal">
                    {usp.length > 40 ? usp.slice(0, 40) + '...' : usp}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No USPs to include</p>
              )}
            </div>
          </div>

          {briefData.content && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Additional Content</Label>
              <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg line-clamp-3">
                {briefData.content}
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              This template can be used to quickly create new briefs with the same USPs and content.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !templateName.trim()} className="gap-2">
            {saving ? (
              <>
                <SpinnerGap className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SaveTemplateDialog({ onSaved }: SaveTemplateDialogProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [description, setDescription] = useState('')
  const [includeKeywords, setIncludeKeywords] = useState(true)
  const [includeCampaignTag, setIncludeCampaignTag] = useState(true)
  const [includeProduct, setIncludeProduct] = useState(true)
  const [includeBriefUsps, setIncludeBriefUsps] = useState(true)

  const {
    productId,
    productName,
    selectedKeywords,
    campaignTag,
    briefUsps,
    categoryId,
  } = useGenerationStore()

  // Check if there's enough data to save as template
  const hasData = selectedKeywords.length > 0 || campaignTag || briefUsps.length > 0

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Template name is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          description: description.trim() || null,
          product_id: includeProduct ? productId : null,
          category_id: includeProduct ? categoryId : null,
          keywords: includeKeywords ? selectedKeywords : [],
          campaign_tag: includeCampaignTag ? campaignTag : null,
          brief_usps: includeBriefUsps ? briefUsps : [],
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      toast.success('Template saved successfully')
      setOpen(false)
      setTemplateName('')
      setDescription('')
      onSaved?.()
    } catch (error) {
      console.error('Failed to save template:', error)
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  if (!hasData) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookmarkSimple className="h-4 w-4" />
          Save as Template
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <FloppyDisk className="h-6 w-6 text-primary" />
            </div>
            Save Configuration as Template
          </DialogTitle>
          <DialogDescription className="text-sm mt-2">
            Save your current settings for quick reuse in future content generations.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Template Info */}
            <div className="space-y-5">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Template Information
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="template-name" className="text-sm font-medium">
                    Template Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Galaxy S25 Launch Campaign"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="template-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="When should this template be used? What's it optimized for?"
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Quick Tip</p>
                  <p className="text-blue-600 dark:text-blue-300">
                    Templates can be loaded from the Product Selection step to quickly apply saved configurations.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - What to Include */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Include in Template
              </h3>

              <div className="space-y-3">
                {/* Product */}
                {productId && (
                  <label
                    htmlFor="include-product"
                    className="flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <Checkbox
                      id="include-product"
                      checked={includeProduct}
                      onCheckedChange={(checked) => setIncludeProduct(!!checked)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">Product</div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {productName}
                      </p>
                    </div>
                  </label>
                )}

                {/* Keywords */}
                {selectedKeywords.length > 0 && (
                  <label
                    htmlFor="include-keywords"
                    className="flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <Checkbox
                      id="include-keywords"
                      checked={includeKeywords}
                      onCheckedChange={(checked) => setIncludeKeywords(!!checked)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Keywords ({selectedKeywords.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedKeywords.map((kw, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </label>
                )}

                {/* Brief USPs */}
                {briefUsps.length > 0 && (
                  <label
                    htmlFor="include-brief-usps"
                    className="flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <Checkbox
                      id="include-brief-usps"
                      checked={includeBriefUsps}
                      onCheckedChange={(checked) => setIncludeBriefUsps(!!checked)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">Brief USPs ({briefUsps.length})</div>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {briefUsps.slice(0, 3).map((usp, i) => (
                          <li key={i} className="truncate">
                            {i + 1}. {usp}
                          </li>
                        ))}
                        {briefUsps.length > 3 && (
                          <li className="text-xs">+ {briefUsps.length - 3} more...</li>
                        )}
                      </ul>
                    </div>
                  </label>
                )}

                {/* Campaign Tag */}
                {campaignTag && (
                  <label
                    htmlFor="include-campaign"
                    className="flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <Checkbox
                      id="include-campaign"
                      checked={includeCampaignTag}
                      onCheckedChange={(checked) => setIncludeCampaignTag(!!checked)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">Campaign Tag</div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {campaignTag}
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !templateName.trim()}
            className="gap-2 min-w-[140px]"
          >
            {saving ? (
              <>
                <SpinnerGap className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
