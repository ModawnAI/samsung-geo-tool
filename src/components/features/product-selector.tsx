'use client'

import { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useGenerationStore } from '@/store/generation-store'
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
  Leaf,
  FilmStrip,
  Megaphone,
  CheckCircle,
} from '@phosphor-icons/react'
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
  const [activeBrief, setActiveBrief] = useState<Brief | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [productSearch, setProductSearch] = useState('')
  const [productPopoverOpen, setProductPopoverOpen] = useState(false)
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefLoadError, setBriefLoadError] = useState<string | null>(null)
  const [isNonProductMode, setIsNonProductMode] = useState(false)
  const [selectedNonProductCategory, setSelectedNonProductCategory] = useState<string | null>(null)

  const {
    categoryId,
    productId,
    productName,
    campaignTag,
    launchDate,
    selectedKeywords,
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
    setSelectedKeywords,
    // Samsung Standard Actions (P1)
    setContentType,
    setVideoFormat,
    setFixedHashtags,
    setUseFixedHashtags,
    setVanityLinkCode,
  } = useGenerationStore()

  const supabase = createClient()

  // Compute hashtag validation (P0-1)
  const hashtagValidation = useMemo(() => {
    return validateHashtagOrder(fixedHashtags)
  }, [fixedHashtags])

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
    setActiveBrief(null)
    setBriefUsps([])
  }

  // Handle regular product category selection
  const handleProductCategorySelect = (catId: string) => {
    setIsNonProductMode(false)
    setSelectedNonProductCategory(null)
    setCategory(catId)
  }

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
      setBriefLoadError(t.generate.productSelector.briefLoadError)
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

      <div>
        <Label className="text-sm sm:text-base mb-3 block">{t.generate.productSelector.productCategory}</Label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          {categories.map((category) => {
            const Icon = iconMap[category.icon || ''] || DeviceMobile
            const isSelected = categoryId === category.id && !isNonProductMode
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
                onClick={() => handleProductCategorySelect(category.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleProductCategorySelect(category.id)
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

      {/* Non-Product Categories (P3 - ESG, Documentary, Brand Campaign) */}
      <div>
        <Label className="text-sm sm:text-base mb-3 block flex items-center gap-2">
          {t.samsung.nonProductContent}
          <span className="text-xs text-muted-foreground font-normal">({t.samsung.categories.esg}, {t.samsung.categories.documentary}, {t.samsung.categories.brandCampaign})</span>
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
                  'cursor-pointer transition-all hover:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[80px] sm:min-h-0',
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
                <CardContent className="p-3 sm:p-4 text-center">
                  <Icon
                    className={cn(
                      'h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1 sm:mb-2',
                      isSelected ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                    )}
                    weight={isSelected ? 'bold' : 'regular'}
                  />
                  <p className={cn(
                    'text-xs sm:text-sm font-medium',
                    isSelected ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                  )}>
                    {npCategory.name_ko}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
        {isNonProductMode && selectedNonProductCategory && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
            <Info className="h-3 w-3" />
            {t.generate.productSelector.nonProductSelected}
          </p>
        )}
      </div>

      {categoryId && !isNonProductMode && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="product" className="text-sm sm:text-base">{t.generate.productSelector.product}</Label>
            <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={productPopoverOpen}
                  className="w-full justify-between mt-1.5"
                >
                  {productName || t.generate.productSelector.selectProduct}
                  <MagnifyingGlass className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder={t.generate.productSelector.searchProducts}
                    value={productSearch}
                    onValueChange={setProductSearch}
                  />
                  <CommandList>
                    <CommandEmpty>{t.generate.productSelector.noProductFound}</CommandEmpty>
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
                {t.generate.productSelector.productsAvailable.replace('{count}', String(products.length))}
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

          {/* Samsung Standard Fields (P1) */}
          <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {t.samsung.contentSettings}
            </h3>

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
            <div className="mt-4">
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
            <div className="mt-4">
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

          {/* Brief Loading State */}
          {briefLoading && (
            <div className="p-4 rounded-lg bg-muted/50 border animate-pulse">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                <span>{t.generate.productSelector.loadingBrief}</span>
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
                    <p className="font-medium text-destructive">{t.generate.productSelector.briefLoadFailed}</p>
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
                  {t.generate.productSelector.retry}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <Info className="h-3 w-3" />
                {t.generate.productSelector.continueWithoutBrief}
              </p>
            </div>
          )}

          {/* Active Brief Display */}
          {activeBrief && !briefLoading && !briefLoadError && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>{t.generate.productSelector.activeBrief}:</span>
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
                <span>{t.generate.productSelector.noBriefFound}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
