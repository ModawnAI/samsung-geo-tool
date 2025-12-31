'use client'

import { useCallback, useState } from 'react'
import { useGenerationStore } from '@/store/generation-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UploadSimple, FileText, Warning } from '@phosphor-icons/react'

export function SrtInput() {
  const { videoUrl, srtContent, setVideoUrl, setSrtContent } = useGenerationStore()
  const [parseError, setParseError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload')

  const parseSrt = useCallback((content: string) => {
    // Basic SRT validation
    const lines = content.trim().split('\n')
    if (lines.length < 3) {
      return { valid: false, error: 'SRT content is too short' }
    }

    // Check for timestamp pattern
    const timestampPattern = /\d{2}:\d{2}:\d{2}[,.:]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.:]\d{3}/
    const hasTimestamps = lines.some((line) => timestampPattern.test(line))

    if (!hasTimestamps) {
      return { valid: false, error: 'No valid SRT timestamps found' }
    }

    return { valid: true, error: null }
  }, [])

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        const result = parseSrt(content)
        if (result.valid) {
          setSrtContent(content)
          setParseError(null)
        } else {
          setParseError(result.error)
        }
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
        if (!result.valid) {
          setParseError(result.error)
        } else {
          setParseError(null)
        }
      } else {
        setParseError(null)
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

        {parseError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2"
          >
            <Warning className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            {parseError}
          </div>
        )}
      </div>

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
