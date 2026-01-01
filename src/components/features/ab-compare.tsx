'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VersionManager, type VersionComparison } from '@/lib/history/version-manager'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowsLeftRight,
  ArrowRight,
  Check,
  X,
  TextAlignLeft,
  Clock,
  Hash,
  ChatCircleText,
  Star,
  SpinnerGap,
  Sparkle,
  Info,
} from '@phosphor-icons/react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type GenerationVersion = Database['public']['Tables']['generation_versions']['Row']

interface ABCompareProps {
  generationId: string
  onRestore?: (versionId: string) => void
}

export function ABCompare({ generationId, onRestore }: ABCompareProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [versions, setVersions] = useState<GenerationVersion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [versionA, setVersionA] = useState<string | null>(null)
  const [versionB, setVersionB] = useState<string | null>(null)
  const [comparison, setComparison] = useState<VersionComparison | null>(null)
  const [isComparing, setIsComparing] = useState(false)
  const [activeTab, setActiveTab] = useState('description')

  const versionManager = new VersionManager()

  // Load versions when dialog opens
  useEffect(() => {
    if (isOpen && generationId) {
      loadVersions()
    }
  }, [isOpen, generationId])

  const loadVersions = async () => {
    setIsLoading(true)
    try {
      const result = await versionManager.listVersions(generationId, { limit: 20 })
      if (result.success && result.versions) {
        setVersions(result.versions)
        // Auto-select if 2+ versions exist
        if (result.versions.length >= 2) {
          setVersionA(result.versions[0].id)
          setVersionB(result.versions[1].id)
        }
      }
    } catch (error) {
      console.error('Failed to load versions:', error)
      toast.error('Failed to load versions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompare = useCallback(async () => {
    if (!versionA || !versionB || versionA === versionB) {
      toast.error('Please select two different versions to compare')
      return
    }

    setIsComparing(true)
    try {
      const result = await versionManager.compareVersions(generationId, versionA, versionB)
      if (result.success && result.comparison) {
        setComparison(result.comparison)
      } else {
        toast.error(result.error || 'Failed to compare versions')
      }
    } catch (error) {
      console.error('Comparison error:', error)
      toast.error('Failed to compare versions')
    } finally {
      setIsComparing(false)
    }
  }, [generationId, versionA, versionB])

  const handleRestore = (versionId: string) => {
    if (onRestore) {
      onRestore(versionId)
      setIsOpen(false)
    }
  }

  const getVersionLabel = (version: GenerationVersion) => {
    const label = version.version_label || `Version ${version.version_number}`
    const date = format(new Date(version.created_at || ''), 'MMM d, HH:mm')
    return `${label} (${date})`
  }

  const renderDiffBadge = (field: string, hasChanged: boolean) => {
    if (!comparison) return null
    const diff = comparison.differences.find(d => d.field === field)

    if (diff) {
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <X className="h-3 w-3" /> Changed
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="gap-1 text-xs text-green-600">
        <Check className="h-3 w-3" /> Same
      </Badge>
    )
  }

  const renderContentComparison = (
    field: string,
    icon: React.ReactNode,
    label: string,
    formatValue: (v: GenerationVersion) => string | React.ReactNode
  ) => {
    if (!comparison) return null

    const diff = comparison.differences.find(d => d.field === field)
    const valueA = formatValue(comparison.versionA)
    const valueB = formatValue(comparison.versionB)

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <span className="font-medium">{label}</span>
          {renderDiffBadge(field, !!diff)}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Version A */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                A: {comparison.versionA.version_label || `v${comparison.versionA.version_number}`}
              </Badge>
              {comparison.versionA.is_current && (
                <Badge className="text-xs bg-green-100 text-green-700">Current</Badge>
              )}
            </div>
            <div className={cn(
              "p-3 rounded-lg bg-muted/50 border text-sm",
              diff && "border-orange-200 bg-orange-50/50"
            )}>
              <ScrollArea className="h-[200px]">
                {typeof valueA === 'string' ? (
                  <pre className="whitespace-pre-wrap font-sans">{valueA || '(empty)'}</pre>
                ) : valueA}
              </ScrollArea>
            </div>
          </div>

          {/* Version B */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                B: {comparison.versionB.version_label || `v${comparison.versionB.version_number}`}
              </Badge>
              {comparison.versionB.is_current && (
                <Badge className="text-xs bg-green-100 text-green-700">Current</Badge>
              )}
            </div>
            <div className={cn(
              "p-3 rounded-lg bg-muted/50 border text-sm",
              diff && "border-blue-200 bg-blue-50/50"
            )}>
              <ScrollArea className="h-[200px]">
                {typeof valueB === 'string' ? (
                  <pre className="whitespace-pre-wrap font-sans">{valueB || '(empty)'}</pre>
                ) : valueB}
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ArrowsLeftRight className="h-4 w-4" />
          Compare Versions
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowsLeftRight className="h-5 w-5" />
            A/B Version Comparison
          </DialogTitle>
          <DialogDescription>
            Compare two versions of your generated content side-by-side
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <SpinnerGap className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length < 2 ? (
          <div className="text-center py-12 space-y-4">
            <Info className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-muted-foreground">
                You need at least 2 saved versions to compare.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Save your current output to create a version, then regenerate to create another.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Version Selectors */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Version A</label>
                    <Select value={versionA || undefined} onValueChange={setVersionA}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select version A" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <div className="flex items-center gap-2">
                              {v.is_starred && <Star className="h-3 w-3 text-yellow-500" weight="fill" />}
                              {v.is_current && <Sparkle className="h-3 w-3 text-green-500" />}
                              {getVersionLabel(v)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-center pt-6">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Version B</label>
                    <Select value={versionB || undefined} onValueChange={setVersionB}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select version B" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <div className="flex items-center gap-2">
                              {v.is_starred && <Star className="h-3 w-3 text-yellow-500" weight="fill" />}
                              {v.is_current && <Sparkle className="h-3 w-3 text-green-500" />}
                              {getVersionLabel(v)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-6">
                    <Button
                      onClick={handleCompare}
                      disabled={!versionA || !versionB || versionA === versionB || isComparing}
                    >
                      {isComparing ? (
                        <>
                          <SpinnerGap className="h-4 w-4 animate-spin mr-2" />
                          Comparing...
                        </>
                      ) : (
                        'Compare'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Results */}
            <AnimatePresence mode="wait">
              {comparison && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Summary */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Comparison Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 flex-wrap">
                        <Badge variant={comparison.differences.length > 0 ? 'destructive' : 'secondary'}>
                          {comparison.differences.length} difference(s)
                        </Badge>
                        {comparison.differences.map((diff) => (
                          <Badge key={diff.field} variant="outline" className="text-xs">
                            {diff.field.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{comparison.summary}</p>
                    </CardContent>
                  </Card>

                  {/* Tabbed Comparison */}
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full justify-start">
                      <TabsTrigger value="description" className="gap-1">
                        <TextAlignLeft className="h-3 w-3" />
                        Description
                      </TabsTrigger>
                      <TabsTrigger value="timestamps" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Timestamps
                      </TabsTrigger>
                      <TabsTrigger value="hashtags" className="gap-1">
                        <Hash className="h-3 w-3" />
                        Hashtags
                      </TabsTrigger>
                      <TabsTrigger value="faq" className="gap-1">
                        <ChatCircleText className="h-3 w-3" />
                        FAQ
                      </TabsTrigger>
                      <TabsTrigger value="scores" className="gap-1">
                        <Star className="h-3 w-3" />
                        Scores
                      </TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[400px] mt-4">
                      <TabsContent value="description" className="m-0 p-4">
                        {renderContentComparison(
                          'description',
                          <TextAlignLeft className="h-4 w-4" />,
                          'Description',
                          (v) => v.description || ''
                        )}
                      </TabsContent>

                      <TabsContent value="timestamps" className="m-0 p-4">
                        {renderContentComparison(
                          'timestamps',
                          <Clock className="h-4 w-4" />,
                          'Timestamps',
                          (v) => v.timestamps || ''
                        )}
                      </TabsContent>

                      <TabsContent value="hashtags" className="m-0 p-4">
                        {renderContentComparison(
                          'hashtags',
                          <Hash className="h-4 w-4" />,
                          'Hashtags',
                          (v) => (
                            <div className="flex flex-wrap gap-1">
                              {(v.hashtags as string[] || []).map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {(!v.hashtags || (v.hashtags as string[]).length === 0) && (
                                <span className="text-muted-foreground">(no hashtags)</span>
                              )}
                            </div>
                          )
                        )}
                      </TabsContent>

                      <TabsContent value="faq" className="m-0 p-4">
                        {renderContentComparison(
                          'faq',
                          <ChatCircleText className="h-4 w-4" />,
                          'FAQ',
                          (v) => {
                            if (!v.faq) return '(no FAQ)'
                            if (typeof v.faq === 'string') return v.faq
                            return JSON.stringify(v.faq, null, 2)
                          }
                        )}
                      </TabsContent>

                      <TabsContent value="scores" className="m-0 p-4">
                        <div className="space-y-6">
                          {/* GEO Score Comparison */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4" />
                              <span className="font-medium">Final Score</span>
                              {renderDiffBadge('final_score', comparison.differences.some(d => d.field === 'final_score'))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-lg bg-muted/50 border text-center">
                                <div className="text-3xl font-bold">
                                  {comparison.versionA.final_score ?? 'N/A'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Version A Score
                                </div>
                              </div>
                              <div className="p-4 rounded-lg bg-muted/50 border text-center">
                                <div className="text-3xl font-bold">
                                  {comparison.versionB.final_score ?? 'N/A'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Version B Score
                                </div>
                              </div>
                            </div>

                            {/* Score Delta */}
                            {comparison.versionA.final_score != null && comparison.versionB.final_score != null && (
                              <div className="text-center">
                                {(() => {
                                  const delta = Number(comparison.versionB.final_score) - Number(comparison.versionA.final_score)
                                  const isPositive = delta > 0
                                  return (
                                    <Badge className={cn(
                                      isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                                      'text-sm'
                                    )}>
                                      {isPositive ? '+' : ''}{delta.toFixed(1)} points
                                    </Badge>
                                  )
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    </ScrollArea>
                  </Tabs>

                  {/* Action Buttons */}
                  {onRestore && (
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => handleRestore(comparison.versionA.id)}
                      >
                        Restore Version A
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleRestore(comparison.versionB.id)}
                      >
                        Restore Version B
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ABCompare
