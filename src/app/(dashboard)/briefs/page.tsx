'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/lib/i18n'
import { ICON_SIZES } from '@/lib/constants/ui'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Plus,
  MagnifyingGlass,
  DotsThreeVertical,
  PencilSimple,
  Trash,
  Copy,
  Check,
  Star,
  StarHalf,
  X,
  Download,
  Upload,
  Funnel,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Brief {
  id: string
  product_id: string
  version: number
  usps: string[]
  content: string | null
  is_active: boolean
  created_at: string
  created_by: string | null
  products: {
    id: string
    name: string
    code_name: string | null
    categories?: { name: string } | null
  } | null
  users: {
    email: string
    name: string | null
  } | null
}

interface Product {
  id: string
  name: string
  code_name: string | null
  category_id: string
  categories: { name: string } | null
}

export default function BriefsPage() {
  const { t } = useTranslation()
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null)

  // Form states
  const [formProductId, setFormProductId] = useState('')
  const [formUsps, setFormUsps] = useState<string[]>([''])
  const [formContent, setFormContent] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  // AbortController for cancelable requests
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const fetchBriefs = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (productFilter !== 'all') params.set('product_id', productFilter)
      if (statusFilter !== 'all') params.set('is_active', statusFilter)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/briefs?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      })
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setBriefs(data.briefs || [])
    } catch (error) {
      // Ignore aborted requests
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Error fetching briefs:', error)
      toast.error(t.briefs.toastLoadError)
    } finally {
      setIsLoading(false)
    }
  }, [productFilter, statusFilter, searchQuery])

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, code_name, category_id, categories(name)')
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }, [supabase])

  useEffect(() => {
    fetchBriefs()
    fetchProducts()
  }, [fetchBriefs, fetchProducts])

  const resetForm = () => {
    setFormProductId('')
    setFormUsps([''])
    setFormContent('')
    setFormIsActive(true)
  }

  const handleCreate = useCallback(async () => {
    if (!formProductId || formUsps.filter(u => u.trim()).length === 0) {
      toast.error(`${t.briefs.productRequired}. ${t.briefs.uspRequired}`)
      return
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: formProductId,
          usps: formUsps.filter(u => u.trim()),
          content: formContent || null,
          is_active: formIsActive,
        }),
        signal: abortControllerRef.current.signal,
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      toast.success(t.briefs.toastCreated)
      setIsCreateOpen(false)
      resetForm()
      fetchBriefs()
    } catch (error) {
      // Ignore aborted requests
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Error creating brief:', error)
      toast.error(t.briefs.toastCreateError)
    } finally {
      setIsSubmitting(false)
    }
  }, [formProductId, formUsps, formContent, formIsActive, fetchBriefs])

  const handleEdit = useCallback(async () => {
    if (!selectedBrief) return

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/briefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedBrief.id,
          usps: formUsps.filter(u => u.trim()),
          content: formContent || null,
          is_active: formIsActive,
        }),
        signal: abortControllerRef.current.signal,
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      toast.success(t.briefs.toastUpdated)
      setIsEditOpen(false)
      setSelectedBrief(null)
      resetForm()
      fetchBriefs()
    } catch (error) {
      // Ignore aborted requests
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Error updating brief:', error)
      toast.error(t.briefs.toastUpdateError)
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedBrief, formUsps, formContent, formIsActive, fetchBriefs])

  const handleDelete = useCallback(async () => {
    if (!selectedBrief) return

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/briefs?id=${selectedBrief.id}`, {
        method: 'DELETE',
        signal: abortControllerRef.current.signal,
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      toast.success(t.briefs.toastDeleted)
      setIsDeleteOpen(false)
      setSelectedBrief(null)
      fetchBriefs()
    } catch (error) {
      // Ignore aborted requests
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Error deleting brief:', error)
      toast.error(t.briefs.toastDeleteError)
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedBrief, fetchBriefs])

  const handleToggleActive = useCallback(async (brief: Brief) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/briefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: brief.id,
          is_active: !brief.is_active,
        }),
        signal: abortControllerRef.current.signal,
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      toast.success(brief.is_active ? t.briefs.toastDeactivated : t.briefs.toastActivated)
      fetchBriefs()
    } catch (error) {
      // Ignore aborted requests
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Error toggling brief status:', error)
      toast.error(t.briefs.toastUpdateError)
    }
  }, [fetchBriefs])

  const handleCopyUsps = async (usps: string[]) => {
    try {
      await navigator.clipboard.writeText(usps.join('\n'))
      toast.success(t.briefs.toastCopied)
    } catch {
      toast.error(t.briefs.toastError)
    }
  }

  const openEditDialog = (brief: Brief) => {
    setSelectedBrief(brief)
    setFormProductId(brief.product_id)
    setFormUsps(brief.usps.length > 0 ? brief.usps : [''])
    setFormContent(brief.content || '')
    setFormIsActive(brief.is_active)
    setIsEditOpen(true)
  }

  const addUspField = () => {
    setFormUsps([...formUsps, ''])
  }

  const removeUspField = (index: number) => {
    if (formUsps.length > 1) {
      setFormUsps(formUsps.filter((_, i) => i !== index))
    }
  }

  const updateUspField = (index: number, value: string) => {
    const newUsps = [...formUsps]
    newUsps[index] = value
    setFormUsps(newUsps)
  }

  const handleExport = () => {
    const exportData = briefs.map(b => ({
      product: b.products?.name,
      version: b.version,
      usps: b.usps,
      content: b.content,
      is_active: b.is_active,
      created_at: b.created_at,
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `briefs-export-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t.success.exported)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">{t.briefs.title}</h1>
            <p className="text-sm text-muted-foreground">
              {t.briefs.subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t.briefs.export}
          </Button>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            {t.briefs.newBrief}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.briefs.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t.briefs.filterByProduct} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.briefs.allProducts}</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder={t.common.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.briefs.allStatus}</SelectItem>
                <SelectItem value="true">{t.briefs.active}</SelectItem>
                <SelectItem value="false">{t.briefs.inactive}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Briefs List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : briefs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">{t.briefs.noBriefs}</p>
            <p className="text-sm mt-1">
              {searchQuery || productFilter !== 'all' || statusFilter !== 'all'
                ? t.briefs.noResultsHint
                : t.briefs.clickToCreate}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {briefs.map((brief) => (
            <Card key={brief.id} className={!brief.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">
                      {brief.products?.name || 'Unknown Product'}
                    </CardTitle>
                    <Badge variant="outline">v{brief.version}</Badge>
                    {brief.is_active ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-200">
                        <Star className="h-3 w-3 mr-1" weight="fill" />
                        {t.briefs.statusActive}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t.briefs.statusInactive}</Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <DotsThreeVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(brief)}>
                        <PencilSimple className="h-4 w-4 mr-2" />
                        {t.common.edit}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyUsps(brief.usps)}>
                        <Copy className="h-4 w-4 mr-2" />
                        {t.briefs.copyUsps}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(brief)}>
                        {brief.is_active ? (
                          <>
                            <StarHalf className="h-4 w-4 mr-2" />
                            {t.briefs.deactivate}
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-2" />
                            {t.briefs.setAsActive}
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedBrief(brief)
                          setIsDeleteOpen(true)
                        }}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        {t.common.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription>
                  {brief.products?.categories?.name && (
                    <span className="mr-2">{brief.products.categories.name}</span>
                  )}
                  • Created {format(new Date(brief.created_at), 'MMM d, yyyy')}
                  {brief.users && (
                    <> by {brief.users.name || brief.users.email.split('@')[0]}</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {t.briefs.uspsCount} ({brief.usps.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {brief.usps.map((usp, i) => (
                        <Badge key={i} variant="secondary" className="font-normal">
                          {usp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {brief.content && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        {t.briefs.additionalContent}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {brief.content}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.briefs.createBrief}</DialogTitle>
            <DialogDescription>
              {t.briefs.subtitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.briefs.product}</label>
              <Select value={formProductId} onValueChange={setFormProductId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.common.select} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.briefs.usps}</label>
              <div className="space-y-2">
                {formUsps.map((usp, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={usp}
                      onChange={(e) => updateUspField(index, e.target.value)}
                      placeholder={`USP ${index + 1}`}
                    />
                    {formUsps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeUspField(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addUspField}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t.briefs.addUsp}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.briefs.additionalContentOptional}</label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder={t.briefs.additionalContent}
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded border-input"
              />
              <label htmlFor="is_active" className="text-sm">
                {t.briefs.setAsActive}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? t.briefs.creating : t.briefs.createBrief}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.briefs.editBrief}</DialogTitle>
            <DialogDescription>
              {selectedBrief?.products?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.briefs.usps}</label>
              <div className="space-y-2">
                {formUsps.map((usp, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={usp}
                      onChange={(e) => updateUspField(index, e.target.value)}
                      placeholder={`USP ${index + 1}`}
                    />
                    {formUsps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeUspField(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addUspField}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t.briefs.addUsp}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.briefs.additionalContentOptional}</label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder={t.briefs.additionalContent}
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit_is_active"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded border-input"
              />
              <label htmlFor="edit_is_active" className="text-sm">
                {t.briefs.setAsActive}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? t.briefs.saving : t.briefs.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.briefs.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.briefs.deleteConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? t.briefs.deleting : t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
