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

export function SaveTemplateDialog({ onSaved }: SaveTemplateDialogProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [description, setDescription] = useState('')
  const [includeKeywords, setIncludeKeywords] = useState(true)
  const [includeCampaignTag, setIncludeCampaignTag] = useState(true)
  const [includeProduct, setIncludeProduct] = useState(true)

  const {
    productId,
    productName,
    selectedKeywords,
    campaignTag,
    briefUsps,
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
          keywords: includeKeywords ? selectedKeywords : [],
          campaign_tag: includeCampaignTag ? campaignTag : null,
          brief_usps: briefUsps,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FloppyDisk className="h-5 w-5 text-primary" />
            Save Configuration as Template
          </DialogTitle>
          <DialogDescription>
            Save your current settings for quick reuse in future generations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Galaxy S25 Launch Campaign"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="template-description">Description (optional)</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of when to use this template..."
              rows={2}
            />
          </div>

          {/* What to Include */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Include in Template</Label>

            {/* Product */}
            {productId && (
              <div className="flex items-start space-x-3 rounded-lg border p-3">
                <Checkbox
                  id="include-product"
                  checked={includeProduct}
                  onCheckedChange={(checked) => setIncludeProduct(!!checked)}
                />
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor="include-product"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Product
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {productName}
                  </p>
                </div>
              </div>
            )}

            {/* Keywords */}
            {selectedKeywords.length > 0 && (
              <div className="flex items-start space-x-3 rounded-lg border p-3">
                <Checkbox
                  id="include-keywords"
                  checked={includeKeywords}
                  onCheckedChange={(checked) => setIncludeKeywords(!!checked)}
                />
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor="include-keywords"
                    className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    Keywords
                  </label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedKeywords.map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Campaign Tag */}
            {campaignTag && (
              <div className="flex items-start space-x-3 rounded-lg border p-3">
                <Checkbox
                  id="include-campaign"
                  checked={includeCampaignTag}
                  onCheckedChange={(checked) => setIncludeCampaignTag(!!checked)}
                />
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor="include-campaign"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Campaign Tag
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {campaignTag}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Templates can be loaded from the Product Selection step to quickly apply saved configurations.
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
