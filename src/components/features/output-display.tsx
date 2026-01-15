'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGenerationStore } from '@/store/generation-store'
import { useTranslation } from '@/lib/i18n/context'
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
import { GenerationBreakdown, type ActionPayload } from './generation-breakdown'
import { ABCompare } from './ab-compare'
import { ImageAltDisplay } from './geo-v2/image-alt-display'
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
  FileMd,
  ArrowsClockwise,
  Sparkle,
  Lightning,
  ShareNetwork,
  Link as LinkIcon,
  Warning,
  YoutubeLogo,
  Info,
  Image as ImageIcon,
} from '@phosphor-icons/react'
import {
  VIDEO_FORMAT_LABELS,
  CONTENT_TYPE_LABELS,
} from '@/types/geo-v2'
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
          <Check className="h-4 w-4" aria-hidden="true" />
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

// Regeneration focus area labels
const REGENERATION_LABELS: Record<string, { label: string; description: string }> = {
  regenerate_usps: { label: 'USPs', description: 'Enhancing unique selling points from playbook' },
  regenerate_grounded: { label: 'Grounding', description: 'Deepening web search for current trends' },
  regenerate_aligned: { label: 'Brand Alignment', description: 'Enforcing Samsung brand voice' },
  verify_claims: { label: 'Fact Check', description: 'Verifying all claims and statistics' },
  add_keywords: { label: 'Keywords', description: 'Improving keyword density and placement' },
  improve_structure: { label: 'Structure', description: 'Optimizing readability and flow' },
  regenerate_all: { label: 'Full', description: 'Complete regeneration with all enhancements' },
}

export function OutputDisplay() {
  const { t } = useTranslation()
  // Selective Zustand subscriptions for better performance
  const description = useGenerationStore((state) => state.description)
  const timestamps = useGenerationStore((state) => state.timestamps)
  const hashtags = useGenerationStore((state) => state.hashtags)
  const faq = useGenerationStore((state) => state.faq)
  const breakdown = useGenerationStore((state) => state.breakdown)
  const tuningMetadata = useGenerationStore((state) => state.tuningMetadata)
  const imageAltResult = useGenerationStore((state) => state.imageAltResult)
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
  const isGenerating = useGenerationStore((state) => state.isGenerating)
  const setIsGenerating = useGenerationStore((state) => state.setIsGenerating)
  const setOutput = useGenerationStore((state) => state.setOutput)
  const videoUrl = useGenerationStore((state) => state.videoUrl)
  const categoryId = useGenerationStore((state) => state.categoryId)
  const launchDate = useGenerationStore((state) => state.launchDate)
  // Samsung Standard Fields (P0-2)
  const videoFormat = useGenerationStore((state) => state.videoFormat)
  const contentType = useGenerationStore((state) => state.contentType)
  const useFixedHashtags = useGenerationStore((state) => state.useFixedHashtags)
  const vanityLinkCode = useGenerationStore((state) => state.vanityLinkCode)

  // AbortController for cancelable requests
  const abortControllerRef = useRef<AbortController | null>(null)

  // Track regeneration focus area for UX feedback
  const [regenerationFocus, setRegenerationFocus] = useState<string | null>(null)

  // Share functionality state
  const [isSharing, setIsSharing] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const hashtagsText = hashtags.join(' ')

  // Combined YouTube-ready content (P0-2)
  const youtubeReadyContent = useMemo(() => {
    let content = description || ''

    // Add vanity link if set
    if (vanityLinkCode) {
      content += `\n\nLearn more: http://smsng.co/${vanityLinkCode}_yt`
    }

    // For non-Shorts, add timestamps
    if (videoFormat !== 'shorts_9x16' && timestamps) {
      content += `\n\n⏱️ Timestamps:\n${timestamps}`
    }

    // For non-Shorts, add FAQ
    if (videoFormat !== 'shorts_9x16' && faq) {
      content += `\n\n${faq}`
    }

    // Add hashtags
    if (hashtags.length > 0) {
      content += `\n\n${hashtags.join(' ')}`
    }

    return content
  }, [description, timestamps, faq, hashtags, vanityLinkCode, videoFormat])

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
            imageAltResult: imageAltResult || null,
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
  }, [productId, generationId, srtContent, selectedKeywords, description, timestamps, hashtags, faq, campaignTag, imageAltResult, setIsSaving, setGenerationId, setGenerationStatus])

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

  const handleExportMarkdown = () => {
    let content = `# ${productName} - Content Export\n\n`
    content += `> Generated by Samsung GEO Tool\n\n`
    content += `**Keywords:** ${selectedKeywords.join(', ')}\n`
    if (campaignTag) content += `**Campaign:** ${campaignTag}\n`
    content += `**Exported:** ${format(new Date(), 'PPpp')}\n\n`
    content += `---\n\n`

    if (description) {
      content += `## 📝 Description\n\n${description}\n\n`
    }

    if (timestamps) {
      content += `## ⏱️ Timestamps\n\n\`\`\`\n${timestamps}\n\`\`\`\n\n`
    }

    if (hashtags.length > 0) {
      content += `## #️⃣ Hashtags\n\n${hashtags.map(tag => `\`${tag}\``).join(' ')}\n\n`
    }

    if (faq) {
      content += `## ❓ FAQ (Pinned Comment)\n\n${faq}\n\n`
    }

    if (breakdown?.qualityScores) {
      content += `## 📊 Quality Scores\n\n`
      content += `| Metric | Score |\n`
      content += `|--------|-------|\n`
      content += `| Overall | ${breakdown.qualityScores.overall}/100 |\n`
      content += `| Brand Voice | ${breakdown.qualityScores.brandVoice}/100 |\n`
      content += `| Keyword Integration | ${breakdown.qualityScores.keywordIntegration}/100 |\n`
      content += `| GEO Optimization | ${breakdown.qualityScores.geoOptimization}/100 |\n`
      content += `| FAQ Quality | ${breakdown.qualityScores.faqQuality}/100 |\n\n`
    }

    content += `---\n\n*Generated with Samsung GEO Tool*\n`

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${productName?.replace(/\s+/g, '_') || 'generation'}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Exported as Markdown')
  }

  // Handle sharing generation with a unique link
  const handleShare = useCallback(async () => {
    // Must save first before sharing
    if (!generationId) {
      toast.error('Please save the generation first before sharing')
      return
    }

    setIsSharing(true)
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationId }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const shareUrl = `${window.location.origin}/share/${data.shareToken}`
      setShareToken(data.shareToken)

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied to clipboard!')
    } catch (error) {
      console.error('Share error:', error)
      toast.error('Failed to generate share link')
    } finally {
      setIsSharing(false)
    }
  }, [generationId])

  // Handler for breakdown actions (regeneration with specific fixes)
  const handleBreakdownAction = useCallback(async (action: ActionPayload) => {
    console.log('[Regenerate] Action triggered:', action.type)

    if (action.type === 'copy_fix' && action.details) {
      try {
        await navigator.clipboard.writeText(action.details)
        toast.success('Recommendation copied to clipboard')
      } catch {
        toast.error('Failed to copy')
      }
      return
    }

    // Validate required data before proceeding
    console.log('[Regenerate] Data check:', {
      productName,
      hasSrtContent: !!srtContent,
      srtContentLength: srtContent?.length || 0,
      selectedKeywords,
      videoUrl,
      categoryId,
    })

    if (!productName) {
      console.error('[Regenerate] Missing productName - cannot regenerate')
      toast.error('Missing product name. Please go back and select a product.')
      return
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    console.log('[Regenerate] Setting isGenerating to true')
    setIsGenerating(true)
    setRegenerationFocus(action.type)
    try {
      // Build regeneration config based on action type
      const regenerationConfig: Record<string, unknown> = {
        focusArea: action.type,
        metric: action.metric,
      }

      // Map action types to pipeline configurations
      switch (action.type) {
        case 'regenerate_usps':
          regenerationConfig.enhanceUSPs = true
          regenerationConfig.prioritizePlaybook = true
          break
        case 'regenerate_grounded':
          regenerationConfig.enhanceGrounding = true
          regenerationConfig.deeperWebSearch = true
          break
        case 'regenerate_aligned':
          regenerationConfig.strictBrandAlignment = true
          regenerationConfig.playbookEnforcement = true
          break
        case 'verify_claims':
          regenerationConfig.verifyClaims = true
          regenerationConfig.factChecking = true
          break
        case 'add_keywords':
          regenerationConfig.enhanceKeywordDensity = true
          break
        case 'improve_structure':
          regenerationConfig.improveStructure = true
          regenerationConfig.optimizeReadability = true
          break
        case 'regenerate_all':
          regenerationConfig.fullRegeneration = true
          regenerationConfig.enhanceUSPs = true
          regenerationConfig.enhanceGrounding = true
          regenerationConfig.strictBrandAlignment = true
          break
      }

      const requestBody = {
        productName,
        youtubeUrl: videoUrl || '',
        srtContent,
        keywords: selectedKeywords,
        productCategory: categoryId || 'all',
        usePlaybook: true,
        launchDate: launchDate?.toISOString(),
        pipelineConfig: 'full',
        language: 'ko',
        regenerationConfig,
      }

      console.log('[Regenerate] Making API request with:', {
        ...requestBody,
        srtContent: `${(srtContent || '').substring(0, 100)}... (${(srtContent || '').length} chars)`,
      })

      const response = await fetch('/api/generate-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      })

      console.log('[Regenerate] API response status:', response.status)
      const data = await response.json()
      console.log('[Regenerate] API response data:', data.error ? `Error: ${data.error}` : 'Success')

      if (data.error) {
        throw new Error(data.error)
      }

      // Map v2 response to store format
      const newDescription = typeof data.description === 'object'
        ? data.description.full
        : data.description || ''

      const newTimestamps = typeof data.chapters === 'object'
        ? data.chapters.timestamps
        : data.timestamps || ''

      const faqContent = data.faq?.faqs
        ? data.faq.faqs.map((f: { question: string; answer: string }) =>
            `Q: ${f.question}\nA: ${f.answer}`
          ).join('\n\n')
        : data.faq || ''

      // Build breakdown from v2 grounding metadata
      const newBreakdown = data.groundingMetadata ? {
        playbookInfluence: {
          sectionsUsed: data.groundingMetadata.sources
            ?.filter((s: { tier: string }) => s.tier === 'official')
            .map((s: { title: string }) => s.title)
            .slice(0, 5) || [],
          guidelinesApplied: data.groundingMetadata.sources?.length || 0,
          confidence: data.finalScore?.groundingQuality?.sourceAuthority || 70,
        },
        groundingInfluence: {
          topSignals: data.groundingMetadata.webSearchQueries?.slice(0, 5).map(
            (q: string, i: number) => ({ term: q, score: 100 - i * 15 })
          ) || [],
          signalsApplied: data.groundingMetadata.totalCitations || 0,
        },
        userInputInfluence: {
          keywordsIntegrated: selectedKeywords,
          timestampsGenerated: newTimestamps.split('\n').filter(Boolean).length,
        },
        qualityScores: data.finalScore ? {
          overall: Math.round(data.finalScore.total || 0),
          brandVoice: Math.round((data.finalScore.sentenceStructure || 0) * 7),
          keywordIntegration: Math.round((data.finalScore.keywordDensity || 0) * 5),
          geoOptimization: Math.round((data.finalScore.aiExposure || 0) * 4),
          faqQuality: Math.round((data.finalScore.questionPatterns || 0) * 5),
          refined: true,
        } : undefined,
      } : undefined

      setOutput({
        description: newDescription,
        timestamps: newTimestamps,
        hashtags: data.hashtags || [],
        faq: faqContent,
        breakdown: newBreakdown,
        tuningMetadata: data.tuningMetadata,
        imageAltResult: data.imageAltResult,
      })

      console.log('[Regenerate] Success! Setting output')
      toast.success(`Content regenerated with ${action.type.replace(/_/g, ' ')} focus`)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[Regenerate] Request was aborted')
        return
      }
      console.error('[Regenerate] Failed:', error)
      toast.error('Failed to regenerate content')
    } finally {
      console.log('[Regenerate] Finally block - setting isGenerating to false')
      setIsGenerating(false)
      setRegenerationFocus(null)
    }
  }, [productName, videoUrl, srtContent, selectedKeywords, categoryId, launchDate, setIsGenerating, setOutput])

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
      {/* Summary with Refined Badge */}
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
          {/* Prominent Refined Badge when content has been regenerated */}
          {breakdown?.qualityScores?.refined && (
            <Badge variant="default" className="gap-1.5 px-3">
              <Sparkle className="h-3.5 w-3.5" weight="fill" />
              Refined
            </Badge>
          )}
        </div>
      </motion.div>

      {/* YouTube Ready Preview (P0-2) */}
      <motion.div variants={MOTION_VARIANTS.staggerItem}>
        <Card className="border-[#040523]/10 dark:border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-[#040523] dark:text-slate-100">
                <YoutubeLogo className="h-4 w-4 text-[#040523]/60 dark:text-slate-400" weight="fill" />
                {t.samsung.youtubePreview.title}
              </CardTitle>
              <CopyButton text={youtubeReadyContent} label="YouTube Description" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-[#040523]/[0.02] dark:bg-[#040523]/10 border border-[#040523]/10 dark:border-slate-700 font-mono text-sm max-h-[300px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-xs text-[#040523]/80 dark:text-slate-300">
                {youtubeReadyContent}
              </pre>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-[#040523]/60 dark:text-slate-500">
                {t.samsung.youtubePreview.characterCount.replace('{count}', String(youtubeReadyContent.length))} / 5,000
              </p>
              {youtubeReadyContent.length > 5000 && (
                <Badge variant="outline" className="text-xs border-[#040523]/30 dark:border-slate-600 text-[#040523]/70 dark:text-slate-400">
                  {t.samsung.youtubePreview.exceedsLimit}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Regeneration Status Indicator */}
      {isGenerating && regenerationFocus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-lg border border-[#040523]/20 dark:border-slate-700 bg-[#040523]/5 dark:bg-[#040523]/20 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ArrowsClockwise className="h-5 w-5 text-[#040523] dark:text-slate-200 animate-spin" />
              <Lightning className="h-3 w-3 text-[#040523] dark:text-slate-200 absolute -top-1 -right-1" weight="fill" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#040523] dark:text-slate-200">
                  Regenerating: {REGENERATION_LABELS[regenerationFocus]?.label || 'Content'}
                </span>
                <Badge variant="outline" className="text-xs border-[#040523]/20 dark:border-slate-600 text-[#040523]/70 dark:text-slate-400">
                  Focus Area
                </Badge>
              </div>
              <p className="text-sm text-[#040523]/60 dark:text-slate-400 mt-0.5">
                {REGENERATION_LABELS[regenerationFocus]?.description || 'Improving content quality...'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Generation Breakdown - Shows signal fusion transparency */}
      {breakdown && (
        <motion.div variants={MOTION_VARIANTS.staggerItem}>
          <GenerationBreakdown
            breakdown={breakdown}
            tuningMetadata={tuningMetadata}
            onAction={handleBreakdownAction}
            isRegenerating={isGenerating}
          />
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

      {/* Timestamps - Hidden for Shorts format (P0-2) */}
      {timestamps && videoFormat !== 'shorts_9x16' && (
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

      {/* FAQ - Hidden for Shorts format (P0-2) */}
      {faq && videoFormat !== 'shorts_9x16' && (
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

      {/* Image Alt Text */}
      {imageAltResult && (
        <motion.div variants={MOTION_VARIANTS.staggerItem}>
          <ImageAltDisplay imageAltResult={imageAltResult} language="ko" />
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
              <DropdownMenuItem onClick={handleExportMarkdown} className="gap-2">
                <FileMd className="h-4 w-4" />
                Export as Markdown
              </DropdownMenuItem>
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

          {/* Share Button */}
          <Button
            variant="outline"
            className="gap-2 w-full sm:w-auto min-h-[44px]"
            onClick={handleShare}
            disabled={isSharing || !generationId}
            title={!generationId ? 'Save the generation first to share' : 'Share this generation'}
          >
            {isSharing ? (
              <SpinnerGap className="h-4 w-4 animate-spin" />
            ) : shareToken ? (
              <LinkIcon className="h-4 w-4" />
            ) : (
              <ShareNetwork className="h-4 w-4" />
            )}
            <span className="hidden xs:inline">{shareToken ? 'Copy Link' : 'Share'}</span>
            <span className="xs:hidden">{shareToken ? 'Link' : 'Share'}</span>
          </Button>

          {/* A/B Compare (only show if generation has been saved) */}
          {generationId && (
            <ABCompare generationId={generationId} />
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
