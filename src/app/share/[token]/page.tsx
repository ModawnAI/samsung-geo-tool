'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Copy,
  Check,
  Clock,
  Tag,
  Hash,
  SpinnerGap,
  Warning,
  TextAlignLeft,
  ChatCircleText,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface SharedGeneration {
  id: string
  productName: string
  categoryName: string
  description: string | null
  timestamps: string | null
  hashtags: string[]
  faq: string | null
  keywords: string[]
  campaignTag: string | null
  createdAt: string
  qualityScore: number | null
}

export default function SharePage() {
  const params = useParams()
  const token = params.token as string
  const [generation, setGeneration] = useState<SharedGeneration | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSharedContent() {
      try {
        const response = await fetch(`/api/share?token=${token}`)
        const data = await response.json()

        if (data.error) {
          setError(data.error)
        } else {
          setGeneration(data)
        }
      } catch {
        setError('Failed to load shared content')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchSharedContent()
    }
  }, [token])

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSection(label)
      toast.success(`${label} copied to clipboard`)
      setTimeout(() => setCopiedSection(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <SpinnerGap className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading shared content...</p>
        </div>
      </div>
    )
  }

  if (error || !generation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Warning className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Content Not Found</h2>
            <p className="text-muted-foreground">
              {error || 'This shared content may have been removed or the link is invalid.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{generation.productName}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{generation.categoryName}</Badge>
                  {generation.campaignTag && (
                    <Badge variant="outline" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {generation.campaignTag}
                    </Badge>
                  )}
                </CardDescription>
              </div>
              {generation.qualityScore !== null && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {Math.round(generation.qualityScore)}
                  </div>
                  <div className="text-xs text-muted-foreground">GEO Score</div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
              <Clock className="h-4 w-4" />
              <span>Generated {format(new Date(generation.createdAt), 'PPpp')}</span>
            </div>
          </CardHeader>
        </Card>

        {/* Keywords */}
        {generation.keywords && generation.keywords.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Keywords
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {generation.keywords.map((keyword, i) => (
                  <Badge key={i} variant="secondary">{keyword}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {generation.description && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TextAlignLeft className="h-4 w-4" />
                  Description
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(generation.description!, 'Description')}
                  className="gap-1.5"
                >
                  {copiedSection === 'Description' ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap">{generation.description}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        {generation.timestamps && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timestamps
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(generation.timestamps!, 'Timestamps')}
                  className="gap-1.5"
                >
                  {copiedSection === 'Timestamps' ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-sm font-mono bg-muted p-3 rounded-md overflow-x-auto">
                {generation.timestamps}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Hashtags */}
        {generation.hashtags && generation.hashtags.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Hashtags
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(generation.hashtags.join(' '), 'Hashtags')}
                  className="gap-1.5"
                >
                  {copiedSection === 'Hashtags' ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-primary">{generation.hashtags.join(' ')}</p>
            </CardContent>
          </Card>
        )}

        {/* FAQ */}
        {generation.faq && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ChatCircleText className="h-4 w-4" />
                  FAQ / Pinned Comment
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(generation.faq!, 'FAQ')}
                  className="gap-1.5"
                >
                  {copiedSection === 'FAQ' ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap">{generation.faq}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <Separator />
        <div className="text-center text-sm text-muted-foreground pb-8">
          <p>Shared via Samsung GEO Tool</p>
        </div>
      </div>
    </div>
  )
}
