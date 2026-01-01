'use client'

import { useCallback, useState } from 'react'
import { useGenerationStore } from '@/store/generation-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UploadSimple, FileText, Warning, CheckCircle, Clock, TextAa, Hash, Info } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// Minimum requirements for meaningful content generation
const MIN_WORD_COUNT = 50
const MIN_SEGMENTS = 3
const RECOMMENDED_WORD_COUNT = 200

interface SrtValidationResult {
  valid: boolean
  error: string | null
  warnings: string[]
  stats: {
    wordCount: number
    charCount: number
    segmentCount: number
    duration: string
    avgWordsPerSegment: number
  } | null
}

export function SrtInput() {
  const { videoUrl, srtContent, setVideoUrl, setSrtContent } = useGenerationStore()
  const [parseError, setParseError] = useState<string | null>(null)
  const [parseWarnings, setParseWarnings] = useState<string[]>([])
  const [contentStats, setContentStats] = useState<SrtValidationResult['stats']>(null)
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload')

  const parseSrt = useCallback((content: string): SrtValidationResult => {
    const lines = content.trim().split('\n')
    const warnings: string[] = []

    // Check minimum line count
    if (lines.length < 4) {
      return {
        valid: false,
        error: 'SRT content is too short. Please provide at least one complete subtitle segment (sequence number, timestamp, and text).',
        warnings: [],
        stats: null
      }
    }

    // Timestamp pattern with capture groups for duration calculation
    const timestampPattern = /(\d{2}):(\d{2}):(\d{2})[,.:]\d{3}\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.:]\d{3}/
    const sequencePattern = /^\d+$/

    // Parse segments to validate structure and extract stats
    let segmentCount = 0
    let firstTimestamp: number | null = null
    let lastTimestamp: number | null = null
    let textLines: string[] = []
    let currentSegmentHasTimestamp = false
    let currentSegmentHasText = false
    let malformedSegments = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Sequence number
      if (sequencePattern.test(line)) {
        // Check if previous segment was complete
        if (currentSegmentHasTimestamp && !currentSegmentHasText) {
          malformedSegments++
        }
        currentSegmentHasTimestamp = false
        currentSegmentHasText = false
        continue
      }

      // Timestamp line
      const timestampMatch = line.match(timestampPattern)
      if (timestampMatch) {
        currentSegmentHasTimestamp = true
        segmentCount++

        // Calculate time in seconds for duration
        const startSeconds = parseInt(timestampMatch[1]) * 3600 + parseInt(timestampMatch[2]) * 60 + parseInt(timestampMatch[3])
        const endSeconds = parseInt(timestampMatch[4]) * 3600 + parseInt(timestampMatch[5]) * 60 + parseInt(timestampMatch[6])

        if (firstTimestamp === null) firstTimestamp = startSeconds
        lastTimestamp = endSeconds
        continue
      }

      // Text content (non-empty, non-sequence, non-timestamp)
      if (line && !sequencePattern.test(line)) {
        currentSegmentHasText = true
        textLines.push(line)
      }
    }

    // Check for timestamps
    if (segmentCount === 0) {
      return {
        valid: false,
        error: 'No valid SRT timestamps found. Expected format: 00:00:00,000 --> 00:00:05,000',
        warnings: [],
        stats: null
      }
    }

    // Calculate text statistics
    const allText = textLines.join(' ')
    const wordCount = allText.split(/\s+/).filter(w => w.length > 0).length
    const charCount = allText.replace(/\s/g, '').length
    const avgWordsPerSegment = segmentCount > 0 ? Math.round(wordCount / segmentCount) : 0

    // Calculate duration
    let duration = '0:00'
    if (firstTimestamp !== null && lastTimestamp !== null) {
      const totalSeconds = lastTimestamp - firstTimestamp
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      duration = `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    // Validate minimum requirements
    if (segmentCount < MIN_SEGMENTS) {
      return {
        valid: false,
        error: `Too few subtitle segments (${segmentCount}). Minimum ${MIN_SEGMENTS} segments required for meaningful content generation.`,
        warnings: [],
        stats: { wordCount, charCount, segmentCount, duration, avgWordsPerSegment }
      }
    }

    if (wordCount < MIN_WORD_COUNT) {
      return {
        valid: false,
        error: `Insufficient text content (${wordCount} words). Minimum ${MIN_WORD_COUNT} words required. Consider using a longer video transcript.`,
        warnings: [],
        stats: { wordCount, charCount, segmentCount, duration, avgWordsPerSegment }
      }
    }

    // Generate warnings for suboptimal content
    if (wordCount < RECOMMENDED_WORD_COUNT) {
      warnings.push(`Content has ${wordCount} words. ${RECOMMENDED_WORD_COUNT}+ words recommended for better AI generation quality.`)
    }

    if (malformedSegments > 0) {
      warnings.push(`${malformedSegments} segment(s) may be malformed (missing text after timestamp).`)
    }

    if (avgWordsPerSegment < 3) {
      warnings.push('Very short subtitles detected. Consider using a transcript with more descriptive content.')
    }

    return {
      valid: true,
      error: null,
      warnings,
      stats: { wordCount, charCount, segmentCount, duration, avgWordsPerSegment }
    }
  }, [])

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        const result = parseSrt(content)
        setSrtContent(content)
        setParseError(result.error)
        setParseWarnings(result.warnings)
        setContentStats(result.stats)
      }
      reader.readAsText(file)
    },
    [parseSrt, setSrtContent]
  )

  const handlePaste = useCallback(
    (content: string) => {
      setSrtContent(content)
      if (content.trim()) {
        const result = parseSrt(content)
        setParseError(result.error)
        setParseWarnings(result.warnings)
        setContentStats(result.stats)
      } else {
        setParseError(null)
        setParseWarnings([])
        setContentStats(null)
      }
    },
    [parseSrt, setSrtContent]
  )

  const previewLines = srtContent
    .split('\n')
    .slice(0, 15)
    .join('\n')

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <Label htmlFor="video-url" className="text-sm sm:text-base">
          Video URL
          <span className="text-muted-foreground font-normal ml-2">(optional)</span>
        </Label>
        <Input
          id="video-url"
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="mt-1.5"
        />
      </div>

      <div>
        <Label className="mb-3 block text-sm sm:text-base">
          SRT Subtitle File <span className="text-destructive">*</span>
        </Label>

        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'upload' | 'paste')}>
          <TabsList className="mb-4">
            <TabsTrigger value="upload" className="gap-1.5 sm:gap-2 min-h-[40px]">
              <UploadSimple className="h-4 w-4" />
              <span className="hidden xs:inline">Upload File</span>
              <span className="xs:hidden">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="paste" className="gap-1.5 sm:gap-2 min-h-[40px]">
              <FileText className="h-4 w-4" />
              <span className="hidden xs:inline">Paste Text</span>
              <span className="xs:hidden">Paste</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div className="border-2 border-dashed rounded-lg p-4 sm:p-8 text-center hover:border-primary/50 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
              <input
                type="file"
                accept=".srt,.txt"
                onChange={handleFileUpload}
                className="sr-only"
                id="srt-upload"
                aria-label="Upload SRT subtitle file"
                aria-describedby="upload-hint"
              />
              <label htmlFor="srt-upload" className="cursor-pointer block">
                <UploadSimple className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" aria-hidden="true" />
                <p className="font-medium text-sm sm:text-base">Click to upload SRT file</p>
                <p id="upload-hint" className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Accepts .srt and .txt files
                </p>
              </label>
            </div>
          </TabsContent>

          <TabsContent value="paste">
            <Textarea
              value={srtContent}
              onChange={(e) => handlePaste(e.target.value)}
              placeholder="Paste SRT content here...

1
00:00:00,000 --> 00:00:05,000
First subtitle text

2
00:00:05,000 --> 00:00:10,000
Second subtitle text"
              className="min-h-[200px] font-mono text-sm"
            />
          </TabsContent>
        </Tabs>

        {/* Error Display */}
        {parseError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm"
          >
            <div className="flex items-start gap-2 text-destructive">
              <Warning className="h-5 w-5 mt-0.5 flex-shrink-0" weight="fill" aria-hidden="true" />
              <div>
                <p className="font-medium">Validation Error</p>
                <p className="mt-1">{parseError}</p>
              </div>
            </div>
            {contentStats && (
              <div className="mt-3 pt-3 border-t border-destructive/20 flex flex-wrap gap-4 text-xs text-destructive/80">
                <span><TextAa className="h-3.5 w-3.5 inline mr-1" />{contentStats.wordCount} words</span>
                <span><Hash className="h-3.5 w-3.5 inline mr-1" />{contentStats.segmentCount} segments</span>
                <span><Clock className="h-3.5 w-3.5 inline mr-1" />{contentStats.duration}</span>
              </div>
            )}
          </div>
        )}

        {/* Warnings Display */}
        {!parseError && parseWarnings.length > 0 && (
          <div
            role="status"
            className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm"
          >
            <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
              <Info className="h-5 w-5 mt-0.5 flex-shrink-0" weight="fill" aria-hidden="true" />
              <div>
                <p className="font-medium">Recommendations</p>
                <ul className="mt-1 space-y-1">
                  {parseWarnings.map((warning, i) => (
                    <li key={i} className="text-amber-700 dark:text-amber-300">• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Statistics */}
      {srtContent && contentStats && !parseError && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="block">Content Analysis</Label>
            <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" weight="fill" />
              Valid SRT
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <TextAa className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className={cn(
                "text-lg font-bold mt-1",
                contentStats.wordCount >= RECOMMENDED_WORD_COUNT ? "text-green-600 dark:text-green-400" :
                contentStats.wordCount >= MIN_WORD_COUNT ? "text-amber-600 dark:text-amber-400" :
                "text-destructive"
              )}>
                {contentStats.wordCount}
              </p>
              <p className="text-xs text-muted-foreground">Words</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <Hash className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-lg font-bold mt-1">{contentStats.segmentCount}</p>
              <p className="text-xs text-muted-foreground">Segments</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <Clock className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-lg font-bold mt-1">{contentStats.duration}</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <TextAa className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-lg font-bold mt-1">{contentStats.avgWordsPerSegment}</p>
              <p className="text-xs text-muted-foreground">Avg Words/Seg</p>
            </div>
          </div>
          {contentStats.wordCount < RECOMMENDED_WORD_COUNT && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              Tip: {RECOMMENDED_WORD_COUNT}+ words provides best AI generation quality
            </p>
          )}
        </div>
      )}

      {/* Preview */}
      {srtContent && !parseError && (
        <div>
          <Label className="mb-2 block">Preview</Label>
          <div className="p-4 rounded-lg bg-muted/50 border font-mono text-sm max-h-[200px] overflow-y-auto">
            <pre className="whitespace-pre-wrap">{previewLines}</pre>
            {srtContent.split('\n').length > 15 && (
              <p className="text-muted-foreground mt-2">
                ... ({srtContent.split('\n').length - 15} more lines)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
