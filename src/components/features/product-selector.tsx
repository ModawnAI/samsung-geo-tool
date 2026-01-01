'use client'

import { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useGenerationStore } from '@/store/generation-store'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DeviceMobile,
  Watch,
  CircleDashed,
  Headphones,
  Laptop,
  VirtualReality,
  CalendarBlank,
  MagnifyingGlass,
  BookmarkSimple,
  Check,
  Warning,
  ArrowClockwise,
  Info,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  name_ko: string | null
  icon: string | null
}

interface Product {
  id: string
  name: string
  category_id: string
}

interface Brief {
  id: string
  version: number
  usps: string[]
  created_at: string
}

interface Template {
  id: string
  name: string
  description: string | null
  product_id: string | null
  keywords: string[]
  campaign_tag: string | null
  brief_usps: string[]
}

const iconMap: Record<string, React.ComponentType<{ className?: string; weight?: 'regular' | 'bold' }>> = {
  'device-mobile': DeviceMobile,
  'watch': Watch,
  'circle': CircleDashed,
  'headphones': Headphones,
  'laptop': Laptop,
  'vr-headset': VirtualReality,
}

export function ProductSelector() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [activeBrief, setActiveBrief] = useState<Brief | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [productSearch, setProductSearch] = useState('')
  const [productPopoverOpen, setProductPopoverOpen] = useState(false)
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefLoadError, setBriefLoadError] = useState<string | null>(null)

  const {
    categoryId,
    productId,
    productName,
    campaignTag,
    launchDate,
    selectedKeywords,
    setCategory,
    setProduct,
    setCampaignTag,
    setLaunchDate,
    setBriefUsps,
    setSelectedKeywords,
  } = useGenerationStore()

  const supabase = createClient()

  // Fetch categories and templates on mount
  useEffect(() => {
    async function fetchInitialData() {
      const [categoriesRes, templatesRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('templates').select('*').order('name'),
      ])
      if (categoriesRes.data) setCategories(categoriesRes.data)
      if (templatesRes.data) setTemplates(templatesRes.data)
      setLoading(false)
    }
    fetchInitialData()
  }, [])

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products
    const searchLower = productSearch.toLowerCase()
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchLower)
    )
  }, [products, productSearch])

  // Handle template selection
  const handleTemplateSelect = async (template: Template) => {
    setTemplatePopoverOpen(false)

    // If template has a product, find its category and select it
    if (template.product_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: product } = await (supabase.from('products') as any)
        .select('*, categories!inner(id)')
        .eq('id', template.product_id)
        .single() as { data: { id: string; name: string; category_id: string } | null }

      if (product) {
        setCategory(product.category_id)
        // Wait for products to load, then select the product
        setTimeout(() => {
          setProduct(product.id, product.name)
        }, 100)
      }
    }

    // Apply template settings
    if (template.campaign_tag) setCampaignTag(template.campaign_tag)
    if (template.keywords?.length > 0) setSelectedKeywords(template.keywords)
    if (template.brief_usps?.length > 0) setBriefUsps(template.brief_usps)

    toast.success(`Template "${template.name}" applied`)
  }

  useEffect(() => {
    async function fetchProducts() {
      if (!categoryId) {
        setProducts([])
        return
      }
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', categoryId)
        .order('name')
      if (data) setProducts(data)
    }
    fetchProducts()
  }, [categoryId])

  const fetchBrief = async () => {
    if (!productId) {
      setActiveBrief(null)
      setBriefUsps([])
      setBriefLoadError(null)
      return
    }

    setBriefLoading(true)
    setBriefLoadError(null)

    try {
      const { data, error } = await supabase
        .from('briefs')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        // PGRST116 = no rows returned (not an error, just no brief exists)
        if (error.code === 'PGRST116') {
          setActiveBrief(null)
          setBriefUsps([])
        } else {
          throw error
        }
      } else if (data) {
        const brief = data as Brief
        setActiveBrief(brief)
        setBriefUsps(brief.usps || [])
      }
    } catch (err) {
      console.error('Failed to load brief:', err)
      setBriefLoadError('Failed to load product brief. Please try again.')
      setActiveBrief(null)
    } finally {
      setBriefLoading(false)
    }
  }

  useEffect(() => {
    fetchBrief()
  }, [productId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-10" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Template Quick Load */}
      {templates.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2 text-sm">
            <BookmarkSimple className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground text-xs sm:text-sm">Quick start with a saved template</span>
          </div>
          <Popover open={templatePopoverOpen} onOpenChange={setTemplatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto min-h-[40px]">
                <BookmarkSimple className="h-4 w-4" />
                Load Template
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput placeholder="Search templates..." />
                <CommandList>
                  <CommandEmpty>No templates found.</CommandEmpty>
                  <CommandGroup>
                    {templates.map((template) => (
                      <CommandItem
                        key={template.id}
                        onSelect={() => handleTemplateSelect(template)}
                        className="flex flex-col items-start gap-1 py-3"
                      >
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {template.description}
                          </div>
                        )}
                        {template.keywords?.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {template.keywords.slice(0, 3).map((kw, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {kw}
                              </Badge>
                            ))}
                            {template.keywords.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.keywords.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div>
        <Label className="text-sm sm:text-base mb-3 block">Category</Label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          {categories.map((category) => {
            const Icon = iconMap[category.icon || ''] || DeviceMobile
            const isSelected = categoryId === category.id
            return (
              <Card
                key={category.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${category.name_ko || category.name} category${isSelected ? ', selected' : ''}`}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[80px] sm:min-h-0',
                  isSelected && 'border-primary ring-1 ring-primary'
                )}
                onClick={() => setCategory(category.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setCategory(category.id)
                  }
                }}
              >
                <CardContent className="p-3 sm:p-4 text-center">
                  <Icon
                    className={cn(
                      'h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1 sm:mb-2',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )}
                    weight={isSelected ? 'bold' : 'regular'}
                  />
                  <p className={cn(
                    'text-xs sm:text-sm font-medium',
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {category.name_ko || category.name}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {categoryId && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="product" className="text-sm sm:text-base">Product</Label>
            <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={productPopoverOpen}
                  className="w-full justify-between mt-1.5"
                >
                  {productName || "Select a product..."}
                  <MagnifyingGlass className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search products..."
                    value={productSearch}
                    onValueChange={setProductSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup>
                      {filteredProducts.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={product.name}
                          onSelect={() => {
                            setProduct(product.id, product.name)
                            setProductPopoverOpen(false)
                            setProductSearch('')
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              productId === product.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {product.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {products.length > 5 && (
              <p className="text-xs text-muted-foreground mt-1">
                {products.length} products available - use search to filter
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="campaign" className="text-sm sm:text-base">
              Campaign Tag
              <span className="text-muted-foreground font-normal ml-2 text-xs sm:text-sm">
                (optional)
              </span>
            </Label>
            <Input
              id="campaign"
              value={campaignTag}
              onChange={(e) => setCampaignTag(e.target.value)}
              placeholder="e.g., Spring 2025 Launch"
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                Tags help organize your generations in History. Use consistent naming like
                &quot;Q1 2025 Campaign&quot; or &quot;Galaxy S25 Launch&quot; to easily filter and find content later.
              </span>
            </p>
          </div>

          <div>
            <Label className="text-sm sm:text-base">
              Product Launch Date
              <span className="text-muted-foreground font-normal ml-2 text-xs sm:text-sm block sm:inline mt-0.5 sm:mt-0">
                (content filter - only show results after this date)
              </span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal mt-1.5',
                    !launchDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarBlank className="mr-2 h-4 w-4" />
                  {launchDate ? format(launchDate, 'PPP') : 'Select launch date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={launchDate || undefined}
                  onSelect={(date) => setLaunchDate(date || null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {launchDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Search results will only include content published after {format(launchDate, 'MMMM d, yyyy')}
              </p>
            )}
          </div>

          {/* Brief Loading State */}
          {briefLoading && (
            <div className="p-4 rounded-lg bg-muted/50 border animate-pulse">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                <span>Loading product brief...</span>
              </div>
            </div>
          )}

          {/* Brief Load Error */}
          {briefLoadError && !briefLoading && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2 text-sm">
                  <Warning className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" weight="fill" />
                  <div>
                    <p className="font-medium text-destructive">Brief Loading Failed</p>
                    <p className="text-muted-foreground mt-1">{briefLoadError}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchBrief}
                  className="gap-2 flex-shrink-0"
                >
                  <ArrowClockwise className="h-4 w-4" />
                  Retry
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <Info className="h-3 w-3" />
                You can continue without a brief, but USP recommendations won&apos;t be available.
              </p>
            </div>
          )}

          {/* Active Brief Display */}
          {activeBrief && !briefLoading && !briefLoadError && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>Active Brief:</span>
                <span className="font-medium text-foreground">v{activeBrief.version}</span>
                <span>
                  ({new Date(activeBrief.created_at).toLocaleDateString('ko-KR')})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeBrief.usps.map((usp, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-sm bg-background rounded border"
                  >
                    {i + 1}. {usp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* No Brief Available */}
          {!activeBrief && !briefLoading && !briefLoadError && productId && (
            <div className="p-4 rounded-lg bg-muted/30 border border-dashed">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>No active brief found for this product. You can still proceed with generation.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
