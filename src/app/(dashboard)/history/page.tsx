'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ClockCounterClockwise,
  Copy,
  Check,
  CaretDown,
  CaretUp,
  TextAlignLeft,
  Clock,
  Hash,
  ChatCircleText,
  MagnifyingGlass,
  Funnel,
  Download,
  Trash,
  CheckSquare,
  Square,
  DotsThreeVertical,
  ArrowsDownUp,
  ListBullets,
  SquaresFour,
  Eye,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

interface Generation {
  id: string
  product_id: string
  description: string | null
  timestamps: string | null
  hashtags: string[]
  faq: string | null
  status: 'draft' | 'confirmed'
  campaign_tag: string | null
  selected_keywords: string[]
  created_at: string
  updated_at: string
  products: {
    name: string
  } | null
}

interface Product {
  id: string
  name: string
}

type ViewMode = 'list' | 'grid'
type SortField = 'created_at' | 'updated_at' | 'status'
type SortOrder = 'asc' | 'desc'

function CopyButton({ text, label, successMessage, errorMessage }: { text: string; label: string; successMessage: string; errorMessage: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(successMessage)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(errorMessage)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 h-7">
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  )
}

function GenerationCard({
  generation,
  isSelected,
  onSelect,
  viewMode,
  t,
}: {
  generation: Generation
  isSelected: boolean
  onSelect: (id: string, selected: boolean) => void
  viewMode: ViewMode
  t: ReturnType<typeof useTranslation>['t']
}) {
  const [expanded, setExpanded] = useState(false)

  const statusLabel = generation.status === 'confirmed' ? t.history.confirmed : t.history.draft

  if (viewMode === 'grid') {
    return (
      <Card className={cn('overflow-hidden', isSelected && 'ring-2 ring-primary')}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect(generation.id, checked as boolean)}
                aria-label={`Select ${generation.products?.name}`}
              />
              <CardTitle className="text-sm line-clamp-1">
                {generation.products?.name || t.history.unknown}
              </CardTitle>
            </div>
            <Badge variant={generation.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
              {statusLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {generation.description || t.history.noDescription}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {format(new Date(generation.created_at), 'MMM d, HH:mm')}
            </span>
            <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
              <Link href={`/generate/${generation.id}`}>
                <Eye className="h-3 w-3 mr-1" />
                {t.history.view}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', isSelected && 'ring-2 ring-primary')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(generation.id, checked as boolean)}
              aria-label={`Select ${generation.products?.name}`}
            />
            <CardTitle className="text-base">
              {generation.products?.name || t.history.unknownProduct}
            </CardTitle>
            <Badge variant={generation.status === 'confirmed' ? 'default' : 'secondary'}>
              {statusLabel}
            </Badge>
            {generation.campaign_tag && (
              <Badge variant="outline">{generation.campaign_tag}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{format(new Date(generation.created_at), 'MMM d, yyyy HH:mm')}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
              aria-label={expanded ? t.history.collapseDetails : t.history.expandDetails}
            >
              {expanded ? (
                <CaretUp className="h-4 w-4" />
              ) : (
                <CaretDown className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
              <Link href={`/generate/${generation.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        {generation.selected_keywords.length > 0 && (
          <div className="flex gap-2 mt-2 ml-7">
            {generation.selected_keywords.slice(0, 5).map((keyword) => (
              <Badge key={keyword} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
            {generation.selected_keywords.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{generation.selected_keywords.length - 5} {t.history.moreKeywords}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          <Separator />

          {generation.description && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TextAlignLeft className="h-4 w-4" />
                  {t.history.description}
                </div>
                <CopyButton text={generation.description} label={t.history.description} successMessage={t.history.copySuccess} errorMessage={t.history.copyFailed} />
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                <p className="whitespace-pre-wrap">{generation.description}</p>
              </div>
            </div>
          )}

          {generation.timestamps && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  {t.history.timestamps}
                </div>
                <CopyButton text={generation.timestamps} label={t.history.timestamps} successMessage={t.history.copySuccess} errorMessage={t.history.copyFailed} />
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border text-sm font-mono">
                <pre className="whitespace-pre-wrap">{generation.timestamps}</pre>
              </div>
            </div>
          )}

          {generation.hashtags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Hash className="h-4 w-4" />
                  {t.history.hashtags}
                </div>
                <CopyButton text={generation.hashtags.join(' ')} label={t.history.hashtags} successMessage={t.history.copySuccess} errorMessage={t.history.copyFailed} />
              </div>
              <div className="flex flex-wrap gap-2">
                {generation.hashtags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-sm font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {generation.faq && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ChatCircleText className="h-4 w-4" />
                  {t.history.faq}
                </div>
                <CopyButton text={generation.faq} label={t.history.faq} successMessage={t.history.copySuccess} errorMessage={t.history.copyFailed} />
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                <p className="whitespace-pre-wrap">{generation.faq}</p>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default function HistoryPage() {
  const { t } = useTranslation()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'confirmed'>('all')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const supabase = createClient()

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .order('name')
    setProducts(data || [])
  }, [supabase])

  const fetchGenerations = useCallback(async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('generations')
        .select('*, products(name)')
        .order(sortField, { ascending: sortOrder === 'asc' })
        .limit(100)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (productFilter !== 'all') {
        query = query.eq('product_id', productFilter)
      }

      if (searchQuery) {
        query = query.or(`description.ilike.%${searchQuery}%,campaign_tag.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching generations:', error)
        toast.error(t.history.loadFailed)
        return
      }

      setGenerations(data || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error(t.history.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, productFilter, searchQuery, sortField, sortOrder, supabase])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    fetchGenerations()
  }, [fetchGenerations])

  // Selection handlers
  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === generations.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(generations.map((g) => g.id)))
    }
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
  }

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('generations')
        .delete()
        .in('id', Array.from(selectedIds))

      if (error) throw error

      toast.success(t.history.deletedSuccess)
      setSelectedIds(new Set())
      setIsDeleteDialogOpen(false)
      fetchGenerations()
    } catch (error) {
      console.error('Error deleting generations:', error)
      toast.error(t.history.deleteFailed)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkStatusChange = async (status: 'draft' | 'confirmed') => {
    if (selectedIds.size === 0) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('generations') as any)
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', Array.from(selectedIds))

      if (error) throw error

      toast.success(t.history.updatedSuccess)
      setSelectedIds(new Set())
      fetchGenerations()
    } catch (error) {
      console.error('Error updating generations:', error)
      toast.error(t.history.updateFailed)
    }
  }

  const handleExport = () => {
    const dataToExport = selectedIds.size > 0
      ? generations.filter((g) => selectedIds.has(g.id))
      : generations

    const exportData = dataToExport.map((g) => ({
      product: g.products?.name,
      description: g.description,
      timestamps: g.timestamps,
      hashtags: g.hashtags,
      faq: g.faq,
      status: g.status,
      campaign_tag: g.campaign_tag,
      keywords: g.selected_keywords,
      created_at: g.created_at,
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `generations-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t.history.exportedSuccess)
  }

  const handleExportCSV = () => {
    const dataToExport = selectedIds.size > 0
      ? generations.filter((g) => selectedIds.has(g.id))
      : generations

    const headers = ['Product', 'Status', 'Campaign', 'Keywords', 'Description', 'Hashtags', 'Created At']
    const rows = dataToExport.map((g) => [
      g.products?.name || '',
      g.status,
      g.campaign_tag || '',
      g.selected_keywords.join('; '),
      (g.description || '').replace(/\n/g, ' ').replace(/"/g, '""'),
      g.hashtags.join(' '),
      format(new Date(g.created_at), 'yyyy-MM-dd HH:mm'),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `generations-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t.history.exportedCsvSuccess)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ClockCounterClockwise className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">{t.history.title}</h1>
            <p className="text-sm text-muted-foreground">
              {generations.length}{generations.length !== 1 ? t.history.generationsCount : t.history.generationCount}
              {selectedIds.size > 0 && ` • ${selectedIds.size} ${t.history.selected}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                {t.history.export}
                <CaretDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                {t.history.exportJson}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                {t.history.exportCsv}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.history.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder={t.common.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.history.allStatus}</SelectItem>
                  <SelectItem value="draft">{t.history.draft}</SelectItem>
                  <SelectItem value="confirmed">{t.history.confirmed}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t.common.select} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.history.allProducts}</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <ArrowsDownUp className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setSortField('created_at'); setSortOrder('desc') }}>
                    {t.history.newestFirst}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('created_at'); setSortOrder('asc') }}>
                    {t.history.oldestFirst}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setSortField('updated_at'); setSortOrder('desc') }}>
                    {t.history.recentlyUpdated}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('status'); setSortOrder('asc') }}>
                    {t.history.statusDraftConfirmed}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="rounded-r-none"
                  aria-label={t.history.listView}
                >
                  <ListBullets className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="rounded-l-none"
                  aria-label={t.history.gridView}
                >
                  <SquaresFour className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {generations.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="gap-2"
            >
              {selectedIds.size === generations.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {selectedIds.size === generations.length ? t.history.deselectAll : t.history.selectAll}
            </Button>
            {selectedIds.size > 0 && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} {t.history.selected}
                </span>
              </>
            )}
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatusChange('confirmed')}
              >
                <Check className="h-4 w-4 mr-1" />
                {t.history.confirm}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatusChange('draft')}
              >
                {t.history.setAsDraft}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash className="h-4 w-4 mr-1" />
                {t.history.delete}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
              >
                {t.history.clear}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className={cn(
          viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'
        )}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
              {viewMode === 'list' && (
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : generations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClockCounterClockwise className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">{t.history.noGenerationsFound}</p>
            <p className="text-sm mt-1">
              {searchQuery || statusFilter !== 'all' || productFilter !== 'all'
                ? t.history.tryAdjustingFilters
                : t.history.emptyStateHint}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'
        )}>
          {generations.map((generation) => (
            <GenerationCard
              key={generation.id}
              generation={generation}
              isSelected={selectedIds.has(generation.id)}
              onSelect={handleSelect}
              viewMode={viewMode}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.history.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.history.deleteConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? t.history.deleting : t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
