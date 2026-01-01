'use client'

import * as React from 'react'
import { useCallback, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  UploadSimple,
  Camera,
  FileText,
  FileCsv,
  FileCode,
  Check,
  X,
  Spinner,
  ClipboardText,
} from '@phosphor-icons/react'

type UploadType = 'products' | 'briefs' | 'keywords'
type UploadFormat = 'csv' | 'json'

interface MobileUploaderProps {
  onDataParsed: (data: Record<string, unknown>[], type: UploadType) => void
  className?: string
}

interface UploadTypeConfig {
  title: string
  description: string
  icon: React.ReactNode
  requiredFields: string[]
  csvTemplate: string
  jsonTemplate: string
}

const UPLOAD_TYPE_CONFIG: Record<UploadType, UploadTypeConfig> = {
  products: {
    title: 'Products',
    description: 'Product definitions with categories',
    icon: <FileText className="h-5 w-5" weight="duotone" />,
    requiredFields: ['name', 'category_id'],
    csvTemplate: 'name,category_id,code_name\n"Galaxy S24 Ultra","smartphones","s24ultra"',
    jsonTemplate: JSON.stringify(
      [{ name: 'Galaxy S24 Ultra', category_id: 'smartphones', code_name: 's24ultra' }],
      null,
      2
    ),
  },
  briefs: {
    title: 'Briefs',
    description: 'Marketing briefs with USPs',
    icon: <ClipboardText className="h-5 w-5" weight="duotone" />,
    requiredFields: ['product_id', 'usps'],
    csvTemplate:
      'product_id,usps,content,is_active\n"prod_123","Best camera|Long battery","Content",true',
    jsonTemplate: JSON.stringify(
      [
        {
          product_id: 'prod_123',
          usps: ['Best camera', 'Long battery'],
          content: 'Marketing content',
          is_active: true,
        },
      ],
      null,
      2
    ),
  },
  keywords: {
    title: 'Keywords',
    description: 'Target keywords for optimization',
    icon: <FileCode className="h-5 w-5" weight="duotone" />,
    requiredFields: ['keyword'],
    csvTemplate: 'keyword,priority,category\n"best smartphone 2024","high","mobile"',
    jsonTemplate: JSON.stringify(
      [{ keyword: 'best smartphone 2024', priority: 'high', category: 'mobile' }],
      null,
      2
    ),
  },
}

type UploadState = 'idle' | 'processing' | 'success' | 'error'

export function MobileUploader({ onDataParsed, className }: MobileUploaderProps) {
  const [uploadType, setUploadType] = useState<UploadType>('products')
  const [format, setFormat] = useState<UploadFormat>('csv')
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [recordCount, setRecordCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const config = UPLOAD_TYPE_CONFIG[uploadType]

  const parseCSV = useCallback((csv: string): Record<string, unknown>[] => {
    const lines = csv.split('\n').filter((line) => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
    const records: Record<string, unknown>[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const record: Record<string, unknown> = {}
      headers.forEach((header, j) => {
        const value = values[j]?.trim().replace(/"/g, '') || null
        if (value === 'true') record[header] = true
        else if (value === 'false') record[header] = false
        else if (value && !isNaN(Number(value))) record[header] = Number(value)
        else record[header] = value
      })
      records.push(record)
    }

    return records
  }, [])

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)

    return result
  }

  const processFile = useCallback(
    async (file: File) => {
      setUploadState('processing')
      setSelectedFile(file)

      try {
        const content = await file.text()
        let records: Record<string, unknown>[]

        if (format === 'csv') {
          records = parseCSV(content)
        } else {
          const parsed = JSON.parse(content)
          records = Array.isArray(parsed) ? parsed : [parsed]
        }

        if (records.length === 0) {
          setUploadState('error')
          toast({
            title: 'No data found',
            description: 'The file contains no valid records.',
            variant: 'destructive',
          })
          return
        }

        // Validate required fields
        const missingFields: string[] = []
        for (const field of config.requiredFields) {
          const hasField = records.every((r) => r[field] !== undefined && r[field] !== null)
          if (!hasField) {
            missingFields.push(field)
          }
        }

        if (missingFields.length > 0) {
          setUploadState('error')
          toast({
            title: 'Missing required fields',
            description: `Required: ${missingFields.join(', ')}`,
            variant: 'destructive',
          })
          return
        }

        setRecordCount(records.length)
        setUploadState('success')
        onDataParsed(records, uploadType)

        toast({
          title: 'Upload successful',
          description: `Parsed ${records.length} records.`,
        })
      } catch (error) {
        setUploadState('error')
        toast({
          title: 'Parse error',
          description: error instanceof Error ? error.message : 'Failed to parse file.',
          variant: 'destructive',
        })
      }
    },
    [format, config.requiredFields, onDataParsed, uploadType, parseCSV, toast]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        processFile(file)
      }
    },
    [processFile]
  )

  const handleReset = useCallback(() => {
    setUploadState('idle')
    setSelectedFile(null)
    setRecordCount(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }, [])

  const getFormatIcon = () => {
    return format === 'csv' ? (
      <FileCsv className="h-6 w-6" weight="duotone" />
    ) : (
      <FileCode className="h-6 w-6" weight="duotone" />
    )
  }

  const renderUploadState = () => {
    switch (uploadState) {
      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner className="h-12 w-12 animate-spin text-primary" weight="bold" />
            <p className="mt-4 text-sm font-medium">Processing file...</p>
            {selectedFile && (
              <p className="mt-1 text-xs text-muted-foreground">{selectedFile.name}</p>
            )}
          </div>
        )

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" weight="bold" />
            </div>
            <p className="mt-4 text-sm font-medium">Upload successful</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {recordCount} record{recordCount !== 1 ? 's' : ''} parsed
            </p>
            <Button variant="outline" size="sm" onClick={handleReset} className="mt-4">
              Upload Another
            </Button>
          </div>
        )

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <X className="h-8 w-8 text-red-600 dark:text-red-400" weight="bold" />
            </div>
            <p className="mt-4 text-sm font-medium">Upload failed</p>
            {selectedFile && (
              <p className="mt-1 text-xs text-muted-foreground">{selectedFile.name}</p>
            )}
            <Button variant="outline" size="sm" onClick={handleReset} className="mt-4">
              Try Again
            </Button>
          </div>
        )

      default:
        return (
          <div className="space-y-4">
            {/* Upload buttons - large touch targets */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6',
                  'transition-colors active:bg-primary/10',
                  'border-muted-foreground/25 hover:border-primary/50'
                )}
              >
                <UploadSimple className="h-8 w-8 text-muted-foreground" weight="duotone" />
                <span className="mt-2 text-sm font-medium">Choose File</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {format.toUpperCase()}
                </span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6',
                  'transition-colors active:bg-primary/10',
                  'border-muted-foreground/25 hover:border-primary/50'
                )}
              >
                <Camera className="h-8 w-8 text-muted-foreground" weight="duotone" />
                <span className="mt-2 text-sm font-medium">Scan Document</span>
                <span className="mt-1 text-xs text-muted-foreground">Camera</span>
              </button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept={format === 'csv' ? '.csv,text/csv' : '.json,application/json'}
              onChange={handleFileChange}
              className="hidden"
              aria-hidden="true"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              aria-hidden="true"
            />

            {/* Template info */}
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-start gap-3">
                {getFormatIcon()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Required Fields</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {config.requiredFields.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          {config.icon}
          <div>
            <CardTitle className="text-base">Upload {config.title}</CardTitle>
            <CardDescription className="text-xs">{config.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type and format selection - stacked for mobile */}
        {uploadState === 'idle' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data Type</label>
              <Select value={uploadType} onValueChange={(v) => setUploadType(v as UploadType)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(UPLOAD_TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key} className="py-3">
                      <div className="flex items-center gap-2">
                        {cfg.icon}
                        <span>{cfg.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Format</label>
              <Select value={format} onValueChange={(v) => setFormat(v as UploadFormat)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv" className="py-3">
                    <div className="flex items-center gap-2">
                      <FileCsv className="h-4 w-4" weight="duotone" />
                      <span>CSV</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="json" className="py-3">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4" weight="duotone" />
                      <span>JSON</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Upload area */}
        {renderUploadState()}
      </CardContent>
    </Card>
  )
}

export type { UploadType, UploadFormat, MobileUploaderProps }
