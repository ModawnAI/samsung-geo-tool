'use client'

import { useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileArrowUp,
  FileCsv,
  FileCode,
  Upload,
  CheckCircle,
  Warning,
  Info,
  ArrowLeft,
  Download,
  Trash,
  Eye,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

type UploadType = 'products' | 'briefs' | 'keywords'
type FileFormat = 'csv' | 'json'

interface UploadPreview {
  type: UploadType
  format: FileFormat
  rowCount: number
  headers?: string[]
  sample?: Record<string, unknown>[]
  errors?: string[]
  warnings?: string[]
}

interface UploadResult {
  success: boolean
  inserted: number
  updated: number
  skipped: number
  errors: string[]
}

export default function BulkUploadPage() {
  const searchParams = useSearchParams()
  const initialType = (searchParams.get('type') as FileFormat) || 'csv'

  const [uploadType, setUploadType] = useState<UploadType>('products')
  const [fileFormat, setFileFormat] = useState<FileFormat>(initialType === 'json' ? 'json' : 'csv')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<UploadPreview | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [textInput, setTextInput] = useState('')

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (!selectedFile) return

      setFile(selectedFile)
      setResult(null)

      // Parse file for preview
      try {
        const text = await selectedFile.text()
        let data: Record<string, unknown>[]
        let headers: string[] | undefined

        if (fileFormat === 'csv') {
          const lines = text.split('\n').filter((line) => line.trim())
          headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
          data = lines.slice(1, 6).map((line) => {
            const values = line.split(',').map((v) => v.trim().replace(/"/g, ''))
            return headers!.reduce(
              (obj, header, i) => {
                obj[header] = values[i]
                return obj
              },
              {} as Record<string, unknown>
            )
          })

          setPreview({
            type: uploadType,
            format: 'csv',
            rowCount: lines.length - 1,
            headers,
            sample: data,
          })
        } else {
          data = JSON.parse(text)
          const items = Array.isArray(data) ? data : [data]
          setPreview({
            type: uploadType,
            format: 'json',
            rowCount: items.length,
            sample: items.slice(0, 5),
          })
        }
      } catch {
        setPreview({
          type: uploadType,
          format: fileFormat,
          rowCount: 0,
          errors: ['Failed to parse file. Please check the format.'],
        })
      }
    },
    [fileFormat, uploadType]
  )

  const handleTextInputChange = useCallback(
    (value: string) => {
      setTextInput(value)
      setResult(null)

      if (!value.trim()) {
        setPreview(null)
        return
      }

      try {
        let data: Record<string, unknown>[]
        let headers: string[] | undefined

        if (fileFormat === 'csv') {
          const lines = value.split('\n').filter((line) => line.trim())
          headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
          data = lines.slice(1, 6).map((line) => {
            const values = line.split(',').map((v) => v.trim().replace(/"/g, ''))
            return headers!.reduce(
              (obj, header, i) => {
                obj[header] = values[i]
                return obj
              },
              {} as Record<string, unknown>
            )
          })

          setPreview({
            type: uploadType,
            format: 'csv',
            rowCount: lines.length - 1,
            headers,
            sample: data,
          })
        } else {
          data = JSON.parse(value)
          const items = Array.isArray(data) ? data : [data]
          setPreview({
            type: uploadType,
            format: 'json',
            rowCount: items.length,
            sample: items.slice(0, 5),
          })
        }
      } catch {
        setPreview({
          type: uploadType,
          format: fileFormat,
          rowCount: 0,
          errors: ['Invalid format. Please check your input.'],
        })
      }
    },
    [fileFormat, uploadType]
  )

  const handleUpload = async () => {
    if (!file && !textInput) return

    setIsUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('type', uploadType)
      formData.append('format', fileFormat)

      if (file) {
        formData.append('file', file)
      } else {
        formData.append('data', textInput)
      }

      const response = await fetch('/api/tuning/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setResult(data)
    } catch (err) {
      setResult({
        success: false,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : 'Upload failed'],
      })
    } finally {
      setIsUploading(false)
    }
  }

  const clearUpload = () => {
    setFile(null)
    setTextInput('')
    setPreview(null)
    setResult(null)
  }

  const downloadTemplate = (type: UploadType, format: FileFormat) => {
    let content: string
    let filename: string

    if (format === 'csv') {
      switch (type) {
        case 'products':
          content = 'name,category_id,code_name\n"Galaxy S24","category-uuid","S24"'
          break
        case 'briefs':
          content = 'product_id,usps,content\n"product-uuid","USP1|USP2|USP3","Brief content here"'
          break
        case 'keywords':
          content = 'keyword,category,priority\n"AI camera","feature","high"'
          break
      }
      filename = `${type}_template.csv`
    } else {
      switch (type) {
        case 'products':
          content = JSON.stringify(
            [{ name: 'Galaxy S24', category_id: 'category-uuid', code_name: 'S24' }],
            null,
            2
          )
          break
        case 'briefs':
          content = JSON.stringify(
            [{ product_id: 'product-uuid', usps: ['USP1', 'USP2'], content: 'Brief content' }],
            null,
            2
          )
          break
        case 'keywords':
          content = JSON.stringify([{ keyword: 'AI camera', category: 'feature', priority: 'high' }], null, 2)
          break
      }
      filename = `${type}_template.json`
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tuning">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Bulk Upload</h1>
          <p className="text-muted-foreground">Upload multiple items at once via CSV or JSON</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Configuration</CardTitle>
              <CardDescription>Select what type of data you want to upload</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data Type</Label>
                  <Select value={uploadType} onValueChange={(v) => setUploadType(v as UploadType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="products">Products</SelectItem>
                      <SelectItem value="briefs">Briefs</SelectItem>
                      <SelectItem value="keywords">Keywords</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>File Format</Label>
                  <Select value={fileFormat} onValueChange={(v) => setFileFormat(v as FileFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadTemplate(uploadType, 'csv')}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV Template
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadTemplate(uploadType, 'json')}>
                  <Download className="h-4 w-4 mr-2" />
                  JSON Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* File/Text Input */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Data</CardTitle>
              <CardDescription>Upload a file or paste your data directly</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="file">
                <TabsList className="mb-4">
                  <TabsTrigger value="file" className="gap-2">
                    <FileArrowUp className="h-4 w-4" />
                    File Upload
                  </TabsTrigger>
                  <TabsTrigger value="paste" className="gap-2">
                    <FileCode className="h-4 w-4" />
                    Paste Data
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="space-y-4">
                  <div
                    className={cn(
                      'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                      file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    )}
                  >
                    <Input
                      type="file"
                      accept={fileFormat === 'csv' ? '.csv' : '.json'}
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {file ? (
                        <div className="flex flex-col items-center gap-2">
                          {fileFormat === 'csv' ? (
                            <FileCsv className="h-12 w-12 text-primary" />
                          ) : (
                            <FileCode className="h-12 w-12 text-primary" />
                          )}
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              clearUpload()
                            }}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-12 w-12 text-muted-foreground" />
                          <p className="font-medium">Drop your {fileFormat.toUpperCase()} file here</p>
                          <p className="text-sm text-muted-foreground">or click to browse</p>
                        </div>
                      )}
                    </label>
                  </div>
                </TabsContent>

                <TabsContent value="paste" className="space-y-4">
                  <Textarea
                    placeholder={
                      fileFormat === 'csv'
                        ? 'name,category_id,code_name\n"Product Name","uuid","CODE"'
                        : '[\n  {"name": "Product Name", "category_id": "uuid"}\n]'
                    }
                    value={textInput}
                    onChange={(e) => handleTextInputChange(e.target.value)}
                    className="font-mono text-sm min-h-[200px]"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Preview */}
          {preview && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Preview
                    </CardTitle>
                    <CardDescription>{preview.rowCount} rows detected</CardDescription>
                  </div>
                  {preview.errors && preview.errors.length > 0 && (
                    <Badge variant="destructive">{preview.errors.length} errors</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {preview.errors && preview.errors.length > 0 ? (
                  <div className="space-y-2">
                    {preview.errors.map((error, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                        <Warning className="h-4 w-4" />
                        {error}
                      </div>
                    ))}
                  </div>
                ) : preview.sample && preview.sample.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {Object.keys(preview.sample[0]).map((key) => (
                            <th key={key} className="px-3 py-2 text-left font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sample.map((row, i) => (
                          <tr key={i} className="border-b last:border-0">
                            {Object.values(row).map((value, j) => (
                              <td key={j} className="px-3 py-2 truncate max-w-[200px]">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No preview available</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upload Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={clearUpload} disabled={isUploading}>
              Clear
            </Button>
            <Button
              onClick={handleUpload}
              disabled={(!file && !textInput) || isUploading || (preview?.errors && preview.errors.length > 0)}
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-pulse" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {preview?.rowCount || 0} Items
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Result */}
          {result && (
            <Card className={cn(result.success ? 'border-green-500/50' : 'border-destructive/50')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.success ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
                      Upload Successful
                    </>
                  ) : (
                    <>
                      <Warning className="h-5 w-5 text-destructive" weight="fill" />
                      Upload Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.success && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-md bg-green-100">
                      <p className="text-lg font-semibold text-green-700">{result.inserted}</p>
                      <p className="text-xs text-green-600">Inserted</p>
                    </div>
                    <div className="p-2 rounded-md bg-blue-100">
                      <p className="text-lg font-semibold text-blue-700">{result.updated}</p>
                      <p className="text-xs text-blue-600">Updated</p>
                    </div>
                    <div className="p-2 rounded-md bg-muted">
                      <p className="text-lg font-semibold">{result.skipped}</p>
                      <p className="text-xs text-muted-foreground">Skipped</p>
                    </div>
                  </div>
                )}
                {result.errors.length > 0 && (
                  <div className="space-y-1">
                    {result.errors.map((error, i) => (
                      <p key={i} className="text-sm text-destructive flex items-start gap-2">
                        <Warning className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {error}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Upload Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium mb-1">Products</p>
                <p className="text-muted-foreground">
                  Required: name, category_id
                  <br />
                  Optional: code_name
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">Briefs</p>
                <p className="text-muted-foreground">
                  Required: product_id, usps
                  <br />
                  Optional: content, is_active
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">Keywords</p>
                <p className="text-muted-foreground">
                  Required: keyword
                  <br />
                  Optional: category, priority
                </p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-muted-foreground">
                  CSV files should have headers in the first row. JSON files should be arrays of objects.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
