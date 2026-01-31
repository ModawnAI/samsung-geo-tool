'use client'

import { useState, useCallback, useRef } from 'react'
import { useGenerationStore } from '@/store/generation-store'
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
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface VideoAnalysisResult {
  id: string
  seo_title?: string
  meta_description?: string
  primary_keywords?: string[]
  secondary_keywords?: string[]
  long_tail_keywords?: string[]
  scene_breakdown?: Array<{
    timestamp: string
    visual_description: string
    text_narration: string
    product_focus?: string
  }>
  key_claims?: string[]
  full_analysis?: string
  full_transcript?: string
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

    setFileName(file.name)
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
    let extracted = ''
    
    if (result.full_transcript) {
      extracted += result.full_transcript + '\n\n'
    }
    
    if (result.features_and_specs?.length) {
      extracted += '=== 주요 기능 ===\n'
      result.features_and_specs.forEach(f => {
        extracted += `• ${f.feature}: ${f.description}\n`
      })
      extracted += '\n'
    }
    
    if (result.usps?.length) {
      extracted += '=== USP ===\n'
      result.usps.forEach(u => extracted += `• ${u}\n`)
      extracted += '\n'
    }
    
    if (result.scene_breakdown?.length) {
      result.scene_breakdown.forEach((scene, i) => {
        extracted += `${i + 1}\n${scene.timestamp}\n${scene.text_narration || scene.visual_description}\n\n`
      })
    }
    
    if (!extracted.trim() && result.full_analysis) {
      extracted = result.full_analysis
    }

    if (existingContent.trim()) {
      setSrtContent(existingContent + '\n\n--- AI 추출 ---\n\n' + extracted)
    } else {
      setSrtContent(extracted)
    }
  }, [result, setSrtContent])

  const applyKeywords = useCallback(() => {
    if (!result) return

    const allKeywords = [
      ...(result.primary_keywords || []),
      ...(result.secondary_keywords || []),
      ...(result.usps || []),
      ...(result.features_and_specs?.map(f => f.feature) || []),
      ...(result.hashtags_suggested?.map(h => h.replace(/^#/, '')) || []),
    ]
    
    const unique = [...new Set(allKeywords)].slice(0, 15)
    const existingSet = new Set(selectedKeywords.map(k => k.toLowerCase()))
    const newKeywords = unique.filter(k => !existingSet.has(k.toLowerCase()))
    
    setSelectedKeywords([...selectedKeywords, ...newKeywords])
  }, [result, selectedKeywords, setSelectedKeywords])

  const reset = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setError(null)
    setResult(null)
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

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
            <p className="text-sm text-muted-foreground">{fileName}</p>
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
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
            <span className="font-medium text-green-900 dark:text-green-100">분석 완료</span>
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
          {(result?.features_and_specs?.length ?? 0) > 0 && (
            <div>
              <span className="text-muted-foreground">기능:</span>{' '}
              <span className="font-medium">{result?.features_and_specs?.length}개</span>
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
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
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
      </div>

      <p className="text-xs text-muted-foreground text-center">
        직접 입력한 내용이 우선됩니다
      </p>
    </div>
  )
}
