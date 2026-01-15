'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useGenerationStore } from '@/store/generation-store'
import { OutputDisplay } from '@/components/features/output-display'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Trash,
  SpinnerGap,
  Warning,
} from '@phosphor-icons/react'
import type { ImageAltResult } from '@/types/geo-v2'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface GenerationData {
  id: string
  product_id: string
  srt_content: string
  selected_keywords: string[]
  description: string | null
  timestamps: string | null
  hashtags: string[]
  faq: string | null
  status: 'draft' | 'confirmed'
  campaign_tag: string | null
  video_url: string | null
  image_alt_result: ImageAltResult | null
  created_at: string
  updated_at: string
  products: {
    name: string
    category_id: string
  } | null
}

export default function GenerationViewPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [generation, setGeneration] = useState<GenerationData | null>(null)

  const { loadGeneration, reset } = useGenerationStore()

  useEffect(() => {
    const fetchGeneration = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/generations?id=${id}`)
        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        const gen = data.generation as GenerationData
        setGeneration(gen)

        // Load into store for OutputDisplay
        loadGeneration({
          id: gen.id,
          categoryId: gen.products?.category_id || '',
          productId: gen.product_id,
          productName: gen.products?.name || 'Unknown Product',
          srtContent: gen.srt_content,
          selectedKeywords: gen.selected_keywords || [],
          description: gen.description || '',
          timestamps: gen.timestamps || '',
          hashtags: gen.hashtags || [],
          faq: gen.faq || '',
          status: gen.status,
          campaignTag: gen.campaign_tag || undefined,
          videoUrl: gen.video_url || undefined,
          imageAltResult: gen.image_alt_result || null,
        })
      } catch (err) {
        console.error('Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load generation')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchGeneration()
    }

    // Cleanup: reset store on unmount
    return () => {
      reset()
    }
  }, [id, loadGeneration, reset])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/generations?id=${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      toast.success('Generation deleted')
      router.push('/dashboard')
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !generation) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Warning className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Generation Not Found</h2>
        <p className="text-muted-foreground mb-6">
          {error || 'This generation may have been deleted or you do not have access.'}
        </p>
        <Button asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {generation.products?.name || 'Generation'}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>
                {new Date(generation.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {generation.campaign_tag && (
                <>
                  <span>•</span>
                  <Badge variant="outline">{generation.campaign_tag}</Badge>
                </>
              )}
            </div>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              {deleting ? (
                <SpinnerGap className="h-4 w-4 animate-spin" />
              ) : (
                <Trash className="h-4 w-4" />
              )}
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Generation?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this
                generation and all its content.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generated Content</CardTitle>
          </CardHeader>
          <CardContent>
            <OutputDisplay />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
