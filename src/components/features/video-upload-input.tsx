'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useGenerationStore, type VideoAnalysisResult } from '@/store/generation-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  VideoCamera,
  SpinnerGap,
  CheckCircle,
  Warning,
  Tag,
  TextT,
  X,
  ArrowRight,
  Lightning,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

type UploadStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'

export function VideoUploadInput() {
  const {
    platform,
    productName,
    setSrtContent,
    setSelectedKeywords,
    selectedKeywords,
    videoAnalysisResult,
    videoAnalysisFileName,
    setVideoAnalysisResult,
    clearVideoAnalysis,
  } = useGenerationStore()

  // Derive status from stored result
  const [status, setStatus] = useState<UploadStatus>(() =>
    videoAnalysisResult ? 'complete' : 'idle'
  )
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync status with stored result on mount
  useEffect(() => {
    if (videoAnalysisResult && status === 'idle') {
      setStatus('complete')
    }
  }, [videoAnalysisResult, status])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 500 * 1024 * 1024
    if (file.size > maxSize) {
      setError('파일이 너무 큽니다 (최대 500MB)')
      return
    }

    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm', 'video/mov']
    if (!allowedTypes.includes(file.type)) {
      setError('MP4, MOV, WebM 파일만 지원됩니다')
      return
    }

    setVideoAnalysisResult(null, file.name)
    setError(null)
    setStatus('uploading')
    setProgress(0)

    try {
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

      const analyzeResponse = await fetch('/api/video-analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: uploadData.id,
          platform,
          product_name: productName,
        }),
      })

      if (!analyzeResponse.ok) {
        const data = await analyzeResponse.json()
        throw new Error(data.error || 'Analysis failed')
      }

      let analysisResult: VideoAnalysisResult | null = null
      let pollAttempts = 0

      while (pollAttempts < 60) {
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

      if (!analysisResult) throw new Error('분석 시간 초과')

      setProgress(100)
      setVideoAnalysisResult(analysisResult, file.name)
      setStatus('complete')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }, [platform, productName, setVideoAnalysisResult])

  const applyToContent = useCallback(() => {
    if (!videoAnalysisResult) return

    const { srtContent: existingContent } = useGenerationStore.getState()
    let extracted = ''

    // Full transcript first
    if (videoAnalysisResult.full_transcript) {
      extracted += '=== 전체 나레이션 ===\n'
      extracted += videoAnalysisResult.full_transcript + '\n\n'
    }

    // Product info
    if (videoAnalysisResult.product_info?.name) {
      extracted += '=== 제품 정보 ===\n'
      extracted += `제품명: ${videoAnalysisResult.product_info.name}\n`
      if (videoAnalysisResult.product_info.model) extracted += `모델: ${videoAnalysisResult.product_info.model}\n`
      if (videoAnalysisResult.product_info.tagline) extracted += `태그라인: ${videoAnalysisResult.product_info.tagline}\n`
      if (videoAnalysisResult.product_info.category) extracted += `카테고리: ${videoAnalysisResult.product_info.category}\n`
      extracted += '\n'
    }

    // Features and specs
    if (videoAnalysisResult.features_and_specs?.length) {
      extracted += '=== 주요 기능 및 스펙 ===\n'
      videoAnalysisResult.features_and_specs.forEach(f => {
        extracted += `• ${f.feature}: ${f.description}`
        if (f.benefit) extracted += ` (${f.benefit})`
        extracted += '\n'
      })
      extracted += '\n'
    }

    // Technical specs
    if (videoAnalysisResult.technical_specs?.length) {
      extracted += '=== 기술 사양 ===\n'
      videoAnalysisResult.technical_specs.forEach(s => {
        extracted += `• ${s.component}: ${s.specification}\n`
      })
      extracted += '\n'
    }

    // USPs
    if (videoAnalysisResult.usps?.length) {
      extracted += '=== USP (핵심 차별점) ===\n'
      videoAnalysisResult.usps.forEach(u => extracted += `• ${u}\n`)
      extracted += '\n'
    }

    // Key claims
    if (videoAnalysisResult.key_claims?.length) {
      extracted += '=== 주요 주장/클레임 ===\n'
      videoAnalysisResult.key_claims.forEach(c => extracted += `• ${c}\n`)
      extracted += '\n'
    }

    // On-screen text
    if (videoAnalysisResult.on_screen_text?.length) {
      extracted += '=== 화면 텍스트 ===\n'
      videoAnalysisResult.on_screen_text.forEach(t => {
        extracted += `[${t.timestamp}] ${t.text} (${t.type})\n`
      })
      extracted += '\n'
    }

    // Scene breakdown
    if (videoAnalysisResult.scene_breakdown?.length) {
      extracted += '=== 장면 분석 ===\n'
      videoAnalysisResult.scene_breakdown.forEach((scene, i) => {
        extracted += `[${scene.timestamp}] ${scene.visual_description}\n`
        if (scene.text_narration) extracted += `나레이션: ${scene.text_narration}\n`
        if (scene.product_focus) extracted += `포커스: ${scene.product_focus}\n`
        extracted += '\n'
      })
    }

    // CTAs
    if (videoAnalysisResult.call_to_actions?.length) {
      extracted += '=== CTA ===\n'
      videoAnalysisResult.call_to_actions.forEach(cta => {
        extracted += `[${cta.timestamp}] ${cta.cta}\n`
      })
      extracted += '\n'
    }

    // Fallback to full analysis
    if (!extracted.trim() && videoAnalysisResult.full_analysis) {
      extracted = videoAnalysisResult.full_analysis
    }

    if (existingContent.trim()) {
      setSrtContent(existingContent + '\n\n--- AI 추출 ---\n\n' + extracted)
    } else {
      setSrtContent(extracted)
    }
  }, [videoAnalysisResult, setSrtContent])

  const applyKeywords = useCallback(() => {
    if (!videoAnalysisResult) return

    const allKeywords = [
      ...(videoAnalysisResult.primary_keywords || []),
      ...(videoAnalysisResult.secondary_keywords || []),
      ...(videoAnalysisResult.usps || []),
      ...(videoAnalysisResult.features_and_specs?.map(f => f.feature) || []),
      ...(videoAnalysisResult.hashtags_suggested?.map(h => h.replace(/^#/, '')) || []),
    ]

    const unique = [...new Set(allKeywords)].slice(0, 15)
    const existingSet = new Set(selectedKeywords.map(k => k.toLowerCase()))
    const newKeywords = unique.filter(k => !existingSet.has(k.toLowerCase()))

    setSelectedKeywords([...selectedKeywords, ...newKeywords])
  }, [videoAnalysisResult, selectedKeywords, setSelectedKeywords])

  const reset = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setError(null)
    clearVideoAnalysis()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [clearVideoAnalysis])

  // Idle state - upload prompt
  if (status === 'idle') {
    return (
      <div className="space-y-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            "hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/mov"
            onChange={handleFileSelect}
            className="sr-only"
          />
          <VideoCamera className="h-12 w-12 mx-auto mb-3 text-violet-500" weight="duotone" />
          <p className="font-medium">동영상 파일 업로드</p>
          <p className="text-sm text-muted-foreground mt-1">
            MP4, MOV, WebM (최대 500MB)
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lightning className="h-4 w-4 text-violet-500" />
          <span>Gemini 3 Flash가 영상에서 제품 정보, 기능, 스펙을 자동 추출합니다</span>
        </div>
      </div>
    )
  }

  // Loading state
  if (status === 'uploading' || status === 'analyzing') {
    return (
      <div className="p-6 rounded-xl bg-violet-50 dark:bg-violet-950/20 space-y-4">
        <div className="flex items-center gap-3">
          <SpinnerGap className="h-6 w-6 text-violet-600 animate-spin" />
          <div className="flex-1">
            <p className="font-medium">
              {status === 'uploading' ? '업로드 중...' : 'AI 분석 중...'}
            </p>
            <p className="text-sm text-muted-foreground">{videoAnalysisFileName}</p>
          </div>
          <Badge variant="outline">{progress}%</Badge>
        </div>
        <Progress value={progress} className="h-2" />
        {status === 'analyzing' && (
          <p className="text-xs text-center text-muted-foreground">
            영상 길이에 따라 1-5분 소요
          </p>
        )}
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-3">
          <Warning className="h-5 w-5 text-red-500" weight="fill" />
          <div className="flex-1">
            <p className="font-medium text-red-900 dark:text-red-100">분석 실패</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={reset}>
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  // Complete state
  const result = videoAnalysisResult

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
            <span className="font-medium text-green-900 dark:text-green-100">분석 완료</span>
            {videoAnalysisFileName && (
              <span className="text-xs text-muted-foreground">({videoAnalysisFileName})</span>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={reset} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          {result?.product_info?.name && (
            <div>
              <span className="text-muted-foreground">제품:</span>{' '}
              <span className="font-medium">{result.product_info.name}</span>
            </div>
          )}
          {result?.product_info?.model && (
            <div>
              <span className="text-muted-foreground">모델:</span>{' '}
              <span className="font-medium">{result.product_info.model}</span>
            </div>
          )}
          {(result?.features_and_specs?.length ?? 0) > 0 && (
            <div>
              <span className="text-muted-foreground">기능:</span>{' '}
              <span className="font-medium">{result?.features_and_specs?.length}개</span>
            </div>
          )}
          {(result?.technical_specs?.length ?? 0) > 0 && (
            <div>
              <span className="text-muted-foreground">스펙:</span>{' '}
              <span className="font-medium">{result?.technical_specs?.length}개</span>
            </div>
          )}
          {(result?.usps?.length ?? 0) > 0 && (
            <div>
              <span className="text-muted-foreground">USP:</span>{' '}
              <span className="font-medium">{result?.usps?.length}개</span>
            </div>
          )}
          {(result?.primary_keywords?.length ?? 0) > 0 && (
            <div>
              <span className="text-muted-foreground">키워드:</span>{' '}
              <span className="font-medium">{result?.primary_keywords?.length}개</span>
            </div>
          )}
          {(result?.scene_breakdown?.length ?? 0) > 0 && (
            <div>
              <span className="text-muted-foreground">장면:</span>{' '}
              <span className="font-medium">{result?.scene_breakdown?.length}개</span>
            </div>
          )}
          {(result?.on_screen_text?.length ?? 0) > 0 && (
            <div>
              <span className="text-muted-foreground">화면텍스트:</span>{' '}
              <span className="font-medium">{result?.on_screen_text?.length}개</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button size="sm" variant="default" onClick={applyToContent} className="gap-1">
            <TextT className="h-4 w-4" />
            텍스트 적용
            <ArrowRight className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={applyKeywords}
            className="gap-1"
            disabled={!result?.primary_keywords?.length}
          >
            <Tag className="h-4 w-4" />
            키워드 추가
          </Button>
        </div>

        {/* Toggle Full Analysis */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowFullAnalysis(!showFullAnalysis)}
          className="w-full text-xs gap-1"
        >
          {showFullAnalysis ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />}
          {showFullAnalysis ? '분석 결과 접기' : '상세 분석 결과 보기'}
        </Button>
      </div>

      {/* Full Analysis Details */}
      {showFullAnalysis && result && (
        <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border text-sm max-h-96 overflow-y-auto">
          {/* Product Info */}
          {result.product_info?.name && (
            <div>
              <h4 className="font-semibold text-violet-600 mb-1">제품 정보</h4>
              <div className="pl-2 space-y-0.5 text-xs">
                <p><span className="text-muted-foreground">제품명:</span> {result.product_info.name}</p>
                {result.product_info.model && <p><span className="text-muted-foreground">모델:</span> {result.product_info.model}</p>}
                {result.product_info.tagline && <p><span className="text-muted-foreground">태그라인:</span> {result.product_info.tagline}</p>}
                {result.product_info.category && <p><span className="text-muted-foreground">카테고리:</span> {result.product_info.category}</p>}
              </div>
            </div>
          )}

          {/* SEO */}
          {result.seo_title && (
            <div>
              <h4 className="font-semibold text-violet-600 mb-1">SEO</h4>
              <div className="pl-2 space-y-0.5 text-xs">
                <p><span className="text-muted-foreground">제목:</span> {result.seo_title}</p>
                {result.meta_description && <p><span className="text-muted-foreground">설명:</span> {result.meta_description}</p>}
              </div>
            </div>
          )}

          {/* USPs */}
          {result.usps && result.usps.length > 0 && (
            <div>
              <h4 className="font-semibold text-violet-600 mb-1">USP</h4>
              <ul className="pl-2 text-xs space-y-0.5">
                {result.usps.map((usp, i) => <li key={i}>• {usp}</li>)}
              </ul>
            </div>
          )}

          {/* Features */}
          {result.features_and_specs && result.features_and_specs.length > 0 && (
            <div>
              <h4 className="font-semibold text-violet-600 mb-1">주요 기능</h4>
              <ul className="pl-2 text-xs space-y-1">
                {result.features_and_specs.map((f, i) => (
                  <li key={i}>
                    <span className="font-medium">{f.feature}:</span> {f.description}
                    {f.benefit && <span className="text-green-600"> ({f.benefit})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Technical Specs */}
          {result.technical_specs && result.technical_specs.length > 0 && (
            <div>
              <h4 className="font-semibold text-violet-600 mb-1">기술 사양</h4>
              <ul className="pl-2 text-xs space-y-0.5">
                {result.technical_specs.map((s, i) => (
                  <li key={i}><span className="font-medium">{s.component}:</span> {s.specification}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Claims */}
          {result.key_claims && result.key_claims.length > 0 && (
            <div>
              <h4 className="font-semibold text-violet-600 mb-1">주요 클레임</h4>
              <ul className="pl-2 text-xs space-y-0.5">
                {result.key_claims.map((c, i) => <li key={i}>• {c}</li>)}
              </ul>
            </div>
          )}

          {/* Keywords */}
          {result.primary_keywords && result.primary_keywords.length > 0 && (
            <div>
              <h4 className="font-semibold text-violet-600 mb-1">키워드</h4>
              <div className="flex flex-wrap gap-1 pl-2">
                {result.primary_keywords.map((k, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>
                ))}
                {result.secondary_keywords?.map((k, i) => (
                  <Badge key={`s-${i}`} variant="outline" className="text-xs">{k}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Scene Breakdown */}
          {result.scene_breakdown && result.scene_breakdown.length > 0 && (
            <div>
              <h4 className="font-semibold text-violet-600 mb-1">장면 분석 ({result.scene_breakdown.length})</h4>
              <div className="pl-2 space-y-2 text-xs">
                {result.scene_breakdown.slice(0, 10).map((scene, i) => (
                  <div key={i} className="border-l-2 border-violet-300 pl-2">
                    <p className="font-medium text-violet-700">[{scene.timestamp}]</p>
                    <p>{scene.visual_description}</p>
                    {scene.text_narration && <p className="text-muted-foreground italic">"{scene.text_narration}"</p>}
                    {scene.product_focus && <p className="text-green-600">포커스: {scene.product_focus}</p>}
                  </div>
                ))}
                {result.scene_breakdown.length > 10 && (
                  <p className="text-muted-foreground">... 외 {result.scene_breakdown.length - 10}개 장면</p>
                )}
              </div>
            </div>
          )}

          {/* On-screen Text */}
          {result.on_screen_text && result.on_screen_text.length > 0 && (
            <div>
              <h4 className="font-semibold text-violet-600 mb-1">화면 텍스트</h4>
              <ul className="pl-2 text-xs space-y-0.5">
                {result.on_screen_text.slice(0, 15).map((t, i) => (
                  <li key={i}><span className="text-muted-foreground">[{t.timestamp}]</span> {t.text} <Badge variant="outline" className="text-[10px] py-0">{t.type}</Badge></li>
                ))}
                {result.on_screen_text.length > 15 && (
                  <li className="text-muted-foreground">... 외 {result.on_screen_text.length - 15}개</li>
                )}
              </ul>
            </div>
          )}

          {/* Transcript */}
          {result.full_transcript && (
            <div>
              <h4 className="font-semibold text-violet-600 mb-1">전체 나레이션</h4>
              <p className="pl-2 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto bg-white dark:bg-slate-800 p-2 rounded">
                {result.full_transcript}
              </p>
            </div>
          )}

          {/* Hashtags */}
          {result.hashtags_suggested && result.hashtags_suggested.length > 0 && (
            <div>
              <h4 className="font-semibold text-violet-600 mb-1">추천 해시태그</h4>
              <div className="flex flex-wrap gap-1 pl-2">
                {result.hashtags_suggested.map((h, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{h}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        직접 입력한 내용이 우선됩니다
      </p>
    </div>
  )
}
