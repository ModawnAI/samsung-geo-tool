'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { GEOv2GenerateResponse } from '@/types/geo-v2'
import { USPDisplay } from './usp-display'
import { GroundingSourcesWidget } from './grounding-sources-widget'
import { ImageAltDisplay } from './image-alt-display'
import { ExportButtons } from './export-buttons'
import {
  TextT,
  ListNumbers,
  Question,
  Footprints,
  BookOpenText,
  Tag,
  Globe,
  CaretDown,
  CaretUp,
  Copy,
  Check,
  ChartBar,
  Link as LinkIcon,
  Image as ImageIcon,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import { VerificationPanel } from './verification-panel'
import { cn } from '@/lib/utils'

interface ResultsDisplayProps {
  result: GEOv2GenerateResponse
  productName: string
  keywords?: string[]
  language?: 'ko' | 'en'
  className?: string
}

export function ResultsDisplay({
  result,
  productName,
  keywords = [],
  language = 'ko',
  className,
}: ResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState('description')
  const isKorean = language === 'ko'

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ChartBar className="h-5 w-5 text-[#040523] dark:text-slate-200" weight="fill" />
            <span className="text-sm font-medium">
              {isKorean ? '생성 결과' : 'Generated Results'}
            </span>
          </div>
        </div>
        <ExportButtons
          result={result}
          productName={productName}
          language={language}
          variant="default"
        />
      </div>

      {/* USP Section */}
      {result.uspResult && (
        <USPDisplay
          uspResult={result.uspResult}
          onSourceClick={(sourceUri, sourceTitle) => {
            console.log('Source clicked:', sourceUri, sourceTitle)
          }}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
          <TabsTrigger value="description" className="gap-1.5">
            <TextT className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isKorean ? '설명' : 'Description'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="chapters" className="gap-1.5">
            <ListNumbers className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isKorean ? '챕터' : 'Chapters'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-1.5">
            <Question className="h-4 w-4" />
            <span className="hidden sm:inline">FAQ</span>
          </TabsTrigger>
          <TabsTrigger value="steps" className="gap-1.5">
            <Footprints className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isKorean ? '단계별' : 'Steps'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="cases" className="gap-1.5">
            <BookOpenText className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isKorean ? '사례' : 'Cases'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="keywords" className="gap-1.5">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isKorean ? '키워드' : 'Keywords'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-1.5">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isKorean ? '소스' : 'Sources'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="image-alt" className="gap-1.5">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isKorean ? '이미지' : 'Images'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="verify" className="gap-1.5">
            <MagnifyingGlass className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isKorean ? '검증' : 'Verify'}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Description Tab */}
        <TabsContent value="description" className="mt-4">
          <DescriptionSection
            description={result.description}
            language={language}
          />
        </TabsContent>

        {/* Chapters Tab */}
        <TabsContent value="chapters" className="mt-4">
          <ChaptersSection chapters={result.chapters} language={language} />
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="mt-4">
          <FAQSection faq={result.faq} language={language} />
        </TabsContent>

        {/* Step-by-Step Tab */}
        <TabsContent value="steps" className="mt-4">
          <StepByStepSection
            stepByStep={result.stepByStep}
            language={language}
          />
        </TabsContent>

        {/* Case Studies Tab */}
        <TabsContent value="cases" className="mt-4">
          <CaseStudiesSection
            caseStudies={result.caseStudies}
            language={language}
          />
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="mt-4">
          <KeywordsSection
            keywords={result.keywords}
            hashtags={result.hashtags}
            isFixedHashtags={result.isFixedHashtags}
            language={language}
          />
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="mt-4">
          <SourcesSection
            groundingMetadata={result.groundingMetadata}
            groundingQuality={result.finalScore.groundingQuality}
            language={language}
          />
        </TabsContent>

        {/* Image Alt Tab */}
        <TabsContent value="image-alt" className="mt-4">
          <ImageAltSection
            imageAltResult={result.imageAltResult}
            language={language}
          />
        </TabsContent>

        {/* Verify Tab */}
        <TabsContent value="verify" className="mt-4">
          <VerificationPanel
            productName={productName}
            keywords={keywords.length > 0 ? keywords : result.keywords.product}
            generatedDescription={result.description.full}
            hashtags={result.hashtags}
            language={language}
          />
        </TabsContent>
      </Tabs>

      {/* Score breakdown hidden - AI automatically optimizes for best results */}
    </div>
  )
}

// Description Section Component
function DescriptionSection({
  description,
  language,
}: {
  description: GEOv2GenerateResponse['description']
  language: 'ko' | 'en'
}) {
  const [copied, setCopied] = useState<'preview' | 'full' | null>(null)
  const isKorean = language === 'ko'

  const handleCopy = async (text: string, type: 'preview' | 'full') => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Preview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {isKorean ? '미리보기 (처음 130자)' : 'Preview (First 130 chars)'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(description.preview, 'preview')}
              className="h-8 gap-1.5"
            >
              {copied === 'preview' ? (
                <Check className="h-4 w-4 text-[#040523] dark:text-slate-200" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {isKorean ? '복사' : 'Copy'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm bg-muted/50 p-3 rounded-lg">
            {description.preview}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {description.preview.length} / 130 {isKorean ? '자' : 'chars'}
          </p>
        </CardContent>
      </Card>

      {/* Full Description */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {isKorean ? '전체 설명' : 'Full Description'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(description.full, 'full')}
              className="h-8 gap-1.5"
            >
              {copied === 'full' ? (
                <Check className="h-4 w-4 text-[#040523] dark:text-slate-200" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {isKorean ? '복사' : 'Copy'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[200px] overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap pr-4">{description.full}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {description.full.length} {isKorean ? '자' : 'chars'}
          </p>
        </CardContent>
      </Card>

      {/* Vanity Links */}
      {description.vanityLinks && description.vanityLinks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              {isKorean ? '추천 바니티 링크' : 'Suggested Vanity Links'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {description.vanityLinks.map((link, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {link}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Chapters Section Component
function ChaptersSection({
  chapters,
  language,
}: {
  chapters: GEOv2GenerateResponse['chapters']
  language: 'ko' | 'en'
}) {
  const [copied, setCopied] = useState(false)
  const isKorean = language === 'ko'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(chapters.timestamps)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {isKorean ? 'YouTube 챕터' : 'YouTube Chapters'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 gap-1.5"
          >
            {copied ? (
              <Check className="h-4 w-4 text-[#040523] dark:text-slate-200" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {isKorean ? '복사' : 'Copy'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="text-sm bg-muted/50 p-4 rounded-lg whitespace-pre-wrap font-mono">
          {chapters.timestamps}
        </pre>
        {chapters.autoGenerated && (
          <p className="text-xs text-muted-foreground mt-2">
            {isKorean ? '자동 생성됨' : 'Auto-generated'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// FAQ Section Component
function FAQSection({
  faq,
  language,
}: {
  faq: GEOv2GenerateResponse['faq']
  language: 'ko' | 'en'
}) {
  const [openItems, setOpenItems] = useState<number[]>([0])
  const isKorean = language === 'ko'

  const toggleItem = (idx: number) => {
    setOpenItems((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    )
  }

  return (
    <div className="space-y-3">
      {faq.faqs.map((item, idx) => (
        <Card key={idx}>
          <CardHeader
            className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
            onClick={() => toggleItem(idx)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Q{idx + 1}
                </Badge>
                <span className="text-sm font-medium">{item.question}</span>
              </div>
              {openItems.includes(idx) ? (
                <CaretUp className="h-4 w-4" />
              ) : (
                <CaretDown className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
          {openItems.includes(idx) && (
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">{item.answer}</p>
              {item.linkedUSPs && item.linkedUSPs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.linkedUSPs.map((usp, uspIdx) => (
                    <Badge key={uspIdx} variant="secondary" className="text-xs">
                      {usp}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}

// Step-by-Step Section Component
function StepByStepSection({
  stepByStep,
  language,
}: {
  stepByStep?: GEOv2GenerateResponse['stepByStep']
  language: 'ko' | 'en'
}) {
  const isKorean = language === 'ko'

  if (!stepByStep?.steps || stepByStep.steps.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {isKorean
            ? '단계별 가이드가 없습니다'
            : 'No step-by-step guides available'}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {isKorean ? '단계별 가이드' : 'Step-by-Step Guide'}
          {stepByStep.isTutorialContent && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {isKorean ? '튜토리얼' : 'Tutorial'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {stepByStep.steps.map((step, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#040523]/10 text-[#040523] dark:bg-[#040523]/30 dark:text-slate-200 text-xs flex items-center justify-center font-medium">
                {idx + 1}
              </span>
              <span className="text-sm">{step}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

// Case Studies Section Component
function CaseStudiesSection({
  caseStudies,
  language,
}: {
  caseStudies?: GEOv2GenerateResponse['caseStudies']
  language: 'ko' | 'en'
}) {
  const isKorean = language === 'ko'

  if (!caseStudies?.caseStudies || caseStudies.caseStudies.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {isKorean ? '사례 연구가 없습니다' : 'No case studies available'}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {caseStudies.caseStudies.map((study, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{study.title}</CardTitle>
              <Badge
                variant={
                  study.evidence.confidence === 'high'
                    ? 'default'
                    : study.evidence.confidence === 'medium'
                    ? 'secondary'
                    : 'outline'
                }
                className="text-xs"
              >
                {study.evidence.confidence === 'high'
                  ? isKorean
                    ? '높은 신뢰도'
                    : 'High Confidence'
                  : study.evidence.confidence === 'medium'
                  ? isKorean
                    ? '중간 신뢰도'
                    : 'Medium Confidence'
                  : isKorean
                  ? '낮은 신뢰도'
                  : 'Low Confidence'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {isKorean ? '시나리오' : 'Scenario'}
              </p>
              <p className="text-sm">{study.scenario}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {isKorean ? '해결책' : 'Solution'}
              </p>
              <p className="text-sm">{study.solution}</p>
            </div>
            {study.linkedUSPs && study.linkedUSPs.length > 0 && (
              <div className="pt-2 border-t flex flex-wrap gap-1">
                {study.linkedUSPs.map((usp, uspIdx) => (
                  <Badge key={uspIdx} variant="secondary" className="text-xs">
                    {usp}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Keywords Section Component
function KeywordsSection({
  keywords,
  hashtags,
  isFixedHashtags,
  language,
}: {
  keywords: GEOv2GenerateResponse['keywords']
  hashtags: GEOv2GenerateResponse['hashtags']
  isFixedHashtags?: boolean
  language: 'ko' | 'en'
}) {
  const [copied, setCopied] = useState<'product' | 'generic' | 'hashtags' | null>(null)
  const isKorean = language === 'ko'

  const handleCopy = async (items: string[], type: 'product' | 'generic' | 'hashtags') => {
    const text = type === 'hashtags' ? items.join(' ') : items.join(', ')
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Product Keywords */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {isKorean ? '제품 키워드' : 'Product Keywords'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(keywords.product, 'product')}
              className="h-8 gap-1.5"
            >
              {copied === 'product' ? (
                <Check className="h-4 w-4 text-[#040523] dark:text-slate-200" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {isKorean ? '복사' : 'Copy'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {keywords.product.map((tag, idx) => (
              <Badge key={idx} variant="default">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generic Keywords */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {isKorean ? '일반 키워드' : 'Generic Keywords'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(keywords.generic, 'generic')}
              className="h-8 gap-1.5"
            >
              {copied === 'generic' ? (
                <Check className="h-4 w-4 text-[#040523] dark:text-slate-200" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {isKorean ? '복사' : 'Copy'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {keywords.generic.map((tag, idx) => (
              <Badge key={idx} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hashtags */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">
                {isKorean ? '해시태그' : 'Hashtags'}
              </CardTitle>
              {isFixedHashtags && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                  {isKorean ? '고정 해시태그' : 'Fixed'}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(hashtags, 'hashtags')}
              className="h-8 gap-1.5"
            >
              {copied === 'hashtags' ? (
                <Check className="h-4 w-4 text-[#040523] dark:text-slate-200" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {isKorean ? '복사' : 'Copy'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#040523] dark:text-slate-200 whitespace-pre-wrap">{hashtags.join(' ')}</p>
          {isFixedHashtags && (
            <p className="text-xs text-muted-foreground mt-2">
              {isKorean
                ? 'Samsung Standard에 따른 고정 해시태그입니다. 복사하여 사용하세요.'
                : 'Fixed hashtags as per Samsung Standard. Copy to use.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Sources Section Component
function SourcesSection({
  groundingMetadata,
  groundingQuality,
  language,
}: {
  groundingMetadata?: GEOv2GenerateResponse['groundingMetadata']
  groundingQuality?: GEOv2GenerateResponse['finalScore']['groundingQuality']
  language: 'ko' | 'en'
}) {
  const isKorean = language === 'ko'

  if (!groundingMetadata || !groundingQuality) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {isKorean
            ? '그라운딩 소스 데이터가 없습니다'
            : 'No grounding source data available'}
        </CardContent>
      </Card>
    )
  }

  return (
    <GroundingSourcesWidget
      groundingMetadata={groundingMetadata}
      groundingQuality={groundingQuality}
      language={language}
      onSourceClick={(uri, title) => {
        console.log('Source clicked:', uri, title)
      }}
    />
  )
}

// Image Alt Section Component
function ImageAltSection({
  imageAltResult,
  language,
}: {
  imageAltResult?: GEOv2GenerateResponse['imageAltResult']
  language: 'ko' | 'en'
}) {
  const isKorean = language === 'ko'

  if (!imageAltResult) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {isKorean
            ? '이미지 Alt 텍스트 데이터가 없습니다'
            : 'No image alt text data available'}
        </CardContent>
      </Card>
    )
  }

  return <ImageAltDisplay imageAltResult={imageAltResult} language={language} />
}

