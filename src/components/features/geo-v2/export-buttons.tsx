'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { GEOv2GenerateResponse } from '@/types/geo-v2'
import {
  exportToJSON,
  exportToTextReport,
  generateExportFilename,
  createExportBlob,
} from '@/lib/geo-v2/export'
import { exportToMarkdown, generateMarkdownFilename } from '@/lib/geo-v2/export-markdown'
import {
  Download,
  FileText,
  FileJs,
  FileMd,
  Check,
  CaretDown,
  CircleNotch,
  Sliders,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { ExportDialog } from '@/components/features/export-dialog'

interface ExportButtonsProps {
  result: GEOv2GenerateResponse
  productName: string
  language?: 'ko' | 'en'
  className?: string
  variant?: 'default' | 'compact'
}

type ExportFormat = 'json' | 'text' | 'markdown'

export function ExportButtons({
  result,
  productName,
  language = 'ko',
  className,
  variant = 'default',
}: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null)
  const [lastExported, setLastExported] = useState<ExportFormat | null>(null)

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(format)

    try {
      // Generate content based on format
      let content: string
      let blob: Blob
      let filename: string

      if (format === 'json') {
        content = exportToJSON(result, {
          includeSources: true,
          includeScores: true,
          includeUSPs: true,
        })
        blob = createExportBlob(content, 'json')
        filename = generateExportFilename(productName, 'json')
      } else if (format === 'markdown') {
        content = exportToMarkdown(result, {
          language,
          productName,
          includeFrontmatter: true,
        })
        blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
        filename = generateMarkdownFilename(productName)
      } else {
        content = exportToTextReport(result, {}, language)
        blob = createExportBlob(content, 'text')
        filename = generateExportFilename(productName, 'text')
      }

      // Trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setLastExported(format)

      // Reset success indicator after 2 seconds
      setTimeout(() => {
        setLastExported(null)
      }, 2000)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(null)
    }
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-2', className)}
            disabled={isExporting !== null}
          >
            {isExporting ? (
              <CircleNotch className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {language === 'ko' ? '내보내기' : 'Export'}
            <CaretDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            {language === 'ko' ? '내보내기 형식' : 'Export Format'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleExport('json')}
            disabled={isExporting !== null}
            className="gap-2"
          >
            <FileJs className="h-4 w-4" />
            JSON
            {lastExported === 'json' && (
              <Check className="h-4 w-4 text-green-500 ml-auto" />
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleExport('text')}
            disabled={isExporting !== null}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            {language === 'ko' ? '텍스트 리포트' : 'Text Report'}
            {lastExported === 'text' && (
              <Check className="h-4 w-4 text-green-500 ml-auto" />
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleExport('markdown')}
            disabled={isExporting !== null}
            className="gap-2"
          >
            <FileMd className="h-4 w-4" />
            Markdown
            {lastExported === 'markdown' && (
              <Check className="h-4 w-4 text-green-500 ml-auto" />
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ExportDialog
            result={result}
            productName={productName}
            trigger={
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="gap-2"
              >
                <Sliders className="h-4 w-4" />
                {language === 'ko' ? '고급 옵션...' : 'Advanced Options...'}
              </DropdownMenuItem>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              disabled={isExporting !== null}
              className="gap-2"
            >
              {isExporting === 'json' ? (
                <CircleNotch className="h-4 w-4 animate-spin" />
              ) : lastExported === 'json' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <FileJs className="h-4 w-4" />
              )}
              JSON
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {language === 'ko'
                ? '전체 결과를 JSON 형식으로 내보내기'
                : 'Export full results as JSON'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('text')}
              disabled={isExporting !== null}
              className="gap-2"
            >
              {isExporting === 'text' ? (
                <CircleNotch className="h-4 w-4 animate-spin" />
              ) : lastExported === 'text' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {language === 'ko' ? '리포트' : 'Report'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {language === 'ko'
                ? '읽기 쉬운 텍스트 리포트로 내보내기'
                : 'Export as readable text report'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('markdown')}
              disabled={isExporting !== null}
              className="gap-2"
            >
              {isExporting === 'markdown' ? (
                <CircleNotch className="h-4 w-4 animate-spin" />
              ) : lastExported === 'markdown' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <FileMd className="h-4 w-4" />
              )}
              MD
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {language === 'ko'
                ? 'Markdown 형식으로 내보내기'
                : 'Export as Markdown'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ExportDialog
        result={result}
        productName={productName}
        trigger={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Sliders className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {language === 'ko'
                    ? '고급 내보내기 옵션'
                    : 'Advanced export options'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />
    </div>
  )
}

/**
 * Standalone export button with single format
 */
export function SingleExportButton({
  result,
  productName,
  format,
  language = 'ko',
  className,
}: {
  result: GEOv2GenerateResponse
  productName: string
  format: ExportFormat
  language?: 'ko' | 'en'
  className?: string
}) {
  const [isExporting, setIsExporting] = useState(false)
  const [exported, setExported] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      let content: string
      let blob: Blob
      let filename: string

      if (format === 'json') {
        content = exportToJSON(result)
        blob = createExportBlob(content, 'json')
        filename = generateExportFilename(productName, 'json')
      } else if (format === 'markdown') {
        content = exportToMarkdown(result, { language, productName })
        blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
        filename = generateMarkdownFilename(productName)
      } else {
        content = exportToTextReport(result, {}, language)
        blob = createExportBlob(content, 'text')
        filename = generateExportFilename(productName, 'text')
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExported(true)
      setTimeout(() => setExported(false), 2000)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const Icon = format === 'json' ? FileJs : format === 'markdown' ? FileMd : FileText
  const label =
    format === 'json'
      ? 'JSON'
      : format === 'markdown'
      ? 'Markdown'
      : language === 'ko'
      ? '텍스트 리포트'
      : 'Text Report'

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className={cn('gap-2', className)}
    >
      {isExporting ? (
        <CircleNotch className="h-4 w-4 animate-spin" />
      ) : exported ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {label}
    </Button>
  )
}
