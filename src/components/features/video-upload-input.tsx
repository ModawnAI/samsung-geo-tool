'use client'

import { useState, useCallback, useRef } from 'react'
import { useGenerationStore } from '@/store/generation-store'
import { useTranslation } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  VideoCamera,
  SpinnerGap,
  CheckCircle,
  Warning,
  Lightning,
  Tag,
  TextT,
  Info,
  X,
  ArrowRight,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface VideoAnalysisResult {
  id: string
  seo_title: string
  meta_description: string
  primary_keywords: string[]
  secondary_keywords: string[]
  long_tail_keywords: string[]
  scene_breakdown: Array<{
    timestamp: string
    visual_description: string
    text_narration: string
    product_focus?: string
  }>
  key_claims: string[]
  full_analysis: string
  full_transcript?: string
  on_screen_text?: Array<{ timestamp: string; text: string; type: string }>
  product_info?: {
    name?: string
    model?: string
    tagline?: string
    pricing?: { price?: string; promotion?: string }
  }
  features_and_specs?: Array<{
    feature: string
    description: string
    benefit?: string
  }>
  usps?: string[]
  technical_specs?: Array<{ component: string; specification: string }>
  call_to_actions?: Array<{ cta: string; timestamp: string }>
  hashtags_suggested?: string[]
  timestamps_chapters?: Array<{ timestamp: string; title: string }>
  status: string
}

type UploadStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'

export function VideoUploadInput() {
  const { t } = useTranslation()
  const { platform, productName, setSrtContent, setSelectedKeywords, selectedKeywords } = useGenerationStore()
  
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VideoAnalysisResult | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const maxSize = 500 * 1024 * 1024 // 500MB
    if (file.size > maxSize) {
      setError('File too large. Maximum 500MB.')
      return
    }

    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm', 'video/mov']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload MP4, MOV, or WebM.')
      return
    }

    setFileName(file.name)
    setError(null)
    setStatus('uploading')
    setProgress(0)

    try {
      // Step 1: Upload video
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/video-analysis/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json()
        throw new Error(data.error || 'Upload failed')
      }

      const uploadData = await uploadResponse.json()
      setProgress(30)
      setStatus('analyzing')

      // Step 2: Trigger analysis with platform context
      const analyzeResponse = await fetch('/api/video-analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: uploadData.id,
          platform: platform,
          product_name: productName,
        }),
      })

      if (!analyzeResponse.ok) {
        const data = await analyzeResponse.json()
        throw new Error(data.error || 'Analysis failed')
      }

      // Poll for completion (analysis can take a while)
      let analysisResult: VideoAnalysisResult | null = null
      let pollAttempts = 0
      const maxPollAttempts = 60 // 5 minutes max

      while (pollAttempts < maxPollAttempts) {
        setProgress(30 + Math.min(pollAttempts * 1.5, 60))
        
        const statusResponse = await fetch(`/api/video-analysis/${uploadData.id}`)
        const statusData = await statusResponse.json()

        if (statusData.status === 'completed') {
          analysisResult = statusData
          break
        } else if (statusData.status === 'failed') {
          throw new Error(statusData.error_message || 'Analysis failed')
        }

        await new Promise(resolve => setTimeout(resolve, 5000))
        pollAttempts++
      }

      if (!analysisResult) {
        throw new Error('Analysis timeout')
      }

      setProgress(100)
      setResult(analysisResult)
      setStatus('complete')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }, [platform, productName])

  const applyToContent = useCallback(() => {
    if (!result) return

    const { srtContent: existingContent } = useGenerationStore.getState()

    // Build comprehensive extracted content
    let extractedContent = ''
    
    // 1. Full transcript is the best source
    if (result.full_transcript) {
      extractedContent += `=== 전체 스크립트 ===\n${result.full_transcript}\n\n`
    }
    
    // 2. Product info
    if (result.product_info) {
      const p = result.product_info
      extractedContent += `=== 제품 정보 ===\n`
      if (p.name) extractedContent += `제품명: ${p.name}\n`
      if (p.model) extractedContent += `모델: ${p.model}\n`
      if (p.tagline) extractedContent += `태그라인: ${p.tagline}\n`
      if (p.pricing?.price) extractedContent += `가격: ${p.pricing.price}\n`
      if (p.pricing?.promotion) extractedContent += `프로모션: ${p.pricing.promotion}\n`
      extractedContent += '\n'
    }
    
    // 3. Features and specs
    if (result.features_and_specs && result.features_and_specs.length > 0) {
      extractedContent += `=== 주요 기능 ===\n`
      result.features_and_specs.forEach(f => {
        extractedContent += `• ${f.feature}: ${f.description}`
        if (f.benefit) extractedContent += ` (${f.benefit})`
        extractedContent += '\n'
      })
      extractedContent += '\n'
    }
    
    // 4. Technical specs
    if (result.technical_specs && result.technical_specs.length > 0) {
      extractedContent += `=== 기술 사양 ===\n`
      result.technical_specs.forEach(s => {
        extractedContent += `• ${s.component}: ${s.specification}\n`
      })
      extractedContent += '\n'
    }
    
    // 5. USPs
    if (result.usps && result.usps.length > 0) {
      extractedContent += `=== USP (핵심 차별점) ===\n`
      result.usps.forEach(u => {
        extractedContent += `• ${u}\n`
      })
      extractedContent += '\n'
    }
    
    // 6. Key claims
    if (result.key_claims && result.key_claims.length > 0) {
      extractedContent += `=== 핵심 메시지 ===\n`
      result.key_claims.forEach(c => {
        extractedContent += `• ${c}\n`
      })
      extractedContent += '\n'
    }
    
    // 7. Scene breakdown as SRT format
    if (result.scene_breakdown && result.scene_breakdown.length > 0) {
      extractedContent += `=== 장면별 내용 ===\n`
      result.scene_breakdown.forEach((scene, index) => {
        extractedContent += `${index + 1}\n`
        extractedContent += `${scene.timestamp}\n`
        extractedContent += `${scene.text_narration || scene.visual_description}\n`
        if (scene.product_focus) extractedContent += `[${scene.product_focus}]\n`
        extractedContent += '\n'
      })
    }
    
    // 8. Timestamps/chapters
    if (result.timestamps_chapters && result.timestamps_chapters.length > 0) {
      extractedContent += `=== 챕터 ===\n`
      result.timestamps_chapters.forEach(ch => {
        extractedContent += `${ch.timestamp} ${ch.title}\n`
      })
      extractedContent += '\n'
    }
    
    // 9. CTAs
    if (result.call_to_actions && result.call_to_actions.length > 0) {
      extractedContent += `=== CTA ===\n`
      result.call_to_actions.forEach(cta => {
        extractedContent += `• ${cta.cta} (${cta.timestamp})\n`
      })
      extractedContent += '\n'
    }
    
    // Fallback if nothing else
    if (!extractedContent.trim() && result.full_analysis) {
      extractedContent = result.full_analysis
    } else if (!extractedContent.trim() && result.meta_description) {
      extractedContent = result.meta_description
    }

    // If user already has content, append extracted content below with separator
    // Manual input takes precedence - it stays on top
    if (existingContent.trim()) {
      const separator = '\n\n--- AI 분석 추출 내용 (참고용) ---\n\n'
      setSrtContent(existingContent + separator + extractedContent)
    } else {
      // No existing content, use extracted directly
      setSrtContent(extractedContent)
    }
  }, [result, setSrtContent])

  const applyKeywords = useCallback(() => {
    if (!result) return

    // Collect all keywords from various sources
    const allKeywords = [
      ...(result.primary_keywords || []),
      ...(result.secondary_keywords || []),
      ...(result.long_tail_keywords || []),
      ...(result.usps || []),
      // Extract keywords from features
      ...(result.features_and_specs?.map(f => f.feature) || []),
      // Clean hashtags (remove #)
      ...(result.hashtags_suggested?.map(h => h.replace(/^#/, '')) || []),
    ]
    
    // Deduplicate and limit
    const uniqueKeywords = [...new Set(allKeywords)].slice(0, 15)

    // Merge with existing keywords, avoiding duplicates
    const existingSet = new Set(selectedKeywords.map(k => k.toLowerCase()))
    const newKeywords = uniqueKeywords.filter(k => !existingSet.has(k.toLowerCase()))
    
    setSelectedKeywords([...selectedKeywords, ...newKeywords])
  }, [result, selectedKeywords, setSelectedKeywords])

  const reset = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setError(null)
    setResult(null)
    setFileName(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-gradient-to-br from-violet-500 to-purple-600">
            <VideoCamera className="h-5 w-5 text-white" weight="fill" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-medium">
                {t.generate?.srtInput?.videoUpload || 'AI 비디오 분석'}
              </span>
              <Badge variant="secondary" className="text-[10px] bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-700 dark:text-violet-300">
                <Lightning className="h-3 w-3 mr-0.5" weight="fill" />
                Gemini 2.0
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.generate?.srtInput?.videoUploadDesc || '동영상에서 제품 정보 자동 추출 (직접 입력 우선)'}
            </p>
          </div>
        </div>
        {status === 'complete' && (
          <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-xs">
            <CheckCircle className="h-3 w-3 mr-1" weight="fill" />
            분석 완료
          </Badge>
        )}
      </div>

      {/* Upload Area */}
      {status === 'idle' && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
            "hover:border-violet-500/50 hover:bg-violet-50/30 dark:hover:bg-violet-950/10"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/mov"
            onChange={handleFileSelect}
            className="sr-only"
          />
          <VideoCamera className="h-10 w-10 mx-auto mb-3 text-violet-500" />
          <p className="font-medium text-sm">동영상 파일 업로드</p>
          <p className="text-xs text-muted-foreground mt-1">
            MP4, MOV, WebM (최대 500MB)
          </p>
          <p className="text-xs text-violet-600 dark:text-violet-400 mt-2">
            플랫폼: <strong>{platform}</strong> {productName && `• 제품: ${productName}`}
          </p>
        </div>
      )}

      {/* Progress */}
      {(status === 'uploading' || status === 'analyzing') && (
        <div className="space-y-3 p-4 rounded-lg bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
          <div className="flex items-center gap-3">
            <SpinnerGap className="h-5 w-5 text-violet-600 animate-spin" />
            <div className="flex-1">
              <p className="font-medium text-sm text-violet-900 dark:text-violet-100">
                {status === 'uploading' ? '업로드 중...' : 'AI 분석 중...'}
              </p>
              <p className="text-xs text-violet-600 dark:text-violet-400">
                {fileName}
              </p>
            </div>
            <span className="text-sm font-mono text-violet-700 dark:text-violet-300">
              {progress}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          {status === 'analyzing' && (
            <p className="text-xs text-center text-violet-600 dark:text-violet-400">
              Gemini 2.0 Flash가 영상을 분석하고 있습니다. 영상 길이에 따라 1-5분 소요됩니다.
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <Warning className="h-5 w-5 text-red-500 mt-0.5" weight="fill" />
            <div className="flex-1">
              <p className="font-medium text-sm text-red-900 dark:text-red-100">분석 실패</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={reset}>
              다시 시도
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {status === 'complete' && result && (
        <div className="space-y-4">
          {/* Analysis Summary */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
                <span className="font-medium text-green-900 dark:text-green-100">분석 완료</span>
              </div>
              <Button size="sm" variant="ghost" onClick={reset} className="h-7 px-2">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Product Info */}
            {result.product_info?.name && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">제품</p>
                <p className="text-sm font-medium">
                  {result.product_info.name}
                  {result.product_info.model && ` (${result.product_info.model})`}
                </p>
                {result.product_info.tagline && (
                  <p className="text-xs text-muted-foreground italic">"{result.product_info.tagline}"</p>
                )}
              </div>
            )}

            {/* SEO Title */}
            {result.seo_title && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">추천 제목</p>
                <p className="text-sm font-medium">{result.seo_title}</p>
              </div>
            )}

            {/* Features Count */}
            {result.features_and_specs && result.features_and_specs.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">추출된 기능</p>
                <p className="text-sm">{result.features_and_specs.length}개 기능/사양 발견</p>
              </div>
            )}

            {/* USPs */}
            {result.usps && result.usps.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">핵심 USP</p>
                <ul className="text-xs space-y-0.5">
                  {result.usps.slice(0, 3).map((usp, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-green-500">✓</span>
                      <span>{usp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Keywords Preview */}
            {(result.primary_keywords?.length > 0 || result.secondary_keywords?.length > 0) && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">추출된 키워드</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.primary_keywords?.slice(0, 5).map((kw, i) => (
                    <Badge key={i} variant="default" className="text-xs bg-violet-600">
                      {kw}
                    </Badge>
                  ))}
                  {result.secondary_keywords?.slice(0, 3).map((kw, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Extraction Stats */}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {result.scene_breakdown?.length > 0 && (
                <span>{result.scene_breakdown.length}개 장면</span>
              )}
              {(result.technical_specs?.length ?? 0) > 0 && (
                <span>• {result.technical_specs?.length}개 사양</span>
              )}
              {result.full_transcript && (
                <span>• 전체 스크립트 추출됨</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={applyToContent}
              className="gap-2"
            >
              <TextT className="h-4 w-4" />
              텍스트에 적용
              <ArrowRight className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={applyKeywords}
              className="gap-2"
              disabled={!result.primary_keywords?.length && !result.secondary_keywords?.length}
            >
              <Tag className="h-4 w-4" />
              키워드에 추가
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-violet-500" />
            <span>
              직접 입력한 내용이 우선됩니다. AI 분석 결과는 참고용으로 추가됩니다.
              키워드는 기존 선택에 병합됩니다.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
