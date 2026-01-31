'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Upload,
  VideoCamera,
  Sparkle,
  Image as ImageIcon,
  Clock,
  Tag,
  FileText,
  Target,
  Palette,
  Code,
  Lightning,
  Check,
  X,
  Spinner,
  Trash,
  ArrowRight,
  Download,
  Copy,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { VideoAnalysis, ThumbnailOption } from '@/types/video-analysis'

type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'extracting' | 'complete' | 'error'

export default function VideoAnalysisPage() {
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [currentAnalysis, setCurrentAnalysis] = useState<VideoAnalysis | null>(null)
  const [analyses, setAnalyses] = useState<VideoAnalysis[]>([])
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch existing analyses on mount
  useEffect(() => {
    fetchAnalyses()
  }, [])

  const fetchAnalyses = async () => {
    try {
      const response = await fetch('/api/video-analysis')
      if (response.ok) {
        const data = await response.json()
        setAnalyses(data.analyses || [])
      }
    } catch (err) {
      console.error('Failed to fetch analyses:', err)
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setStatus('uploading')
    setProgress(10)
    setError(null)

    try {
      // Step 1: Upload video
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/video-analysis/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const uploadResult = await uploadResponse.json()
      setProgress(30)

      // Step 2: Analyze video
      setStatus('analyzing')
      
      const analyzeResponse = await fetch('/api/video-analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: uploadResult.id }),
      })

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const analysisResult = await analyzeResponse.json()
      setProgress(70)

      // Step 3: Extract thumbnails
      setStatus('extracting')

      const thumbnailResponse = await fetch('/api/video-analysis/thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: uploadResult.id }),
      })

      if (thumbnailResponse.ok) {
        const thumbnailResult = await thumbnailResponse.json()
        analysisResult.thumbnails = thumbnailResult.thumbnails
      }

      setProgress(100)
      setCurrentAnalysis(analysisResult)
      setStatus('complete')
      fetchAnalyses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setStatus('error')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mpeg', '.wmv', '.3gp'],
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    multiple: false,
  })

  const handleSelectThumbnail = async (url: string) => {
    setSelectedThumbnail(url)
    
    if (currentAnalysis) {
      await fetch(`/api/video-analysis/${currentAnalysis.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_thumbnail_url: url }),
      })
    }
  }

  const handleDeleteAnalysis = async (id: string) => {
    if (!confirm('Are you sure you want to delete this analysis?')) return

    await fetch('/api/video-analysis', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    if (currentAnalysis?.id === id) {
      setCurrentAnalysis(null)
      setStatus('idle')
    }
    fetchAnalyses()
  }

  const handleViewAnalysis = async (analysis: VideoAnalysis) => {
    setCurrentAnalysis(analysis)
    setSelectedThumbnail(analysis.selected_thumbnail_url || null)
    setStatus('complete')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <VideoCamera className="h-6 w-6" />
            Video Analysis
          </h1>
          <p className="text-muted-foreground">
            Upload videos for comprehensive SEO/AEO/GEO analysis using Gemini 3 Flash
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {/* Upload Area */}
          {status === 'idle' && (
            <Card>
              <CardContent className="pt-6">
                <div
                  {...getRootProps()}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  {isDragActive ? (
                    <p className="text-lg font-medium">Drop your video here...</p>
                  ) : (
                    <>
                      <p className="text-lg font-medium">Drag & drop a video file</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        or click to browse (MP4, MOV, AVI, WebM - max 500MB)
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {(status === 'uploading' || status === 'analyzing' || status === 'extracting') && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Spinner className="h-5 w-5 animate-spin" />
                    <span className="font-medium">
                      {status === 'uploading' && 'Uploading video...'}
                      {status === 'analyzing' && 'Analyzing with Gemini 3 Flash...'}
                      {status === 'extracting' && 'Extracting thumbnails...'}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    {status === 'analyzing' && 'This may take a few minutes for longer videos'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {status === 'error' && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-destructive">
                  <X className="h-5 w-5" />
                  <span>{error}</span>
                </div>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setStatus('idle')}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {status === 'complete' && currentAnalysis && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="thumbnails">Thumbnails</TabsTrigger>
                <TabsTrigger value="schema">Schema</TabsTrigger>
                <TabsTrigger value="raw">Raw</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* SEO Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      SEO Metadata
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">SEO Title</label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="flex-1 p-2 bg-muted rounded text-sm">{currentAnalysis.seo_title}</p>
                        <Button size="icon" variant="ghost" onClick={() => copyToClipboard(currentAnalysis.seo_title || '')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Meta Description</label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="flex-1 p-2 bg-muted rounded text-sm">{currentAnalysis.meta_description}</p>
                        <Button size="icon" variant="ghost" onClick={() => copyToClipboard(currentAnalysis.meta_description || '')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Search Intent</label>
                      <p className="mt-1">
                        <Badge variant="secondary">{currentAnalysis.search_intent}</Badge>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Keywords */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Keywords
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Primary Keywords</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {currentAnalysis.primary_keywords?.map((kw, i) => (
                          <Badge key={i} variant="default">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Secondary Keywords</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {currentAnalysis.secondary_keywords?.map((kw, i) => (
                          <Badge key={i} variant="secondary">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Long-tail Keywords</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {currentAnalysis.long_tail_keywords?.map((kw, i) => (
                          <Badge key={i} variant="outline">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Visual Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Visual Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Visual Style</label>
                      <p className="mt-1 text-sm">{currentAnalysis.visual_style}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Production Quality</label>
                      <p className="mt-1 text-sm">{currentAnalysis.production_quality}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Color Palette</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {currentAnalysis.color_palette?.map((color, i) => (
                          <div key={i} className="flex items-center gap-1">
                            {color.startsWith('#') && (
                              <div
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: color }}
                              />
                            )}
                            <span className="text-sm">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                {/* Scene Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Scene Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {currentAnalysis.scene_breakdown?.map((scene, i) => (
                          <div key={i} className="border-l-2 border-primary pl-4 py-2">
                            <p className="font-mono text-sm text-primary">{scene.timestamp}</p>
                            <p className="text-sm mt-1"><strong>Visual:</strong> {scene.visual_description}</p>
                            {scene.text_narration && (
                              <p className="text-sm mt-1 text-muted-foreground">
                                <strong>Text/Speech:</strong> {scene.text_narration}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Technical Specs */}
                {currentAnalysis.technical_specs && currentAnalysis.technical_specs.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightning className="h-5 w-5" />
                        Technical Specifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {currentAnalysis.technical_specs.map((spec, i) => (
                          <div key={i} className="flex justify-between p-2 bg-muted rounded">
                            <span className="text-sm font-medium">{spec.component}</span>
                            <span className="text-sm text-muted-foreground">{spec.specification}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Key Claims */}
                {currentAnalysis.key_claims && currentAnalysis.key_claims.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Claims</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1">
                        {currentAnalysis.key_claims.map((claim, i) => (
                          <li key={i} className="text-sm">{claim}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="thumbnails" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Thumbnail Options
                    </CardTitle>
                    <CardDescription>
                      Select the best thumbnail for your video
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {currentAnalysis.thumbnails?.map((thumb, i) => (
                        <div
                          key={i}
                          className={cn(
                            'relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all',
                            selectedThumbnail === thumb.url
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-transparent hover:border-muted-foreground/50'
                          )}
                          onClick={() => handleSelectThumbnail(thumb.url)}
                        >
                          <img
                            src={thumb.url}
                            alt={`Thumbnail at ${thumb.timestamp}`}
                            className="w-full aspect-video object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <p className="text-white text-xs font-mono">{thumb.timestamp}</p>
                          </div>
                          {selectedThumbnail === thumb.url && (
                            <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {currentAnalysis.thumbnails && currentAnalysis.thumbnails.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No thumbnails extracted yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schema" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      VideoObject Schema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="p-4 bg-muted rounded-lg overflow-auto text-xs">
                      {JSON.stringify(currentAnalysis.schema_video_object, null, 2)}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => copyToClipboard(JSON.stringify(currentAnalysis.schema_video_object, null, 2))}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      FAQ Schema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="p-4 bg-muted rounded-lg overflow-auto text-xs">
                      {JSON.stringify(currentAnalysis.schema_faq, null, 2)}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => copyToClipboard(JSON.stringify(currentAnalysis.schema_faq, null, 2))}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="raw">
                <Card>
                  <CardHeader>
                    <CardTitle>Full Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px]">
                      <pre className="p-4 bg-muted rounded-lg text-xs whitespace-pre-wrap">
                        {currentAnalysis.full_analysis}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* New Analysis Button when viewing old one */}
          {status === 'complete' && (
            <Button
              variant="outline"
              onClick={() => {
                setStatus('idle')
                setCurrentAnalysis(null)
                setSelectedThumbnail(null)
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Analyze New Video
            </Button>
          )}
        </div>

        {/* Sidebar - Recent Analyses */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Analyses</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {analyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-colors',
                        currentAnalysis?.id === analysis.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      )}
                      onClick={() => handleViewAnalysis(analysis)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{analysis.video_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(analysis.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={
                              analysis.status === 'completed'
                                ? 'default'
                                : analysis.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {analysis.status}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteAnalysis(analysis.id)
                            }}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {analyses.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No analyses yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Token Usage */}
          {currentAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Token Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Video Tokens</span>
                  <span>{currentAnalysis.video_tokens?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prompt Tokens</span>
                  <span>{currentAnalysis.prompt_tokens?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completion Tokens</span>
                  <span>{currentAnalysis.completion_tokens?.toLocaleString() || 0}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>
                    {(
                      (currentAnalysis.video_tokens || 0) +
                      (currentAnalysis.prompt_tokens || 0) +
                      (currentAnalysis.completion_tokens || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
