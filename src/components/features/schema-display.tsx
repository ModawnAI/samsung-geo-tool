'use client'

/**
 * Enhanced Schema.org Display Component
 * Shows structured data with syntax highlighting and easy copying
 * Iteration 7: Feature Improvements
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Code,
  Copy,
  Check,
  Info,
  CaretDown,
  CaretUp,
  Lightning,
  MagnifyingGlass,
  Robot,
  FileCode,
  BracketsCurly,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { SchemaGeneratorResult } from '@/lib/geo-v2/schema-generator'

interface SchemaDisplayProps {
  schema: SchemaGeneratorResult
  className?: string
}

// Schema type icons and descriptions
const SCHEMA_INFO: Record<string, { icon: React.ElementType; label: string; description: string; seoTip: string }> = {
  TechArticle: {
    icon: FileCode,
    label: 'TechArticle',
    description: '기술 문서 및 How-to 콘텐츠',
    seoTip: 'Google의 "How to" 리치 결과에 표시될 수 있습니다',
  },
  FAQPage: {
    icon: Info,
    label: 'FAQPage',
    description: 'FAQ 구조화 데이터',
    seoTip: 'Google 검색결과에 FAQ 확장 스니펫으로 표시됩니다',
  },
  VideoObject: {
    icon: Lightning,
    label: 'VideoObject',
    description: '동영상 콘텐츠 메타데이터',
    seoTip: 'Google 비디오 탭 및 리치 결과에 표시됩니다',
  },
  Product: {
    icon: BracketsCurly,
    label: 'Product',
    description: '제품 정보 구조화 데이터',
    seoTip: 'Google 쇼핑 및 제품 리치 결과에 표시됩니다',
  },
}

export function SchemaDisplay({ schema, className }: SchemaDisplayProps) {
  const [copied, setCopied] = useState<'jsonld' | 'script' | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // Get schema types from the generated schemas
  const schemaTypes = useMemo(() => {
    const types: string[] = []
    if (schema.techArticle) types.push('TechArticle')
    if (schema.faqPage) types.push('FAQPage')
    if (schema.videoObject) types.push('VideoObject')
    if (schema.product) types.push('Product')
    return types
  }, [schema])

  // Format JSON for display
  const formatJson = (obj: unknown) => JSON.stringify(obj, null, 2)

  // Generate script tag
  const generateScriptTag = (schemaObj: unknown) => {
    return `<script type="application/ld+json">\n${JSON.stringify(schemaObj, null, 2)}\n</script>`
  }

  // Copy handler
  const handleCopy = async (content: string, type: 'jsonld' | 'script') => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(type)
      toast.success(type === 'jsonld' ? 'JSON-LD 복사됨' : '스크립트 태그 복사됨')
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error('복사 실패')
    }
  }

  // Get all schemas as combined JSON
  const getAllSchemasJson = () => {
    const schemas = []
    if (schema.techArticle) schemas.push(schema.techArticle)
    if (schema.faqPage) schemas.push(schema.faqPage)
    if (schema.videoObject) schemas.push(schema.videoObject)
    if (schema.product) schemas.push(schema.product)
    return schemas.length === 1 ? schemas[0] : schemas
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-4 w-4" />
            Schema.org 구조화 데이터
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-1"
          >
            {isExpanded ? (
              <>접기 <CaretUp className="h-4 w-4" /></>
            ) : (
              <>펼치기 <CaretDown className="h-4 w-4" /></>
            )}
          </Button>
        </div>

        {/* Schema Type Badges */}
        <div className="flex flex-wrap gap-2 mt-2">
          <TooltipProvider>
            {schemaTypes.map((type) => {
              const info = SCHEMA_INFO[type]
              const Icon = info?.icon || Code
              return (
                <Tooltip key={type}>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="gap-1.5">
                      <Icon className="h-3 w-3" />
                      {info?.label || type}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium">{info?.description || type}</p>
                    <p className="text-xs text-muted-foreground mt-1">{info?.seoTip}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </TooltipProvider>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <CardContent className="pt-4">
              {/* SEO Recommendations */}
              {schema.recommendations.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-2">
                    <MagnifyingGlass className="h-4 w-4" />
                    SEO 권장사항
                  </h4>
                  <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                    {schema.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Discoverability Info */}
              <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
                  <Robot className="h-4 w-4" />
                  AI 검색 최적화 (GEO)
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  구조화된 데이터는 AI 모델(ChatGPT, Gemini 등)이 콘텐츠를 이해하고 인용하는 데 도움을 줍니다.
                  FAQPage 스키마는 특히 Query Fan-Out 전략에 효과적입니다.
                </p>
              </div>

              {/* Schema Tabs */}
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="all" className="gap-1.5">
                    <BracketsCurly className="h-3 w-3" />
                    JSON-LD
                  </TabsTrigger>
                  <TabsTrigger value="script" className="gap-1.5">
                    <FileCode className="h-3 w-3" />
                    Script Tag
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <div className="relative">
                    <pre className="p-4 rounded-lg bg-slate-950 text-slate-50 text-xs overflow-x-auto max-h-[400px] overflow-y-auto">
                      <code className="language-json">
                        {formatJson(getAllSchemasJson())}
                      </code>
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2 gap-1.5"
                      onClick={() => handleCopy(formatJson(getAllSchemasJson()), 'jsonld')}
                    >
                      {copied === 'jsonld' ? (
                        <>
                          <Check className="h-3 w-3" />
                          복사됨
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          복사
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="script" className="mt-4">
                  <div className="relative">
                    <pre className="p-4 rounded-lg bg-slate-950 text-slate-50 text-xs overflow-x-auto max-h-[400px] overflow-y-auto">
                      <code className="language-html">
                        {generateScriptTag(getAllSchemasJson())}
                      </code>
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2 gap-1.5"
                      onClick={() => handleCopy(generateScriptTag(getAllSchemasJson()), 'script')}
                    >
                      {copied === 'script' ? (
                        <>
                          <Check className="h-3 w-3" />
                          복사됨
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          복사
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Usage Instructions */}
              <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <p className="font-medium mb-1">📋 사용 방법</p>
                <p>
                  Script Tag를 복사하여 HTML의 <code className="px-1 bg-muted rounded">&lt;head&gt;</code> 태그 안에 붙여넣으세요.
                  CMS를 사용하는 경우 JSON-LD를 해당 필드에 입력하세요.
                </p>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export default SchemaDisplay
