'use client'

import { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useGenerationStore } from '@/store/generation-store'
import { useQueueManager } from '@/lib/generation-queue'
import { useTranslation } from '@/lib/i18n/context'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
  DeviceTabletSpeaker,
  Watch,
  CircleDashed,
  Headphones,
  Laptop,
  VirtualReality,
  Television,
  CookingPot,
  CalendarBlank,
  MagnifyingGlass,
  BookmarkSimple,
  Check,
  Warning,
  ArrowClockwise,
  Info,
  Leaf,
  FilmStrip,
  Megaphone,
  CheckCircle,
  CaretDown,
  CaretUp,
  Star,
  House,
  SpeakerHigh,
  Bag,
  Robot,
  Package,
  Sparkle,
  Gear,
  CheckSquare,
  Square,
  Queue,
  SpinnerGap,
} from '@phosphor-icons/react'
import { ProductCard } from '@/components/features/product-card'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ContentType,
  VideoFormat,
  CONTENT_TYPE_LABELS,
  VIDEO_FORMAT_LABELS,
} from '@/types/geo-v2'

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
  code_name: string | null
}

interface Brief {
  id: string
  version: number
  usps: string[]
  is_active: boolean
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
  'star': Star,           // Featured (기획전)
  'device-mobile': DeviceMobile, // Mobile (모바일)
  'tv': Television,       // TV & Audio (TV/영상·음향)
  'cooking-pot': CookingPot, // Kitchen (주방가전)
  'house': House,         // Living (리빙가전)
  'laptop': Laptop,       // PC & Peripherals (PC/주변기기)
  'watch': Watch,         // Wearables (웨어러블)
  'speaker-high': SpeakerHigh, // Harman (하만)
  'bag': Bag,             // Accessories (소모품/액세서리)
  'robot': Robot,         // AI Club (AI 구독클럽)
  // Legacy icons for backwards compatibility
  'circle': CircleDashed,
  'headphones': Headphones,
  'tablet': DeviceTabletSpeaker,
  'vr-headset': VirtualReality,
  'appliance': CookingPot,
}

// Non-product content categories (P3 - ESG, Documentary, Campaign)
interface NonProductCategory {
  id: string
  name: string
  name_ko: string
  icon: React.ComponentType<{ className?: string; weight?: 'regular' | 'bold' }>
  contentType: ContentType
}

const nonProductCategories: NonProductCategory[] = [
  { id: 'esg', name: 'ESG/Sustainability', name_ko: 'ESG/지속가능성', icon: Leaf, contentType: 'esg' },
  { id: 'documentary', name: 'Documentary', name_ko: '다큐멘터리', icon: FilmStrip, contentType: 'documentary' },
  { id: 'brand', name: 'Brand Campaign', name_ko: '브랜드 캠페인', icon: Megaphone, contentType: 'brand' },
]

// Samsung hashtag order validation (P0-1)
interface HashtagValidation {
  valid: boolean
  issueKeys: string[] // Translation keys
  issueParams?: Record<string, string | number>[]
}

function validateHashtagOrder(hashtags: string[]): HashtagValidation {
  const issueKeys: string[] = []
  const issueParams: Record<string, string | number>[] = []

  if (hashtags.length === 0) {
    return { valid: true, issueKeys: [], issueParams: [] }
  }

  // Check hashtag count (Samsung standard: 3-5)
  if (hashtags.length < 3) {
    issueKeys.push('atLeast3')
    issueParams.push({ count: hashtags.length })
  } else if (hashtags.length > 5) {
    issueKeys.push('atMost5')
    issueParams.push({ count: hashtags.length })
  }

  // Check if #GalaxyAI should be first (if present)
  const galaxyAIIndex = hashtags.findIndex(h => h.toLowerCase().includes('galaxyai'))
  if (galaxyAIIndex > 0) {
    issueKeys.push('galaxyAIFirst')
    issueParams.push({})
  }

  // Check if #Samsung is last
  const samsungIndex = hashtags.findIndex(h => h.toLowerCase() === '#samsung')
  if (samsungIndex !== -1 && samsungIndex !== hashtags.length - 1) {
    issueKeys.push('samsungLast')
    issueParams.push({})
  } else if (samsungIndex === -1 && hashtags.length > 0) {
    issueKeys.push('samsungLast')
    issueParams.push({})
  }

  return { valid: issueKeys.length === 0, issueKeys, issueParams }
}

export function ProductSelector() {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([]) // All products for global search
  const [allBriefs, setAllBriefs] = useState<Brief[]>([]) // All briefs for product
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [productSearch, setProductSearch] = useState('')
  const [globalSearch, setGlobalSearch] = useState('') // Global search across all categories
  const [productPopoverOpen, setProductPopoverOpen] = useState(false)
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefLoadError, setBriefLoadError] = useState<string | null>(null)
  const [isNonProductMode, setIsNonProductMode] = useState(false)
  const [selectedNonProductCategory, setSelectedNonProductCategory] = useState<string | null>(null)
  const [samsungSettingsOpen, setSamsungSettingsOpen] = useState(false)
  const [contentMode, setContentMode] = useState<'product' | 'non-product'>('product')

  // Multi-select mode for batch generation
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [addingToQueue, setAddingToQueue] = useState(false)

  const {
    categoryId,
    productId,
    productName,
    campaignTag,
    launchDate,
    selectedKeywords,
    selectedBriefId,
    // Samsung Standard Fields (P1)
    contentType,
    videoFormat,
    fixedHashtags,
    useFixedHashtags,
    vanityLinkCode,
    setCategory,
    setProduct,
    setCampaignTag,
    setLaunchDate,
    setBriefUsps,
    setSelectedBriefId,
    setSelectedKeywords,
    // Samsung Standard Actions (P1)
    setContentType,
    setVideoFormat,
    setFixedHashtags,
    setUseFixedHashtags,
    setVanityLinkCode,
    // Multi-session support
    createSession,
    inputMethod,
    videoUrl,
    srtContent,
    briefUsps,
  } = useGenerationStore()

  const queueManager = useQueueManager()
  const supabase = createClient()

  // Compute hashtag validation (P0-1)
  const hashtagValidation = useMemo(() => {
    return validateHashtagOrder(fixedHashtags)
  }, [fixedHashtags])

  // Fetch categories, templates, and all products on mount
  useEffect(() => {
    async function fetchInitialData() {
      const [categoriesRes, templatesRes, allProductsRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('templates').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
      ])
      if (categoriesRes.data) setCategories(categoriesRes.data)
      if (templatesRes.data) setTemplates(templatesRes.data)
      if (allProductsRes.data) setAllProducts(allProductsRes.data)
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

  // Global search - filter all products across all categories
  const globalSearchResults = useMemo(() => {
    if (!globalSearch.trim()) return []
    const searchLower = globalSearch.toLowerCase()
    return allProducts.filter((p) =>
      p.name.toLowerCase().includes(searchLower)
    ).slice(0, 10) // Limit to 10 results
  }, [allProducts, globalSearch])

  // Handle global search product selection - auto-selects category
  const handleGlobalProductSelect = (product: Product) => {
    setGlobalSearch('')
    setCategory(product.category_id)
    setProduct(product.id, product.name)
    setIsNonProductMode(false)
    setContentMode('product')
  }

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

    toast.success(`${t.generate.productSelector.templateApplied}: "${template.name}"`)
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

  // Handle non-product category selection (ESG, Documentary, Brand)
  const handleNonProductCategorySelect = (npCategory: NonProductCategory) => {
    setIsNonProductMode(true)
    setSelectedNonProductCategory(npCategory.id)
    setContentType(npCategory.contentType)
    // Clear product-related state
    setCategory('')
    setProduct('', npCategory.name)
    setSelectedBriefId(null)
    setBriefUsps([])
  }

  // Handle regular product category selection
  const handleProductCategorySelect = (catId: string) => {
    setIsNonProductMode(false)
    setSelectedNonProductCategory(null)
    setCategory(catId)
  }

  const fetchBriefs = async () => {
    if (!productId) {
      setAllBriefs([])
      setSelectedBriefId(null)
      setBriefUsps([])
      setBriefLoadError(null)
      return
    }

    setBriefLoading(true)
    setBriefLoadError(null)

    try {
      // Fetch ALL briefs for this product, sorted by version descending
      const { data, error } = await supabase
        .from('briefs')
        .select('*')
        .eq('product_id', productId)
        .order('version', { ascending: false })

      if (error) {
        throw error
      }

      const briefs = (data || []) as Brief[]
      setAllBriefs(briefs)

      // Default to auto-extraction (no brief selected)
      // Users can optionally select a brief if available
      setSelectedBriefId(null)
      setBriefUsps([])
    } catch (err) {
      console.error('Failed to load briefs:', err)
      setBriefLoadError(t.generate.productSelector.briefLoadError)
      setAllBriefs([])
    } finally {
      setBriefLoading(false)
    }
  }

  // Handle brief selection from dropdown
  const handleBriefSelect = (briefId: string) => {
    const brief = allBriefs.find(b => b.id === briefId)
    if (brief) {
      setSelectedBriefId(briefId)
      setBriefUsps(brief.usps || [])
    }
  }

  // Toggle multi-select for a product
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  // Select all visible products
  const selectAllProducts = () => {
    const allIds = filteredProducts.map(p => p.id)
    setSelectedProducts(allIds)
  }

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedProducts([])
  }

  // Add selected products to the generation queue
  const addSelectedToQueue = async () => {
    if (selectedProducts.length === 0) return

    // Validate that SRT content is available
    if (!srtContent) {
      toast.error('SRT 콘텐츠를 먼저 입력해주세요')
      return
    }

    // Validate category is selected
    if (!categoryId) {
      toast.error('카테고리를 먼저 선택해주세요')
      return
    }

    setAddingToQueue(true)

    try {
      // Create a session for each selected product
      for (const selectedProdId of selectedProducts) {
        const product = filteredProducts.find(p => p.id === selectedProdId)
        if (!product) continue

        const sessionId = createSession({
          categoryId,
          productId: product.id,
          productName: product.name,
          campaignTag,
          launchDate,
          contentType,
          videoFormat,
          inputMethod,
          fixedHashtags,
          useFixedHashtags,
          vanityLinkCode,
          videoUrl,
          srtContent,
          selectedBriefId,
          briefUsps,
          selectedKeywords,
        })

        // Add to queue for processing
        await queueManager.addToQueue(sessionId)
      }

      toast.success(`${selectedProducts.length}개 제품이 생성 대기열에 추가되었습니다`)

      // Clear selections and exit multi-select mode
      setSelectedProducts([])
      setMultiSelectMode(false)
    } catch (error) {
      console.error('Failed to add to queue:', error)
      toast.error('대기열 추가에 실패했습니다')
    } finally {
      setAddingToQueue(false)
    }
  }

  useEffect(() => {
    fetchBriefs()
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
            <span className="text-muted-foreground text-xs sm:text-sm">{t.generate.productSelector.quickStart}</span>
          </div>
          <Popover open={templatePopoverOpen} onOpenChange={setTemplatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto min-h-[40px]">
                <BookmarkSimple className="h-4 w-4" />
                {t.generate.productSelector.loadTemplate}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput placeholder={t.generate.productSelector.searchTemplates} />
                <CommandList>
                  <CommandEmpty>{t.generate.productSelector.noTemplatesFound}</CommandEmpty>
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

      {/* Floating Selection Summary - Shows current selection context */}
      {(productId || (isNonProductMode && selectedNonProductCategory)) && (
        <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle className="h-4 w-4" weight="fill" />
              <span className="font-medium">
                {isNonProductMode
                  ? nonProductCategories.find(c => c.id === selectedNonProductCategory)?.name_ko
                  : productName
                }
              </span>
            </div>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground text-xs">
              {isNonProductMode
                ? nonProductCategories.find(c => c.id === selectedNonProductCategory)?.name
                : categories.find(c => c.id === categoryId)?.name_ko || categories.find(c => c.id === categoryId)?.name
              }
            </span>
            {!isNonProductMode && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  USP: {selectedBriefId ? '브리프' : '자동 추출'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Global Product Search */}
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.generate.productSelector.searchProducts || '전체 제품 검색...'}
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          className="pl-9 h-11"
        />
        {/* Global search results dropdown */}
        {globalSearchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
            {globalSearchResults.map((product) => {
              const category = categories.find(c => c.id === product.category_id)
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleGlobalProductSelect(product)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{category?.name_ko || category?.name}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Mode-Based Tab Navigation */}
      <Tabs
        value={contentMode}
        onValueChange={(value) => {
          setContentMode(value as 'product' | 'non-product')
          if (value === 'product') {
            // Switching to product mode - clear non-product state
            setIsNonProductMode(false)
            setSelectedNonProductCategory(null)
          } else {
            // Switching to non-product mode - clear product state
            setIsNonProductMode(true)
            setCategory('')
            setProduct('', '')
            setSelectedBriefId(null)
            setBriefUsps([])
          }
        }}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-2 h-11">
          <TabsTrigger value="product" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">{t.generate.productSelector.productContent || '제품 콘텐츠'}</span>
            <span className="sm:hidden">제품</span>
          </TabsTrigger>
          <TabsTrigger value="non-product" className="gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white">
            <Sparkle className="h-4 w-4" />
            <span className="hidden sm:inline">{t.samsung.nonProductContent || '비제품 콘텐츠'}</span>
            <span className="sm:hidden">비제품</span>
          </TabsTrigger>
        </TabsList>

        {/* Product Content Tab */}
        <TabsContent value="product" className="mt-4 space-y-4">
          <div>
            <Label className="text-sm sm:text-base mb-3 block">{t.generate.productSelector.productCategory}</Label>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5 sm:gap-2">
              {categories.map((category) => {
                const Icon = iconMap[category.icon || ''] || DeviceMobile
                const isSelected = categoryId === category.id && !isNonProductMode
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${category.name_ko || category.name} category${isSelected ? ', selected' : ''}`}
                    className={cn(
                      'flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg border transition-all',
                      'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-transparent bg-muted/30 hover:bg-muted/50'
                    )}
                    onClick={() => handleProductCategorySelect(category.id)}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 sm:h-6 sm:w-6 mb-1',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )}
                      weight={isSelected ? 'bold' : 'regular'}
                    />
                    <span className={cn(
                      'text-[10px] sm:text-xs font-medium text-center leading-tight',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {(category.name_ko || category.name).split('/')[0]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </TabsContent>

        {/* Non-Product Content Tab */}
        <TabsContent value="non-product" className="mt-4 space-y-4">
          <div>
            <Label className="text-sm sm:text-base mb-3 block flex items-center gap-2">
              {t.samsung.nonProductContent}
            </Label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {nonProductCategories.map((npCategory) => {
                const Icon = npCategory.icon
                const isSelected = selectedNonProductCategory === npCategory.id && isNonProductMode
                return (
                  <Card
                    key={npCategory.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${npCategory.name_ko} category${isSelected ? ', selected' : ''}`}
                    className={cn(
                      'cursor-pointer transition-all hover:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
                      isSelected && 'border-green-500 ring-1 ring-green-500 bg-green-50/50 dark:bg-green-950/20'
                    )}
                    onClick={() => handleNonProductCategorySelect(npCategory)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleNonProductCategorySelect(npCategory)
                      }
                    }}
                  >
                    <CardContent className="p-4 sm:p-6 text-center">
                      <Icon
                        className={cn(
                          'h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2',
                          isSelected ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                        )}
                        weight={isSelected ? 'bold' : 'regular'}
                      />
                      <p className={cn(
                        'text-sm font-medium',
                        isSelected ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                      )}>
                        {npCategory.name_ko}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {npCategory.name}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            {isNonProductMode && selectedNonProductCategory && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-3 flex items-center gap-1.5 p-2 bg-green-50/50 dark:bg-green-950/20 rounded-md">
                <CheckCircle className="h-4 w-4" weight="fill" />
                {t.generate.productSelector.nonProductSelected}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {categoryId && !isNonProductMode && (
        <div className="space-y-4">
          {/* Product Selection with Image Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label htmlFor="product" className="text-sm sm:text-base">{t.generate.productSelector.product}</Label>

              {/* Multi-select controls */}
              <div className="flex items-center gap-2">
                {multiSelectMode && selectedProducts.length > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={addSelectedToQueue}
                    disabled={addingToQueue}
                    className="gap-1.5 bg-primary hover:bg-primary/90"
                  >
                    {addingToQueue ? (
                      <SpinnerGap className="h-4 w-4 animate-spin" />
                    ) : (
                      <Queue className="h-4 w-4" />
                    )}
                    {selectedProducts.length}개 대기열 추가
                  </Button>
                )}
                {multiSelectMode && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllProducts}
                      className="text-xs px-2"
                    >
                      전체 선택
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllSelections}
                      className="text-xs px-2"
                    >
                      선택 해제
                    </Button>
                  </div>
                )}
                <Button
                  variant={multiSelectMode ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setMultiSelectMode(!multiSelectMode)
                    if (multiSelectMode) {
                      setSelectedProducts([])
                    }
                  }}
                  className="gap-1.5"
                >
                  {multiSelectMode ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">다중 선택</span>
                </Button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.generate.productSelector.searchProducts}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Product Image Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSelected={multiSelectMode
                      ? selectedProducts.includes(product.id)
                      : productId === product.id
                    }
                    onSelect={() => {
                      if (multiSelectMode) {
                        toggleProductSelection(product.id)
                      } else {
                        setProduct(product.id, product.name)
                      }
                    }}
                    multiSelectMode={multiSelectMode}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {productSearch ? t.generate.productSelector.noProductFound : t.generate.productSelector.selectCategory}
              </div>
            )}

            {products.length > 6 && (
              <p className="text-xs text-muted-foreground mt-2">
                {filteredProducts.length === products.length
                  ? t.generate.productSelector.productsAvailable.replace('{count}', String(products.length))
                  : `${filteredProducts.length} / ${products.length} ${t.generate.productSelector.productsFiltered || '제품 표시중'}`
                }
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="campaign" className="text-sm sm:text-base">
              {t.generate.productSelector.campaignTag}
              <span className="text-muted-foreground font-normal ml-2 text-xs sm:text-sm">
                ({t.common.optional})
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
              <span>{t.generate.productSelector.campaignTagHint}</span>
            </p>
          </div>

          {/* Samsung Standard Fields (P1) - Collapsible */}
          <Collapsible open={samsungSettingsOpen} onOpenChange={setSamsungSettingsOpen}>
            <div className="rounded-lg border bg-muted/30 overflow-hidden">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Gear className="h-4 w-4 text-muted-foreground" />
                    <div className="text-left">
                      <span className="text-sm font-medium">{t.samsung.contentSettings}</span>
                      {!samsungSettingsOpen && (
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>{t.samsung.contentTypes[contentType]}</span>
                          <span>•</span>
                          <span>{t.samsung.videoFormats[videoFormat]}</span>
                          {useFixedHashtags && fixedHashtags.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{fixedHashtags.length} {t.samsung.hashtags.fixedHashtags || '해시태그'}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {samsungSettingsOpen ? (
                    <CaretUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <CaretDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 sm:px-4 pb-4 pt-2 border-t space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Content Type */}
                    <div>
                      <Label htmlFor="contentType" className="text-sm">{t.samsung.contentType}</Label>
                      <Select
                        value={contentType}
                        onValueChange={(value) => setContentType(value as ContentType)}
                      >
                        <SelectTrigger id="contentType" className="mt-1.5 bg-background">
                          <SelectValue placeholder={t.common.select} />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((type) => (
                            <SelectItem key={type} value={type}>
                              {t.samsung.contentTypes[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Video Format */}
                    <div>
                      <Label htmlFor="videoFormat" className="text-sm">{t.samsung.videoFormat}</Label>
                      <Select
                        value={videoFormat}
                        onValueChange={(value) => setVideoFormat(value as VideoFormat)}
                      >
                        <SelectTrigger id="videoFormat" className="mt-1.5 bg-background">
                          <SelectValue placeholder={t.common.select} />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(VIDEO_FORMAT_LABELS) as VideoFormat[]).map((fmt) => (
                            <SelectItem key={fmt} value={fmt}>
                              {t.samsung.videoFormats[fmt]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Fixed Hashtags */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="fixedHashtags" className="text-sm">
                        {t.samsung.hashtags.fixedHashtags}
                      </Label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useFixedHashtags}
                          onChange={(e) => setUseFixedHashtags(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-muted-foreground">{t.samsung.hashtags.useFixedHashtags}</span>
                      </label>
                    </div>
                    <Input
                      id="fixedHashtags"
                      value={fixedHashtags.join(' ')}
                      onChange={(e) => {
                        const hashtags = e.target.value
                          .split(/\s+/)
                          .filter(tag => tag.startsWith('#') || tag.length === 0)
                          .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
                          .filter(Boolean)
                        setFixedHashtags(hashtags)
                      }}
                      placeholder={t.samsung.hashtags.placeholder}
                      className="bg-background"
                      disabled={!useFixedHashtags}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {t.samsung.hashtags.orderHint}
                    </p>
                    {/* Hashtag Order Validation UI (P0-1) */}
                    {useFixedHashtags && fixedHashtags.length > 0 && (
                      <div className={cn(
                        "mt-2 p-2.5 rounded-md text-xs border",
                        hashtagValidation.valid
                          ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                          : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                      )}>
                        {hashtagValidation.valid ? (
                          <span className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                            {t.samsung.hashtags.valid} ({fixedHashtags.length})
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Warning className="h-3.5 w-3.5" weight="fill" />
                              {t.samsung.hashtags.invalid}
                            </span>
                            <ul className="pl-5 space-y-0.5 list-disc">
                              {hashtagValidation.issueKeys.map((key, i) => (
                                <li key={i}>{t.samsung.hashtags[key as keyof typeof t.samsung.hashtags]}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vanity Link Code */}
                  <div>
                    <Label htmlFor="vanityLinkCode" className="text-sm">
                      {t.samsung.vanityLinkCode}
                      <span className="text-muted-foreground font-normal ml-2 text-xs">
                        ({t.common.optional})
                      </span>
                    </Label>
                    <Input
                      id="vanityLinkCode"
                      value={vanityLinkCode}
                      onChange={(e) => setVanityLinkCode(e.target.value)}
                      placeholder="e.g., ZFlip7_Intro"
                      className="mt-1.5 bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {t.samsung.vanityLinkPreview}: http://smsng.co/{vanityLinkCode || '[Code]'}_yt
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          <div>
            <Label className="text-sm sm:text-base">
              {t.generate.productSelector.launchDate}
              <span className="text-muted-foreground font-normal ml-2 text-xs sm:text-sm block sm:inline mt-0.5 sm:mt-0">
                ({t.generate.productSelector.launchDateHint})
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
                  {launchDate ? format(launchDate, 'PPP') : t.generate.productSelector.selectLaunchDate}
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
                {t.generate.productSelector.searchResultsAfterDate.replace('{date}', format(launchDate, 'MMMM d, yyyy'))}
              </p>
            )}
          </div>

          {/* USP Source Selection - Simplified Radio Toggle */}
          {productId && (
            <div className="space-y-2">
              <Label className="text-sm sm:text-base flex items-center gap-2">
                USP {t.generate.productSelector.source || '소스'}
                {briefLoading && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="h-3 w-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    {t.generate.productSelector.loadingBrief}
                  </span>
                )}
              </Label>

              <div className="flex flex-col sm:flex-row gap-2">
                {/* Auto-extraction option */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBriefId(null)
                    setBriefUsps([])
                  }}
                  className={cn(
                    "flex-1 flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                    !selectedBriefId
                      ? "bg-green-50/50 dark:bg-green-950/20 border-green-400 dark:border-green-600"
                      : "bg-muted/20 border-muted-foreground/20 hover:border-muted-foreground/40"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    !selectedBriefId ? "border-green-500 bg-green-500" : "border-muted-foreground/50"
                  )}>
                    {!selectedBriefId && <Check className="h-2.5 w-2.5 text-white" weight="bold" />}
                  </div>
                  <div>
                    <span className={cn(
                      "text-sm font-medium",
                      !selectedBriefId ? "text-green-700 dark:text-green-300" : "text-muted-foreground"
                    )}>
                      {t.generate.productSelector.useAutoExtraction || 'SRT 자동 추출'}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      AI가 콘텐츠 분석
                    </p>
                  </div>
                </button>

                {/* Brief selection option */}
                {allBriefs.length > 0 && !briefLoading && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex-1 flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                          selectedBriefId
                            ? "bg-primary/5 border-primary"
                            : "bg-muted/20 border-muted-foreground/20 hover:border-muted-foreground/40"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          selectedBriefId ? "border-primary bg-primary" : "border-muted-foreground/50"
                        )}>
                          {selectedBriefId && <Check className="h-2.5 w-2.5 text-white" weight="bold" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            "text-sm font-medium",
                            selectedBriefId ? "text-primary" : "text-muted-foreground"
                          )}>
                            {selectedBriefId
                              ? `브리프 v${allBriefs.find(b => b.id === selectedBriefId)?.version || '?'}`
                              : t.generate.productSelector.selectBrief || '브리프 선택'
                            }
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {allBriefs.length}개 브리프 사용 가능
                          </p>
                        </div>
                        <CaretDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <div className="space-y-1">
                        {allBriefs.map((brief) => (
                          <button
                            key={brief.id}
                            type="button"
                            onClick={() => handleBriefSelect(brief.id)}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                              selectedBriefId === brief.id
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted"
                            )}
                          >
                            <span className="font-medium">v{brief.version}</span>
                            {brief.is_active && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">활성</Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {new Date(brief.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Brief USPs preview - compact inline display */}
              {selectedBriefId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                  <span>USP:</span>
                  <span className="truncate">
                    {allBriefs.find(b => b.id === selectedBriefId)?.usps.slice(0, 2).join(', ')}
                    {(allBriefs.find(b => b.id === selectedBriefId)?.usps.length || 0) > 2 && ' ...'}
                  </span>
                </div>
              )}

              {/* Error state - inline */}
              {briefLoadError && !briefLoading && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Warning className="h-3 w-3" />
                  {t.generate.productSelector.briefLoadFailed} - {t.generate.productSelector.continueWithoutBrief}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
