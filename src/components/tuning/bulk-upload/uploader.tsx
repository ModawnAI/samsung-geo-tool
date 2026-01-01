'use client'

import * as React from 'react'
import { useCallback, useState } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

type UploadType = 'products' | 'briefs' | 'keywords'
type UploadFormat = 'csv' | 'json'

interface UploaderProps {
  onDataParsed: (data: Record<string, unknown>[], type: UploadType) => void
  className?: string
}

const UPLOAD_TYPE_CONFIG: Record<
  UploadType,
  {
    title: string
    description: string
    csvTemplate: string
    jsonTemplate: string
    requiredFields: string[]
  }
> = {
  products: {
    title: 'Products',
    description: 'Upload product definitions with category mappings',
    csvTemplate: 'name,category_id,code_name\n"Galaxy S24 Ultra","smartphones","s24ultra"',
    jsonTemplate: JSON.stringify(
      [{ name: 'Galaxy S24 Ultra', category_id: 'smartphones', code_name: 's24ultra' }],
      null,
      2
    ),
    requiredFields: ['name', 'category_id'],
  },
  briefs: {
    title: 'Product Briefs',
    description: 'Upload marketing briefs with USPs for products',
    csvTemplate:
      'product_id,usps,content,is_active\n"prod_123","Best camera|Long battery|Fast charging","Full marketing content here",true',
    jsonTemplate: JSON.stringify(
      [
        {
          product_id: 'prod_123',
          usps: ['Best camera', 'Long battery', 'Fast charging'],
          content: 'Full marketing content here',
          is_active: true,
        },
      ],
      null,
      2
    ),
    requiredFields: ['product_id', 'usps'],
  },
  keywords: {
    title: 'Keywords',
    description: 'Upload target keywords for optimization',
    csvTemplate: 'keyword,priority,category\n"best smartphone 2024","high","mobile"',
    jsonTemplate: JSON.stringify(
      [{ keyword: 'best smartphone 2024', priority: 'high', category: 'mobile' }],
      null,
      2
    ),
    requiredFields: ['keyword'],
  },
}

export function Uploader({ onDataParsed, className }: UploaderProps) {
  const [uploadType, setUploadType] = useState<UploadType>('products')
  const [format, setFormat] = useState<UploadFormat>('csv')
  const [textInput, setTextInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
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
        // Try to parse booleans and numbers
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

  const processData = useCallback(
    (rawData: string) => {
      setIsProcessing(true)

      try {
        let records: Record<string, unknown>[]

        if (format === 'csv') {
          records = parseCSV(rawData)
        } else {
          const parsed = JSON.parse(rawData)
          records = Array.isArray(parsed) ? parsed : [parsed]
        }

        if (records.length === 0) {
          toast({
            title: 'No data found',
            description: 'The uploaded file contains no valid records.',
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
          toast({
            title: 'Missing required fields',
            description: `The following fields are required: ${missingFields.join(', ')}`,
            variant: 'destructive',
          })
          return
        }

        onDataParsed(records, uploadType)
        toast({
          title: 'Data parsed successfully',
          description: `Found ${records.length} records ready for preview.`,
        })
      } catch (error) {
        toast({
          title: 'Parse error',
          description:
            error instanceof Error ? error.message : 'Failed to parse the uploaded data.',
          variant: 'destructive',
        })
      } finally {
        setIsProcessing(false)
      }
    },
    [format, config.requiredFields, onDataParsed, uploadType, parseCSV, toast]
  )

  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setTextInput(content)
        processData(content)
      }
      reader.onerror = () => {
        toast({
          title: 'File read error',
          description: 'Failed to read the uploaded file.',
          variant: 'destructive',
        })
      }
      reader.readAsText(file)
    },
    [processData, toast]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFileUpload(file)
      }
    },
    [handleFileUpload]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileUpload(file)
      }
    },
    [handleFileUpload]
  )

  const handlePasteData = useCallback(() => {
    if (textInput.trim()) {
      processData(textInput)
    }
  }, [textInput, processData])

  const handleLoadTemplate = useCallback(() => {
    setTextInput(format === 'csv' ? config.csvTemplate : config.jsonTemplate)
  }, [format, config])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Bulk Upload</CardTitle>
        <CardDescription>
          Upload {config.title.toLowerCase()} data via file or paste directly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload type and format selection */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Type</label>
            <Select value={uploadType} onValueChange={(v) => setUploadType(v as UploadType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(UPLOAD_TYPE_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <Select value={format} onValueChange={(v) => setFormat(v as UploadFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Required fields: {config.requiredFields.join(', ')}
            </p>
          </div>
        </div>

        {/* Upload methods */}
        <Tabs defaultValue="file" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">File Upload</TabsTrigger>
            <TabsTrigger value="paste">Paste Data</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-4">
            <div
              className={cn(
                'flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload file by dropping or clicking"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  fileInputRef.current?.click()
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={format === 'csv' ? '.csv' : '.json'}
                onChange={handleFileInputChange}
                className="hidden"
                aria-hidden="true"
              />
              <div className="text-center">
                <p className="text-lg font-medium">
                  {isDragging ? 'Drop file here' : 'Drag and drop or click to upload'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Accepts {format.toUpperCase()} files
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Paste your {format.toUpperCase()} data below
              </p>
              <Button variant="outline" size="sm" onClick={handleLoadTemplate}>
                Load Template
              </Button>
            </div>
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={format === 'csv' ? config.csvTemplate : config.jsonTemplate}
              className="min-h-[200px] font-mono text-sm"
              aria-label={`${format.toUpperCase()} data input`}
            />
            <Button onClick={handlePasteData} disabled={!textInput.trim() || isProcessing}>
              {isProcessing ? 'Processing...' : 'Parse Data'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export type { UploadType, UploadFormat, UploaderProps }
