'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Upload,
  Trash,
  MagnifyingGlass,
  FileText,
  FilePdf,
  FileDoc,
  CheckCircle,
  XCircle,
  Spinner,
  Database,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

interface PlaybookDocument {
  id: string
  name: string
  section: string
  productCategory: string
  status: string
  totalChunks: number
  uploadedAt: string
}

const SECTIONS = [
  { value: 'brand_guidelines', label: 'Brand Guidelines' },
  { value: 'product_features', label: 'Product Features' },
  { value: 'marketing_strategy', label: 'Marketing Strategy' },
  { value: 'content_creation', label: 'Content Creation' },
  { value: 'seo_guidelines', label: 'SEO Guidelines' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'geo_optimization', label: 'GEO Optimization' },
  { value: 'campaign_templates', label: 'Campaign Templates' },
  { value: 'visual_standards', label: 'Visual Standards' },
  { value: 'tone_voice', label: 'Tone & Voice' },
  { value: 'competitive_positioning', label: 'Competitive Positioning' },
  { value: 'target_audience', label: 'Target Audience' },
  { value: 'other', label: 'Other' },
]

const PRODUCT_CATEGORIES = [
  { value: 'all', label: 'All Products' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'watch', label: 'Watch' },
  { value: 'ring', label: 'Ring' },
  { value: 'buds', label: 'Buds' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'xr', label: 'XR' },
  { value: 'tv', label: 'TV' },
  { value: 'appliance', label: 'Appliance' },
]

export default function PlaybookManagementPage() {
  const [documents, setDocuments] = useState<PlaybookDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentName, setDocumentName] = useState('')
  const [section, setSection] = useState('other')
  const [productCategory, setProductCategory] = useState('all')
  const [language, setLanguage] = useState<'en' | 'ko'>('ko')

  const fetchDocuments = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Please log in to manage playbook documents')
        return
      }

      const response = await fetch('/api/playbook/ingest', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Please log in to upload documents')
        return
      }

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('documentName', documentName || selectedFile.name)
      formData.append('section', section)
      formData.append('productCategory', productCategory)
      formData.append('language', language)

      const response = await fetch('/api/playbook/ingest', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Document ingested: ${data.chunksProcessed} chunks created`)
        setUploadDialogOpen(false)
        setSelectedFile(null)
        setDocumentName('')
        fetchDocuments()
      } else {
        toast.error(data.error || 'Failed to ingest document')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Please log in to delete documents')
        return
      }

      const response = await fetch(`/api/playbook/ingest?documentId=${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        toast.success('Document deleted successfully')
        fetchDocuments()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete document')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete document')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query')
      return
    }

    setSearching(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Please log in to search')
        return
      }

      const response = await fetch('/api/playbook/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          topK: 5,
          rerankTopN: 5,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSearchResults(data.results || [])
        toast.success(`Found ${data.totalResults} results in ${data.processingTimeMs}ms`)
      } else {
        toast.error(data.error || 'Search failed')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FilePdf className="h-5 w-5 text-red-500" />
      case 'docx':
        return <FileDoc className="h-5 w-5 text-blue-500" />
      default:
        return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'indexed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Indexed
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="secondary">
            <Spinner className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing Playbook</h1>
          <p className="text-muted-foreground">
            Manage Samsung Marketing Playbook documents for RAG-enhanced content generation
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Upload Playbook Document</DialogTitle>
              <DialogDescription>
                Upload a document to be ingested into the vector database. Supported formats: PDF, DOCX, TXT, MD
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="file">Document File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="name">Document Name</Label>
                <Input
                  id="name"
                  placeholder="Samsung Marketing Playbook 2024"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Section</Label>
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Product Category</Label>
                  <Select value={productCategory} onValueChange={setProductCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Language</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'ko')}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ko">Korean</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2 animate-spin" />
                    Ingesting...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Ingest to Vector Database
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MagnifyingGlass className="h-5 w-5" />
            Test Playbook Search
          </CardTitle>
          <CardDescription>
            Test the RAG search to see what context will be retrieved for content generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter a search query (e.g., 'Galaxy S24 camera features marketing')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? (
                <Spinner className="h-4 w-4 animate-spin" />
              ) : (
                <MagnifyingGlass className="h-4 w-4" />
              )}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="font-medium">Search Results:</h4>
              {searchResults.map((result, index) => (
                <div
                  key={result.id}
                  className="p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{result.metadata.section}</Badge>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Score: {(result.score * 100).toFixed(1)}%</span>
                      {result.rerankScore && (
                        <span>Rerank: {(result.rerankScore * 100).toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm line-clamp-3">{result.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ingested Documents</CardTitle>
          <CardDescription>
            Documents that have been processed and stored in the vector database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents ingested yet</p>
              <p className="text-sm mt-1">
                Upload the Samsung Marketing Playbook to enable RAG-enhanced generation
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getFileIcon(doc.name.split('.').pop() || 'txt')}
                        {doc.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {SECTIONS.find((s) => s.value === doc.section)?.label || doc.section}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {PRODUCT_CATEGORIES.find((p) => p.value === doc.productCategory)?.label || doc.productCategory}
                    </TableCell>
                    <TableCell>{doc.totalChunks}</TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>
                      {new Date(doc.uploadedAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
