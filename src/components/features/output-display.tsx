'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGenerationStore } from '@/store/generation-store'
import { MOTION_VARIANTS, ICON_SIZES } from '@/lib/constants/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GenerationBreakdown } from './generation-breakdown'
import {
  Copy,
  Check,
  TextAlignLeft,
  Clock,
  Hash,
  ChatCircleText,
  FloppyDisk,
  CheckCircle,
  SpinnerGap,
  Download,
  CaretDown,
  FileText,
  FileTxt,
  FileJs,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface CopyButtonProps {
  text: string
  label: string
}

function CopyButton({ text, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(`${label} copied to clipboard`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="gap-1.5 h-8"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      aria-live="polite"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copy
        </>
      )}
    </Button>
  )
}

export function OutputDisplay() {
  // Selective Zustand subscriptions for better performance
  const description = useGenerationStore((state) => state.description)
  const timestamps = useGenerationStore((state) => state.timestamps)
  const hashtags = useGenerationStore((state) => state.hashtags)
  const faq = useGenerationStore((state) => state.faq)
  const breakdown = useGenerationStore((state) => state.breakdown)
  const productName = useGenerationStore((state) => state.productName)
  const productId = useGenerationStore((state) => state.productId)
  const selectedKeywords = useGenerationStore((state) => state.selectedKeywords)
  const srtContent = useGenerationStore((state) => state.srtContent)
  const campaignTag = useGenerationStore((state) => state.campaignTag)
  const generationId = useGenerationStore((state) => state.generationId)
  const generationStatus = useGenerationStore((state) => state.generationStatus)
  const isSaving = useGenerationStore((state) => state.isSaving)
  const setGenerationId = useGenerationStore((state) => state.setGenerationId)
  const setGenerationStatus = useGenerationStore((state) => state.setGenerationStatus)
  const setIsSaving = useGenerationStore((state) => state.setIsSaving)

  // AbortController for cancelable requests
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const hashtagsText = hashtags.join(' ')

  const handleSave = useCallback(async (status: 'draft' | 'confirmed') => {
    if (!productId) {
      toast.error('No product selected')
      return
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsSaving(true)
    try {
      if (generationId) {
        // Update existing generation
        const response = await fetch('/api/generations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: generationId, status }),
          signal: abortControllerRef.current.signal,
        })
        const data = await response.json()
        if (data.error) {
          throw new Error(data.error)
        }
        setGenerationStatus(status)
        toast.success(status === 'confirmed' ? 'Marked as confirmed!' : 'Saved as draft!')
      } else {
        // Create new generation
        const response = await fetch('/api/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            srtContent,
            selectedKeywords,
            description,
            timestamps,
            hashtags,
            faq,
            status,
            campaignTag: campaignTag || null,
          }),
          signal: abortControllerRef.current.signal,
        })
        const data = await response.json()
        if (data.error) {
          throw new Error(data.error)
        }
        setGenerationId(data.generation.id)
        setGenerationStatus(status)
        toast.success(status === 'confirmed' ? 'Saved and confirmed!' : 'Saved as draft!')
      }
    } catch (error) {
      // Ignore aborted requests
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Save error:', error)
      toast.error('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [productId, generationId, srtContent, selectedKeywords, description, timestamps, hashtags, faq, campaignTag, setIsSaving, setGenerationId, setGenerationStatus])

  const handleExportJSON = () => {
    const exportData = {
      metadata: {
        productName,
        productId,
        selectedKeywords,
        campaignTag,
        generationId,
        generationStatus,
        exportedAt: new Date().toISOString(),
      },
      content: {
        description,
        timestamps,
        hashtags,
        faq,
      },
      breakdown,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${productName?.replace(/\s+/g, '_') || 'generation'}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Exported as JSON')
  }

  const handleExportTXT = () => {
    let content = `Samsung GEO Tool - Content Export\n`
    content += `${'='.repeat(50)}\n\n`
    content += `Product: ${productName}\n`
    content += `Keywords: ${selectedKeywords.join(', ')}\n`
    if (campaignTag) content += `Campaign: ${campaignTag}\n`
    content += `Exported: ${format(new Date(), 'PPpp')}\n\n`

    if (description) {
      content += `DESCRIPTION\n${'-'.repeat(30)}\n${description}\n\n`
    }

    if (timestamps) {
      content += `TIMESTAMPS\n${'-'.repeat(30)}\n${timestamps}\n\n`
    }

    if (hashtags.length > 0) {
      content += `HASHTAGS\n${'-'.repeat(30)}\n${hashtags.join(' ')}\n\n`
    }

    if (faq) {
      content += `FAQ (Pinned Comment)\n${'-'.repeat(30)}\n${faq}\n\n`
    }

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${productName?.replace(/\s+/g, '_') || 'generation'}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Exported as TXT')
  }

  const handleExportForYouTube = () => {
    // Format specifically for YouTube description
    let content = description || ''

    if (timestamps) {
      content += `\n\n⏱️ Timestamps:\n${timestamps}`
    }

    if (hashtags.length > 0) {
      content += `\n\n${hashtags.join(' ')}`
    }

    navigator.clipboard.writeText(content)
    toast.success('YouTube-ready content copied to clipboard')
  }

  if (!description && !timestamps && hashtags.length === 0 && !faq) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No generated content yet.</p>
        <p className="text-sm mt-1">Complete the previous steps to generate content.</p>
      </div>
    )
  }

  return (
    <motion.div
      variants={MOTION_VARIANTS.staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Summary */}
      <motion.div variants={MOTION_VARIANTS.staggerItem}>
        <div className="flex items-center gap-4 flex-wrap">
          <Badge variant="outline" className="text-sm">
            {productName}
          </Badge>
          {selectedKeywords.map((keyword) => (
            <Badge key={keyword} variant="secondary" className="text-sm">
              {keyword}
            </Badge>
          ))}
        </div>
      </motion.div>

      {/* Generation Breakdown - Shows signal fusion transparency */}
      {breakdown && (
        <motion.div variants={MOTION_VARIANTS.staggerItem}>
          <GenerationBreakdown breakdown={breakdown} />
        </motion.div>
      )}

      {/* Description */}
      {description && (
        <motion.div variants={MOTION_VARIANTS.staggerItem}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TextAlignLeft className="h-4 w-4" />
                  Description
                </CardTitle>
                <CopyButton text={description} label="Description" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Timestamps */}
      {timestamps && (
        <motion.div variants={MOTION_VARIANTS.staggerItem}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timestamps
                </CardTitle>
                <CopyButton text={timestamps} label="Timestamps" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/50 border font-mono text-sm">
                <pre className="whitespace-pre-wrap">{timestamps}</pre>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Hashtags */}
      {hashtags.length > 0 && (
        <motion.div variants={MOTION_VARIANTS.staggerItem}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Hashtags
                </CardTitle>
                <CopyButton text={hashtagsText} label="Hashtags" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="text-sm font-normal"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* FAQ */}
      {faq && (
        <motion.div variants={MOTION_VARIANTS.staggerItem}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ChatCircleText className="h-4 w-4" />
                  FAQ (Pinned Comment)
                </CardTitle>
                <CopyButton text={faq} label="FAQ" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {faq}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Separator />

      {/* Action Buttons */}
      <motion.div variants={MOTION_VARIANTS.staggerItem} className="space-y-3 sm:space-y-0">
        {generationStatus !== 'unsaved' && (
          <Badge
            variant={generationStatus === 'confirmed' ? 'default' : 'secondary'}
            className="mb-3 sm:mb-0 sm:mr-3"
          >
            {generationStatus === 'confirmed' ? 'Confirmed' : 'Draft'}
          </Badge>
        )}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            className="gap-2 w-full sm:w-auto min-h-[44px]"
            onClick={() => handleSave('draft')}
            disabled={isSaving || generationStatus === 'draft'}
          >
            {isSaving ? (
              <SpinnerGap className="h-4 w-4 animate-spin" />
            ) : (
              <FloppyDisk className="h-4 w-4" />
            )}
            {generationStatus === 'draft' ? 'Saved' : 'Save as Draft'}
          </Button>
          <Button
            className="gap-2 w-full sm:w-auto min-h-[44px]"
            onClick={() => handleSave('confirmed')}
            disabled={isSaving || generationStatus === 'confirmed'}
          >
            {isSaving ? (
              <SpinnerGap className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span className="hidden xs:inline">{generationStatus === 'confirmed' ? 'Confirmed' : 'Mark as Confirmed'}</span>
            <span className="xs:hidden">{generationStatus === 'confirmed' ? 'Confirmed' : 'Confirm'}</span>
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 w-full sm:w-auto min-h-[44px]">
                <Download className="h-4 w-4" />
                Export
                <CaretDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportForYouTube} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy for YouTube
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportTXT} className="gap-2">
                <FileTxt className="h-4 w-4" />
                Export as TXT
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON} className="gap-2">
                <FileJs className="h-4 w-4" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    </motion.div>
  )
}
