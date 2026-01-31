'use client'

import { useCallback, useState, useMemo } from 'react'
import { useGenerationStore } from '@/store/generation-store'
import { useTranslation } from '@/lib/i18n/context'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  UploadSimple, 
  Warning, 
  CheckCircle, 
  TextAa, 
  YoutubeLogo, 
  TextT, 
  Check,
  VideoCamera,
  Lightning,
  CaretDown,
  Info,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { VideoUploadInput } from './video-upload-input'

// Minimum requirements
const MIN_WORD_COUNT = 50

interface SrtValidationResult {
  valid: boolean
  error: string | null
  stats: {
    wordCount: number
    segmentCount: number
  } | null
}

export function SrtInput() {
  const { t } = useTranslation()
  const { videoUrl, srtContent, setVideoUrl, setSrtContent, platform, productName } = useGenerationStore()
  const [parseError, setParseError] = useState<string | null>(null)
  const [contentStats, setContentStats] = useState<SrtValidationResult['stats']>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('text')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Determine what inputs are provided
  const hasContent = useMemo(() => {
    const hasUrl = Boolean(videoUrl.trim())
    const hasText = Boolean(srtContent.trim()) && !parseError
    return { hasUrl, hasText, any: hasUrl || hasText }
  }, [videoUrl, srtContent, parseError])

  const parseSrt = useCallback((content: string): SrtValidationResult => {
    const lines = content.trim().split('\n')
    if (lines.length < 2) {
      return { valid: false, error: 'Content too short', stats: null }
    }

    const timestampPattern = /\d{2}:\d{2}:\d{2}[,.:]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.:]\d{3}/
    let segmentCount = 0
    const textLines: string[] = []

    for (const line of lines) {
      if (timestampPattern.test(line.trim())) {
        segmentCount++
      } else if (line.trim() && !/^\d+$/.test(line.trim())) {
        textLines.push(line.trim())
      }
    }

    const allText = segmentCount > 0 ? textLines.join(' ') : content.trim()
    const wordCount = allText.split(/\s+/).filter(w => w.length > 0).length

    if (wordCount < MIN_WORD_COUNT) {
      return {
        valid: false,
        error: `${wordCount} words. Minimum ${MIN_WORD_COUNT} required.`,
        stats: { wordCount, segmentCount }
      }
    }

    return { valid: true, error: null, stats: { wordCount, segmentCount } }
  }, [t])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadedFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const result = parseSrt(content)
      setSrtContent(content)
      setParseError(result.error)
      setContentStats(result.stats)
    }
    reader.readAsText(file)
  }, [parseSrt, setSrtContent])

  const handleTextChange = useCallback((content: string) => {
    setSrtContent(content)
    setUploadedFileName(null)
    if (content.trim()) {
      const result = parseSrt(content)
      setParseError(result.error)
      setContentStats(result.stats)
    } else {
      setParseError(null)
      setContentStats(null)
    }
  }, [parseSrt, setSrtContent])

  return (
    <div className="space-y-4">
      {/* Header with context */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t.generate.steps.content}</h2>
          <p className="text-sm text-muted-foreground">
            {platform && <span className="capitalize">{platform}</span>}
            {productName && <span> • {productName}</span>}
          </p>
        </div>
        {hasContent.any && (
          <Badge variant="default" className="bg-green-600">
            <Check className="h-3 w-3 mr-1" weight="bold" />
            Ready
          </Badge>
        )}
      </div>

      {/* Main Input Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="video" className="gap-2">
            <VideoCamera className="h-4 w-4" />
            <span className="hidden sm:inline">AI 분석</span>
          </TabsTrigger>
          <TabsTrigger value="youtube" className="gap-2">
            <YoutubeLogo className="h-4 w-4" weight="fill" />
            <span className="hidden sm:inline">YouTube</span>
          </TabsTrigger>
          <TabsTrigger value="text" className="gap-2">
            <TextT className="h-4 w-4" />
            <span className="hidden sm:inline">텍스트</span>
          </TabsTrigger>
        </TabsList>

        {/* Video Analysis Tab */}
        <TabsContent value="video" className="mt-4">
          <VideoUploadInput />
        </TabsContent>

        {/* YouTube Tab */}
        <TabsContent value="youtube" className="mt-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <YoutubeLogo className="h-5 w-5 text-red-500" weight="fill" />
              <Label htmlFor="video-url">YouTube URL</Label>
              {hasContent.hasUrl && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Check className="h-3 w-3 mr-1" />
                </Badge>
              )}
            </div>
            <Input
              id="video-url"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className={cn(hasContent.hasUrl && 'border-green-500/50')}
            />
            <p className="text-xs text-muted-foreground">
              자막과 메타데이터를 자동으로 추출합니다
            </p>
          </div>
        </TabsContent>

        {/* Text/SRT Tab */}
        <TabsContent value="text" className="mt-4 space-y-4">
          {/* File Upload */}
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".srt,.txt"
              onChange={handleFileUpload}
              className="sr-only"
              id="srt-upload"
            />
            <label 
              htmlFor="srt-upload" 
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
                "hover:border-primary hover:bg-primary/5",
                uploadedFileName && "border-green-500 bg-green-50 dark:bg-green-950/20"
              )}
            >
              <UploadSimple className="h-4 w-4" />
              <span className="text-sm">
                {uploadedFileName || 'SRT 파일 업로드'}
              </span>
              {uploadedFileName && <Check className="h-4 w-4 text-green-600" />}
            </label>
            <span className="text-xs text-muted-foreground">또는</span>
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="text-input">직접 입력</Label>
              {contentStats && (
                <span className="text-xs text-muted-foreground">
                  {contentStats.wordCount} words
                  {contentStats.segmentCount > 0 && ` • ${contentStats.segmentCount} segments`}
                </span>
              )}
            </div>
            <Textarea
              id="text-input"
              value={srtContent}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="SRT 또는 일반 텍스트를 붙여넣기..."
              className={cn(
                "min-h-[200px] font-mono text-sm",
                hasContent.hasText && !parseError && "border-green-500/50"
              )}
            />
          </div>

          {/* Error */}
          {parseError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <Warning className="h-4 w-4" />
              {parseError}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Advanced Options (Collapsed) */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <CaretDown className={cn("h-3 w-3 transition-transform", showAdvanced && "rotate-180")} />
        고급 옵션
      </button>

      {showAdvanced && (
        <div className="p-4 rounded-lg bg-muted/50 space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-blue-500" />
            <div>
              <p className="font-medium">입력 우선순위</p>
              <p className="text-muted-foreground text-xs">
                직접 입력한 내용이 우선됩니다. AI 분석과 YouTube 추출은 참고용으로 병합됩니다.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Lightning className="h-4 w-4 mt-0.5 text-violet-500" />
            <div>
              <p className="font-medium">AI 비디오 분석</p>
              <p className="text-muted-foreground text-xs">
                Gemini 2.0 Flash가 동영상에서 제품 정보, 기능, 스펙, USP를 자동 추출합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Summary */}
      {hasContent.any && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
          <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              콘텐츠 준비 완료
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              {hasContent.hasUrl && hasContent.hasText 
                ? 'YouTube + 텍스트 모두 입력됨'
                : hasContent.hasUrl 
                  ? 'YouTube URL 입력됨'
                  : contentStats 
                    ? `${contentStats.wordCount}단어 입력됨`
                    : '텍스트 입력됨'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
