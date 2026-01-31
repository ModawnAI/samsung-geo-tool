'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Upload,
  Link as LinkIcon,
  TextAlignLeft,
  File,
  X,
  CheckCircle,
  Warning,
  SpinnerGap,
} from '@phosphor-icons/react'
import type { ReviewTiming, ContentSubmissionForm as ContentSubmissionFormType, Platform } from '@/types/geo-v2'
import { toast } from 'sonner'

interface ContentSubmissionFormProps {
  reviewTiming: ReviewTiming
  platform: Platform
  productName: string
  onSubmit: (form: ContentSubmissionFormType) => Promise<void>
  isLoading?: boolean
}

export function ContentSubmissionForm({
  reviewTiming,
  platform,
  productName,
  onSubmit,
  isLoading = false,
}: ContentSubmissionFormProps) {
  // Pre-review fields
  const [wipDescription, setWipDescription] = useState('')
  const [includeAsset, setIncludeAsset] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  
  // Post-review fields
  const [publishedUrl, setPublishedUrl] = useState('')
  
  // Validation states
  const [urlValid, setUrlValid] = useState<boolean | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validate URL format
  const validateUrl = (url: string) => {
    if (!url) {
      setUrlValid(null)
      return
    }
    
    const platformPatterns: Record<Platform, RegExp> = {
      youtube: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/i,
      instagram: /^https?:\/\/(www\.)?instagram\.com\/.+$/i,
      tiktok: /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)\/.+$/i,
    }
    
    const pattern = platformPatterns[platform]
    setUrlValid(pattern.test(url))
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime']
      if (!validTypes.includes(file.type)) {
        toast.error('지원되지 않는 파일 형식입니다. (JPG, PNG, GIF, MP4)')
        return
      }
      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('파일 크기가 100MB를 초과합니다.')
        return
      }
      setMediaFile(file)
    }
  }

  // Clear file
  const handleClearFile = () => {
    setMediaFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (reviewTiming === 'post') {
      if (!publishedUrl) {
        toast.error('게재된 콘텐츠 URL을 입력해주세요.')
        return
      }
      if (!urlValid) {
        toast.error(`올바른 ${platform} URL을 입력해주세요.`)
        return
      }
    } else {
      if (!wipDescription) {
        toast.error('WIP 디스크립션을 입력해주세요.')
        return
      }
    }

    // Build form data
    const formData: ContentSubmissionFormType = {
      classification: 'non_unpacked_general', // Default, should come from parent
      reviewTiming,
      includeAsset: reviewTiming === 'pre' ? includeAsset : false,
      ...(reviewTiming === 'post' ? { publishedUrl } : {}),
      ...(reviewTiming === 'pre' ? { 
        wipDescription,
        wipMedia: mediaFile || undefined,
      } : {}),
    }

    await onSubmit(formData)
  }

  return (
    <Card className="border-[#040523]/10 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {reviewTiming === 'pre' ? (
            <>
              <TextAlignLeft className="h-4 w-4" />
              콘텐츠 제출 양식 (사전 검수)
            </>
          ) : (
            <>
              <LinkIcon className="h-4 w-4" />
              콘텐츠 URL 입력 (사후 검수)
            </>
          )}
          <Badge variant="outline" className="text-xs ml-auto">
            {platform.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviewTiming === 'pre' ? (
          // ==========================================
          // PRE-REVIEW FORM
          // ==========================================
          <>
            {/* WIP Description */}
            <div className="space-y-2">
              <Label htmlFor="wip-description" className="text-sm font-medium">
                WIP 디스크립션 카피 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="wip-description"
                placeholder="디스크립션 초안 또는 최종본을 입력해주세요..."
                value={wipDescription}
                onChange={(e) => setWipDescription(e.target.value)}
                className="min-h-[120px]"
                disabled={isLoading}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>카피 초안 ~ 최종본</span>
                <span>{wipDescription.length}자</span>
              </div>
            </div>

            {/* Product Info (read-only from parent) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">주요 제품 정보</Label>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm font-medium">{productName || '제품 미선택'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  플레이북 기반 제품 정보가 자동으로 적용됩니다.
                </p>
              </div>
            </div>

            {/* Include Asset Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
              <div className="space-y-0.5">
                <Label htmlFor="include-asset" className="text-sm font-medium">
                  WIP 영상/이미지 첨부
                </Label>
                <p className="text-xs text-muted-foreground">
                  어셋을 첨부하면 더 정확한 검수가 가능합니다
                </p>
              </div>
              <Switch
                id="include-asset"
                checked={includeAsset}
                onCheckedChange={setIncludeAsset}
                disabled={isLoading}
              />
            </div>

            {/* File Upload (conditional) */}
            {includeAsset && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium">미디어 파일</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/quicktime"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {mediaFile ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
                    <div className="flex items-center gap-2">
                      <File className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">{mediaFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFile}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-20 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm">파일 선택 또는 드래그 앤 드롭</span>
                      <span className="text-xs text-muted-foreground">
                        JPG, PNG, GIF, MP4 (최대 100MB)
                      </span>
                    </div>
                  </Button>
                )}
              </motion.div>
            )}
          </>
        ) : (
          // ==========================================
          // POST-REVIEW FORM
          // ==========================================
          <>
            {/* Published URL */}
            <div className="space-y-2">
              <Label htmlFor="published-url" className="text-sm font-medium">
                게재된 콘텐츠 URL <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="published-url"
                  type="url"
                  placeholder={
                    platform === 'youtube'
                      ? 'https://youtube.com/watch?v=...'
                      : platform === 'instagram'
                      ? 'https://instagram.com/p/...'
                      : 'https://tiktok.com/@user/video/...'
                  }
                  value={publishedUrl}
                  onChange={(e) => {
                    setPublishedUrl(e.target.value)
                    validateUrl(e.target.value)
                  }}
                  disabled={isLoading}
                  className={`pr-10 ${
                    urlValid === true
                      ? 'border-green-500 focus:ring-green-500'
                      : urlValid === false
                      ? 'border-red-500 focus:ring-red-500'
                      : ''
                  }`}
                />
                {urlValid !== null && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {urlValid ? (
                      <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
                    ) : (
                      <Warning className="h-5 w-5 text-red-500" weight="fill" />
                    )}
                  </div>
                )}
              </div>
              {urlValid === false && (
                <p className="text-xs text-red-500">
                  올바른 {platform} URL 형식이 아닙니다.
                </p>
              )}
            </div>

            {/* URL Format Guide */}
            <div className="p-3 rounded-lg bg-muted/50 border text-xs">
              <p className="font-medium mb-1">URL 형식 가이드</p>
              <ul className="space-y-1 text-muted-foreground">
                {platform === 'youtube' && (
                  <>
                    <li>• https://youtube.com/watch?v=VIDEO_ID</li>
                    <li>• https://youtu.be/VIDEO_ID</li>
                  </>
                )}
                {platform === 'instagram' && (
                  <>
                    <li>• https://instagram.com/p/POST_ID/</li>
                    <li>• https://instagram.com/reel/REEL_ID/</li>
                  </>
                )}
                {platform === 'tiktok' && (
                  <>
                    <li>• https://tiktok.com/@username/video/VIDEO_ID</li>
                    <li>• https://vm.tiktok.com/SHORT_ID/</li>
                  </>
                )}
              </ul>
            </div>
          </>
        )}

        {/* Submit Button */}
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={isLoading || (reviewTiming === 'post' && !urlValid)}
        >
          {isLoading ? (
            <>
              <SpinnerGap className="h-4 w-4 animate-spin mr-2" />
              검수 진행 중...
            </>
          ) : (
            <>검수 시작</>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
