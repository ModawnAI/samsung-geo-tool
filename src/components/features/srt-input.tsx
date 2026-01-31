'use client'

import { useCallback, useState, useMemo } from 'react'
import { useGenerationStore } from '@/store/generation-store'
import { useTranslation } from '@/lib/i18n/context'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { UploadSimple, Warning, CheckCircle, Clock, TextAa, Hash, Info, YoutubeLogo, TextT, Check, CaretDown, Lightbulb, Question, VideoCamera } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { VideoUploadInput } from './video-upload-input'

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

interface InputStatus {
  hasUrl: boolean
  hasSrt: boolean
  hasText: boolean
  inputCount: number
}

export function SrtInput() {
  const { t } = useTranslation()
  const { videoUrl, srtContent, setVideoUrl, setSrtContent } = useGenerationStore()
  const [parseError, setParseError] = useState<string | null>(null)
  const [parseWarnings, setParseWarnings] = useState<string[]>([])
  const [contentStats, setContentStats] = useState<SrtValidationResult['stats']>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState<boolean>(false)

  // Check input status
  const inputStatus = useMemo((): InputStatus => {
    const hasUrl = Boolean(videoUrl.trim())
    const hasSrt = Boolean(srtContent.trim()) && !parseError
    // Check if srtContent looks like plain text (no SRT timestamps)
    const timestampPattern = /\d{2}:\d{2}:\d{2}[,.:]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.:]\d{3}/
    const hasText = Boolean(srtContent.trim()) && !timestampPattern.test(srtContent)

    return {
      hasUrl,
      hasSrt,
      hasText,
      inputCount: (hasUrl ? 1 : 0) + (hasSrt || hasText ? 1 : 0)
    }
  }, [videoUrl, srtContent, parseError])

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

    // Check for timestamps - if no timestamps, treat as plain text (valid)
    if (segmentCount === 0) {
      // No SRT format detected - treat as plain text input
      const allText = content.trim()
      const wordCount = allText.split(/\s+/).filter(w => w.length > 0).length
      const charCount = allText.replace(/\s/g, '').length

      if (wordCount < MIN_WORD_COUNT) {
        return {
          valid: false,
          error: `Insufficient text content (${wordCount} words). Minimum ${MIN_WORD_COUNT} words required.`,
          warnings: [],
          stats: { wordCount, charCount, segmentCount: 0, duration: '-', avgWordsPerSegment: 0 }
        }
      }

      return {
        valid: true,
        error: null,
        warnings: wordCount < RECOMMENDED_WORD_COUNT ? [`Content has ${wordCount} words. ${RECOMMENDED_WORD_COUNT}+ words recommended for better AI generation quality.`] : [],
        stats: { wordCount, charCount, segmentCount: 0, duration: '-', avgWordsPerSegment: 0 }
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

      setUploadedFileName(file.name)
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

  const handleTextChange = useCallback(
    (content: string) => {
      setSrtContent(content)
      setUploadedFileName(null)
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

  // Calculate if at least one input is provided
  const hasAnyInput = inputStatus.hasUrl || srtContent.trim().length > 0

  return (
    <div className="space-y-6">
      {/* Input Status Header */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm sm:text-base font-semibold">
              {t.generate.srtInput.contentInputs || '콘텐츠 입력'}
            </Label>
            <Badge variant="outline" className="text-xs">
              {t.generate.srtInput.atLeastOneRequired || '최소 1개 필수'}
            </Badge>
          </div>
          {hasAnyInput ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" weight="fill" />
              {inputStatus.inputCount === 1
                ? (t.generate.srtInput.oneInputProvided || '1개 입력됨')
                : ((t.generate.srtInput.multipleInputsProvided || '{count}개 입력됨').replace('{count}', String(inputStatus.inputCount)))}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <Warning className="h-4 w-4" weight="fill" />
              {t.generate.srtInput.noInputYet || '아직 입력 없음'}
            </span>
          )}
        </div>

        {/* Collapsible Usage Guide */}
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Question className="h-4 w-4" />
          <span>{t.generate.srtInput.howToUse || '입력 방법 안내'}</span>
          <CaretDown className={cn("h-3 w-3 transition-transform", showGuide && "rotate-180")} />
        </button>

        {showGuide && (
          <div className="mt-4 space-y-3 text-xs">
            {/* Input Scenarios */}
            <div className="grid gap-2">
              <div className="p-3 rounded-md bg-white/50 dark:bg-black/20 border">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground mb-1">{t.generate.srtInput.scenario1Title || '시나리오 1: YouTube 영상만 있는 경우'}</p>
                    <p className="text-muted-foreground">{t.generate.srtInput.scenario1Desc || 'YouTube URL만 입력하세요. 시스템이 자막을 자동으로 추출합니다.'}</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-md bg-white/50 dark:bg-black/20 border">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground mb-1">{t.generate.srtInput.scenario2Title || '시나리오 2: 자막 파일이 있는 경우'}</p>
                    <p className="text-muted-foreground">{t.generate.srtInput.scenario2Desc || 'SRT 파일을 업로드하거나 텍스트를 직접 붙여넣기 하세요. 더 정확한 내용을 제공합니다.'}</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-md bg-white/50 dark:bg-black/20 border">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" weight="fill" />
                  <div>
                    <p className="font-medium text-foreground mb-1">{t.generate.srtInput.scenario3Title || '시나리오 3: 최상의 결과 (권장)'}</p>
                    <p className="text-muted-foreground">{t.generate.srtInput.scenario3Desc || 'YouTube URL + SRT/텍스트를 함께 입력하면 영상 메타데이터와 정확한 자막을 모두 활용하여 최상의 결과를 생성합니다.'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Priority Info */}
            <div className="pt-2 border-t">
              <p className="text-muted-foreground">
                <Info className="h-3.5 w-3.5 inline mr-1" />
                {t.generate.srtInput.priorityInfo || '여러 입력 시: SRT/텍스트 내용이 우선 사용되며, YouTube URL은 메타데이터(제목, 태그 등) 추출에 활용됩니다.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 0. AI Video Analysis - NEW */}
      <VideoUploadInput />

      {/* 1. YouTube URL Input */}
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30">
              <YoutubeLogo className="h-5 w-5 text-red-500" weight="fill" />
            </div>
            <div>
              <Label htmlFor="video-url" className="text-sm sm:text-base font-medium">
                {t.generate.srtInput.youtubeUrlLabel}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.generate.srtInput.youtubeUrlPurpose || '영상 메타데이터 추출 (제목, 태그, 자막)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {inputStatus.hasUrl ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-xs">
                <Check className="h-3 w-3 mr-1" weight="bold" />
                {t.generate.srtInput.inputComplete || '입력됨'}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {t.generate.srtInput.optional || '선택'}
              </Badge>
            )}
          </div>
        </div>
        <Input
          id="video-url"
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className={cn(
            "transition-colors",
            inputStatus.hasUrl && 'border-green-500/50 focus:border-green-500 bg-green-50/30 dark:bg-green-950/10'
          )}
        />
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
          <span>{t.generate.srtInput.youtubeUrlHint}</span>
        </div>
      </div>

      {/* 2. SRT File Upload */}
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
              <UploadSimple className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <Label className="text-sm sm:text-base font-medium">
                {t.generate.srtInput.srtUpload}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.generate.srtInput.srtUploadPurpose || '정확한 자막 타임라인 제공'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {uploadedFileName && !parseError ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-xs">
                <Check className="h-3 w-3 mr-1" weight="bold" />
                {t.generate.srtInput.uploaded || '업로드됨'}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {t.generate.srtInput.optional || '선택'}
              </Badge>
            )}
          </div>
        </div>
        <div className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
          uploadedFileName && !parseError && "border-green-500/50 bg-green-50/30 dark:bg-green-950/10"
        )}>
          <input
            type="file"
            accept=".srt,.txt"
            onChange={handleFileUpload}
            className="sr-only"
            id="srt-upload"
            aria-label="Upload SRT subtitle file"
          />
          <label htmlFor="srt-upload" className="cursor-pointer block">
            {uploadedFileName ? (
              <>
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" weight="fill" />
                <p className="font-medium text-sm text-green-600 dark:text-green-400">{uploadedFileName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.generate.srtInput.clickToReupload || '다른 파일 업로드하려면 클릭'}
                </p>
              </>
            ) : (
              <>
                <UploadSimple className="h-8 w-8 mx-auto mb-2 text-muted-foreground" aria-hidden="true" />
                <p className="font-medium text-sm">{t.generate.srtInput.clickToUpload}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.generate.srtInput.acceptsFormats}
                </p>
              </>
            )}
          </label>
        </div>
      </div>

      {/* 3. Text/SRT Direct Input */}
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
              <TextT className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <Label htmlFor="text-input" className="text-sm sm:text-base font-medium">
                {t.generate.srtInput.textInput}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.generate.srtInput.textInputPurpose || '직접 텍스트 입력 또는 붙여넣기'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {srtContent.trim() && !parseError && !uploadedFileName ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-xs">
                <Check className="h-3 w-3 mr-1" weight="bold" />
                {t.generate.srtInput.inputComplete || '입력됨'}
              </Badge>
            ) : uploadedFileName ? (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {t.generate.srtInput.fileUsed || '파일 사용 중'}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {t.generate.srtInput.optional || '선택'}
              </Badge>
            )}
          </div>
        </div>
        <Textarea
          id="text-input"
          value={srtContent}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={t.generate.srtInput.pastePlaceholder}
          className={cn(
            "min-h-[150px] font-mono text-sm transition-colors",
            srtContent.trim() && !parseError && "border-green-500/50 focus:border-green-500 bg-green-50/30 dark:bg-green-950/10"
          )}
        />
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-purple-500" />
          <span>{t.generate.srtInput.textInputHint || 'SRT 형식 또는 일반 텍스트를 직접 입력하세요. 파일 업로드 시 자동으로 반영됩니다.'}</span>
        </div>
      </div>

      {/* Error Display */}
      {parseError && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm"
        >
          <div className="flex items-start gap-2 text-destructive">
            <Warning className="h-5 w-5 mt-0.5 flex-shrink-0" weight="fill" aria-hidden="true" />
            <div>
              <p className="font-medium">{t.generate.srtInput.validationError}</p>
              <p className="mt-1">{parseError}</p>
            </div>
          </div>
          {contentStats && (
            <div className="mt-3 pt-3 border-t border-destructive/20 flex flex-wrap gap-4 text-xs text-destructive/80">
              <span><TextAa className="h-3.5 w-3.5 inline mr-1" />{contentStats.wordCount} {t.generate.srtInput.words}</span>
              <span><Hash className="h-3.5 w-3.5 inline mr-1" />{contentStats.segmentCount} {t.generate.srtInput.segments}</span>
              <span><Clock className="h-3.5 w-3.5 inline mr-1" />{contentStats.duration}</span>
            </div>
          )}
        </div>
      )}

      {/* Warnings Display */}
      {!parseError && parseWarnings.length > 0 && (
        <div
          role="status"
          className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm"
        >
          <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
            <Info className="h-5 w-5 mt-0.5 flex-shrink-0" weight="fill" aria-hidden="true" />
            <div>
              <p className="font-medium">{t.generate.srtInput.recommendations}</p>
              <ul className="mt-1 space-y-1">
                {parseWarnings.map((warning, i) => (
                  <li key={i} className="text-amber-700 dark:text-amber-300">• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Content Statistics */}
      {srtContent && contentStats && !parseError && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="block">{t.generate.srtInput.contentAnalysis}</Label>
            <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" weight="fill" />
              {contentStats.segmentCount > 0 ? t.generate.srtInput.validSrt : (t.generate.srtInput.validText || '텍스트 유효')}
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
              <p className="text-xs text-muted-foreground">{t.generate.srtInput.words}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <Hash className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-lg font-bold mt-1">{contentStats.segmentCount}</p>
              <p className="text-xs text-muted-foreground">{t.generate.srtInput.segments}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <Clock className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-lg font-bold mt-1">{contentStats.duration}</p>
              <p className="text-xs text-muted-foreground">{t.generate.srtInput.duration}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <TextAa className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-lg font-bold mt-1">{contentStats.avgWordsPerSegment}</p>
              <p className="text-xs text-muted-foreground">{t.generate.srtInput.avgWordsPerSeg}</p>
            </div>
          </div>
          {contentStats.wordCount < RECOMMENDED_WORD_COUNT && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              {t.generate.srtInput.wordsTip.replace('{count}', String(RECOMMENDED_WORD_COUNT))}
            </p>
          )}
        </div>
      )}

      {/* Preview */}
      {srtContent && !parseError && (
        <div>
          <Label className="mb-2 block">{t.generate.srtInput.preview}</Label>
          <div className="p-4 rounded-lg bg-muted/50 border font-mono text-sm max-h-[200px] overflow-y-auto">
            <pre className="whitespace-pre-wrap">{previewLines}</pre>
            {srtContent.split('\n').length > 15 && (
              <p className="text-muted-foreground mt-2">
                ... {t.generate.srtInput.moreLines.replace('{count}', String(srtContent.split('\n').length - 15))}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Combined Input Summary */}
      {hasAnyInput && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
            <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">
              {t.generate.srtInput.inputSummary || '입력 요약'}
            </h4>
          </div>

          <div className="space-y-2">
            {/* YouTube URL Status */}
            <div className={cn(
              "flex items-center gap-3 p-2 rounded-md text-sm",
              inputStatus.hasUrl
                ? "bg-green-100/50 dark:bg-green-900/30"
                : "bg-gray-100/50 dark:bg-gray-800/30 opacity-60"
            )}>
              <div className={cn(
                "p-1 rounded",
                inputStatus.hasUrl ? "bg-green-200 dark:bg-green-800" : "bg-gray-200 dark:bg-gray-700"
              )}>
                <YoutubeLogo className={cn("h-4 w-4", inputStatus.hasUrl ? "text-green-700 dark:text-green-300" : "text-gray-500")} weight="fill" />
              </div>
              <span className={inputStatus.hasUrl ? "text-green-800 dark:text-green-200" : "text-gray-500"}>
                {inputStatus.hasUrl
                  ? (t.generate.srtInput.youtubeUrlProvided || 'YouTube URL 입력됨')
                  : (t.generate.srtInput.youtubeUrlNotProvided || 'YouTube URL 미입력')
                }
              </span>
              {inputStatus.hasUrl && <Check className="h-4 w-4 text-green-600 ml-auto" weight="bold" />}
            </div>

            {/* SRT/Text Status */}
            <div className={cn(
              "flex items-center gap-3 p-2 rounded-md text-sm",
              srtContent.trim() && !parseError
                ? "bg-green-100/50 dark:bg-green-900/30"
                : "bg-gray-100/50 dark:bg-gray-800/30 opacity-60"
            )}>
              <div className={cn(
                "p-1 rounded",
                srtContent.trim() && !parseError ? "bg-green-200 dark:bg-green-800" : "bg-gray-200 dark:bg-gray-700"
              )}>
                {contentStats && contentStats.segmentCount > 0 ? (
                  <UploadSimple className={cn("h-4 w-4", srtContent.trim() && !parseError ? "text-green-700 dark:text-green-300" : "text-gray-500")} />
                ) : (
                  <TextT className={cn("h-4 w-4", srtContent.trim() && !parseError ? "text-green-700 dark:text-green-300" : "text-gray-500")} />
                )}
              </div>
              <span className={srtContent.trim() && !parseError ? "text-green-800 dark:text-green-200" : "text-gray-500"}>
                {srtContent.trim() && !parseError
                  ? contentStats && contentStats.segmentCount > 0
                    ? `${t.generate.srtInput.srtProvided || 'SRT 자막 입력됨'} (${contentStats.segmentCount} ${t.generate.srtInput.segments})`
                    : `${t.generate.srtInput.textProvided || '텍스트 입력됨'} (${contentStats?.wordCount || 0} ${t.generate.srtInput.words})`
                  : (t.generate.srtInput.srtTextNotProvided || 'SRT/텍스트 미입력')
                }
              </span>
              {srtContent.trim() && !parseError && <Check className="h-4 w-4 text-green-600 ml-auto" weight="bold" />}
            </div>
          </div>

          {/* Generation hint based on input combination */}
          <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
            <p className="text-xs text-green-700 dark:text-green-300 flex items-start gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" weight="fill" />
              <span>
                {inputStatus.hasUrl && srtContent.trim() && !parseError
                  ? (t.generate.srtInput.bestQualityHint || '최상의 조합: 영상 메타데이터 + 자막/텍스트가 모두 활용됩니다.')
                  : inputStatus.hasUrl
                    ? (t.generate.srtInput.urlOnlyHint || 'YouTube 자막이 자동 추출됩니다. 더 정확한 결과를 위해 SRT/텍스트도 입력해보세요.')
                    : (t.generate.srtInput.textOnlyHint || '입력된 텍스트로 생성됩니다. YouTube URL을 추가하면 영상 메타데이터도 활용됩니다.')
                }
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
