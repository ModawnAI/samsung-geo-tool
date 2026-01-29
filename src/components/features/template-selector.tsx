'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileText,
  FolderOpen,
  Lightning,
  Check,
  CaretRight,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface BriefTemplate {
  id: string
  name: string
  description: string | null
  categoryId: string | null
  categoryName: string | null
  keywords: string[]
  briefUsps: string[]
  briefDefaults: {
    content?: string
    isActive?: boolean
  }
  usageCount: number
  createdAt: string
}

interface Category {
  id: string
  name: string
}

interface TemplateSelectorProps {
  onSelect: (template: BriefTemplate) => void
  trigger?: React.ReactNode
  disabled?: boolean
}

export function TemplateSelector({ onSelect, trigger, disabled }: TemplateSelectorProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [templates, setTemplates] = useState<BriefTemplate[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
      fetchCategories()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && selectedCategory !== 'all') {
      fetchTemplates(selectedCategory)
    } else if (isOpen) {
      fetchTemplates()
    }
  }, [selectedCategory, isOpen])

  const fetchTemplates = async (categoryId?: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ type: 'brief' })
      if (categoryId && categoryId !== 'all') {
        params.set('category_id', categoryId)
      }

      const response = await fetch(`/api/templates?${params.toString()}`)
      const data = await response.json()

      if (data.error) throw new Error(data.error)
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error(t.templates?.loadError || 'Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleSelect = (template: BriefTemplate) => {
    setSelectedTemplate(template.id)
    onSelect(template)
    setIsOpen(false)
    setSelectedTemplate(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={disabled}>
        {trigger || (
          <Button variant="outline" disabled={disabled}>
            <FolderOpen className="h-4 w-4 mr-2" />
            {t.templates?.fromTemplate || 'From Template'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {t.templates?.selectTemplate || 'Select Template'}
          </DialogTitle>
          <DialogDescription>
            {t.templates?.selectTemplateDescription || 'Choose a template to quickly create a new brief'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t.templates?.filterByCategory || 'Filter by category'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.templates?.allCategories || 'All Categories'}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Templates list */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-60 mb-3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">{t.templates?.noTemplates || 'No templates found'}</p>
                <p className="text-sm mt-1">
                  {selectedCategory !== 'all'
                    ? t.templates?.tryOtherCategory || 'Try selecting a different category'
                    : t.templates?.createFirst || 'Create your first template from an existing brief'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelect(template)}
                    className={cn(
                      'w-full text-left p-4 border rounded-lg transition-all hover:border-primary hover:bg-accent/50',
                      selectedTemplate === template.id && 'border-primary bg-accent'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{template.name}</h4>
                          {template.usageCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <Lightning className="h-3 w-3 mr-1" />
                              {template.usageCount}
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {template.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {template.categoryName && (
                            <Badge variant="outline" className="text-xs">
                              {template.categoryName}
                            </Badge>
                          )}
                          {template.briefUsps.slice(0, 3).map((usp, i) => (
                            <Badge key={i} variant="secondary" className="text-xs font-normal">
                              {usp.length > 30 ? usp.slice(0, 30) + '...' : usp}
                            </Badge>
                          ))}
                          {template.briefUsps.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.briefUsps.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CaretRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
