'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Export,
  FileJs,
  FileText,
  FileMd,
  Code,
  Copy,
  Check,
  Download,
} from '@phosphor-icons/react'
import { useTranslation } from '@/lib/i18n'
import type { GEOv2GenerateResponse } from '@/types/geo-v2'
import { exportToJSON, exportToTextReport, generateExportFilename, createExportBlob } from '@/lib/geo-v2/export'
import { exportToMarkdown, generateMarkdownFilename, type MarkdownExportOptions } from '@/lib/geo-v2/export-markdown'
import { exportToCMS, generateCMSFilename, getCMSFormatLabel, type CMSFormat, type CMSExportOptions } from '@/lib/geo-v2/export-cms'

type ExportFormat = 'json' | 'text' | 'markdown' | 'cms'

interface ExportDialogProps {
  result: GEOv2GenerateResponse
  productName?: string
  trigger?: React.ReactNode
}

export function ExportDialog({ result, productName = 'Product', trigger }: ExportDialogProps) {
  const { t, language } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('json')
  const [copied, setCopied] = useState(false)

  // JSON/Text options
  const [includeSources, setIncludeSources] = useState(true)
  const [includeScores, setIncludeScores] = useState(true)
  const [includeUSPs, setIncludeUSPs] = useState(true)

  // Markdown options
  const [includeFrontmatter, setIncludeFrontmatter] = useState(true)
  const [mdSections, setMdSections] = useState({
    description: true,
    usps: true,
    faq: true,
    chapters: true,
    caseStudies: true,
    keywords: true,
    hashtags: true,
    scores: true,
    sources: true,
  })

  // CMS options
  const [cmsFormat, setCmsFormat] = useState<CMSFormat>('generic')
  const [includeMetadata, setIncludeMetadata] = useState(true)

  const generateContent = useCallback((): string => {
    const lang = language as 'ko' | 'en'

    switch (activeFormat) {
      case 'json':
        return exportToJSON(result, { includeSources, includeScores, includeUSPs })

      case 'text':
        return exportToTextReport(
          result,
          {
            description: true,
            usps: includeUSPs,
            faq: true,
            chapters: true,
            caseStudies: true,
            groundingSources: includeSources,
            scores: includeScores,
          },
          lang
        )

      case 'markdown':
        const mdOptions: Partial<MarkdownExportOptions> = {
          includeFrontmatter,
          sections: mdSections,
          language: lang,
          productName,
        }
        return exportToMarkdown(result, mdOptions)

      case 'cms':
        const cmsOptions: Partial<CMSExportOptions> = {
          format: cmsFormat,
          language: lang,
          productName,
          includeMetadata,
        }
        return exportToCMS(result, cmsOptions)

      default:
        return ''
    }
  }, [
    activeFormat,
    result,
    includeSources,
    includeScores,
    includeUSPs,
    includeFrontmatter,
    mdSections,
    cmsFormat,
    includeMetadata,
    language,
    productName,
  ])

  const handleCopy = useCallback(async () => {
    const content = generateContent()
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [generateContent])

  const handleDownload = useCallback(() => {
    const content = generateContent()
    let filename: string
    let blob: Blob

    switch (activeFormat) {
      case 'json':
        filename = generateExportFilename(productName, 'json')
        blob = createExportBlob(content, 'json')
        break
      case 'text':
        filename = generateExportFilename(productName, 'text')
        blob = createExportBlob(content, 'text')
        break
      case 'markdown':
        filename = generateMarkdownFilename(productName)
        blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
        break
      case 'cms':
        filename = generateCMSFilename(productName, cmsFormat)
        blob = new Blob([content], { type: 'application/json;charset=utf-8' })
        break
      default:
        return
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [activeFormat, generateContent, productName, cmsFormat])

  const toggleMdSection = (key: keyof typeof mdSections) => {
    setMdSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const isKorean = language === 'ko'

  const formatIcons: Record<ExportFormat, React.ReactNode> = {
    json: <FileJs className="h-4 w-4" />,
    text: <FileText className="h-4 w-4" />,
    markdown: <FileMd className="h-4 w-4" />,
    cms: <Code className="h-4 w-4" />,
  }

  const formatLabels: Record<ExportFormat, string> = {
    json: 'JSON',
    text: isKorean ? '텍스트' : 'Text',
    markdown: 'Markdown',
    cms: 'CMS',
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Export className="h-4 w-4 mr-2" />
            {isKorean ? '내보내기' : 'Export'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isKorean ? '결과 내보내기' : 'Export Results'}</DialogTitle>
          <DialogDescription>
            {isKorean
              ? 'GEO 최적화 결과를 다양한 형식으로 내보내세요.'
              : 'Export your GEO optimization results in various formats.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeFormat} onValueChange={(v) => setActiveFormat(v as ExportFormat)}>
          <TabsList className="grid w-full grid-cols-4">
            {(['json', 'text', 'markdown', 'cms'] as ExportFormat[]).map((format) => (
              <TabsTrigger key={format} value={format} className="flex items-center gap-1.5">
                {formatIcons[format]}
                <span className="hidden sm:inline">{formatLabels[format]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* JSON Options */}
          <TabsContent value="json" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="json-sources">{isKorean ? '그라운딩 소스 포함' : 'Include Grounding Sources'}</Label>
                <Switch id="json-sources" checked={includeSources} onCheckedChange={setIncludeSources} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="json-scores">{isKorean ? 'GEO 점수 포함' : 'Include GEO Scores'}</Label>
                <Switch id="json-scores" checked={includeScores} onCheckedChange={setIncludeScores} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="json-usps">{isKorean ? 'USP 포함' : 'Include USPs'}</Label>
                <Switch id="json-usps" checked={includeUSPs} onCheckedChange={setIncludeUSPs} />
              </div>
            </div>
          </TabsContent>

          {/* Text Options */}
          <TabsContent value="text" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="text-sources">{isKorean ? '그라운딩 소스 포함' : 'Include Grounding Sources'}</Label>
                <Switch id="text-sources" checked={includeSources} onCheckedChange={setIncludeSources} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="text-scores">{isKorean ? 'GEO 점수 포함' : 'Include GEO Scores'}</Label>
                <Switch id="text-scores" checked={includeScores} onCheckedChange={setIncludeScores} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="text-usps">{isKorean ? 'USP 포함' : 'Include USPs'}</Label>
                <Switch id="text-usps" checked={includeUSPs} onCheckedChange={setIncludeUSPs} />
              </div>
            </div>
          </TabsContent>

          {/* Markdown Options */}
          <TabsContent value="markdown" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="md-frontmatter">{isKorean ? 'Frontmatter 포함' : 'Include Frontmatter'}</Label>
                <Switch id="md-frontmatter" checked={includeFrontmatter} onCheckedChange={setIncludeFrontmatter} />
              </div>
              <div className="border-t pt-3">
                <Label className="text-sm font-medium">{isKorean ? '포함할 섹션' : 'Sections to Include'}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {Object.entries(mdSections).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label htmlFor={`md-${key}`} className="text-sm capitalize">
                        {key === 'caseStudies' ? (isKorean ? '사례 연구' : 'Case Studies') : key}
                      </Label>
                      <Switch
                        id={`md-${key}`}
                        checked={value}
                        onCheckedChange={() => toggleMdSection(key as keyof typeof mdSections)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* CMS Options */}
          <TabsContent value="cms" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{isKorean ? 'CMS 형식' : 'CMS Format'}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['generic', 'wordpress', 'contentful'] as CMSFormat[]).map((format) => (
                    <Button
                      key={format}
                      variant={cmsFormat === format ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCmsFormat(format)}
                      className="flex-1"
                    >
                      {getCMSFormatLabel(format, language as 'ko' | 'en')}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="cms-metadata">{isKorean ? '메타데이터 포함' : 'Include Metadata'}</Label>
                <Switch id="cms-metadata" checked={includeMetadata} onCheckedChange={setIncludeMetadata} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleCopy} className="flex-1">
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? (isKorean ? '복사됨' : 'Copied') : (isKorean ? '복사' : 'Copy')}
          </Button>
          <Button onClick={handleDownload} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            {isKorean ? '다운로드' : 'Download'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
