'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Plus,
  Trash,
  SpinnerGap,
  CheckCircle,
  Prohibit,
  Globe,
  ArrowClockwise,
  PencilSimple,
  MagnifyingGlass,
  X,
  Info,
} from '@phosphor-icons/react'
import type { DomainBlacklistRow, BlacklistDomain } from '@/types/tuning'
import { cn } from '@/lib/utils'

interface BlacklistManagerProps {
  language: 'ko' | 'en'
  getAuthToken: () => Promise<string>
}

export function BlacklistManager({ language, getAuthToken }: BlacklistManagerProps) {
  const isKorean = language === 'ko'

  // State
  const [blacklists, setBlacklists] = useState<DomainBlacklistRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedBlacklist, setSelectedBlacklist] = useState<DomainBlacklistRow | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formVersion, setFormVersion] = useState('')
  const [formDomains, setFormDomains] = useState<BlacklistDomain[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [newReason, setNewReason] = useState('')
  const [domainSearch, setDomainSearch] = useState('')

  // Fetch blacklists
  const fetchBlacklists = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/tuning/blacklist', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      setBlacklists(data.blacklists || [])
    } catch (error) {
      console.error('Failed to fetch blacklists:', error)
      toast.error(isKorean ? '블랙리스트 로딩 실패' : 'Failed to load blacklists')
    } finally {
      setIsLoading(false)
    }
  }, [getAuthToken, isKorean])

  // Initial load
  useEffect(() => {
    fetchBlacklists()
  }, [fetchBlacklists])

  // Create blacklist
  const handleCreate = async () => {
    if (!formName.trim() || !formVersion.trim()) {
      toast.error(isKorean ? '이름과 버전을 입력하세요' : 'Name and version are required')
      return
    }

    setIsCreating(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/tuning/blacklist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formName.trim(),
          version: formVersion.trim(),
          domains: formDomains,
        }),
      })
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      toast.success(isKorean ? '블랙리스트 생성됨' : 'Blacklist created')
      setShowCreateDialog(false)
      resetForm()
      fetchBlacklists()
    } catch (error) {
      console.error('Failed to create blacklist:', error)
      toast.error(error instanceof Error ? error.message : (isKorean ? '생성 실패' : 'Failed to create'))
    } finally {
      setIsCreating(false)
    }
  }

  // Update blacklist
  const handleUpdate = async () => {
    if (!selectedBlacklist) return

    setIsUpdating(selectedBlacklist.id)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/tuning/blacklist', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedBlacklist.id,
          name: formName.trim(),
          version: formVersion.trim(),
          domains: formDomains,
        }),
      })
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      toast.success(isKorean ? '블랙리스트 업데이트됨' : 'Blacklist updated')
      setShowEditDialog(false)
      resetForm()
      fetchBlacklists()
    } catch (error) {
      console.error('Failed to update blacklist:', error)
      toast.error(error instanceof Error ? error.message : (isKorean ? '업데이트 실패' : 'Failed to update'))
    } finally {
      setIsUpdating(null)
    }
  }

  // Delete blacklist
  const handleDelete = async () => {
    if (!selectedBlacklist) return

    setIsUpdating(selectedBlacklist.id)
    try {
      const token = await getAuthToken()
      const response = await fetch(`/api/tuning/blacklist?id=${selectedBlacklist.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      toast.success(isKorean ? '블랙리스트 삭제됨' : 'Blacklist deleted')
      setShowDeleteDialog(false)
      setSelectedBlacklist(null)
      fetchBlacklists()
    } catch (error) {
      console.error('Failed to delete blacklist:', error)
      toast.error(error instanceof Error ? error.message : (isKorean ? '삭제 실패' : 'Failed to delete'))
    } finally {
      setIsUpdating(null)
    }
  }

  // Toggle active status
  const handleToggleActive = async (blacklist: DomainBlacklistRow) => {
    setIsUpdating(blacklist.id)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/tuning/blacklist', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: blacklist.id,
          is_active: !blacklist.is_active,
        }),
      })
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      toast.success(
        blacklist.is_active
          ? (isKorean ? '블랙리스트 비활성화됨' : 'Blacklist deactivated')
          : (isKorean ? '블랙리스트 활성화됨' : 'Blacklist activated')
      )
      fetchBlacklists()
    } catch (error) {
      console.error('Failed to toggle blacklist:', error)
      toast.error(error instanceof Error ? error.message : (isKorean ? '상태 변경 실패' : 'Failed to toggle status'))
    } finally {
      setIsUpdating(null)
    }
  }

  // Add domain to form
  const handleAddDomain = () => {
    const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    if (!domain) {
      toast.error(isKorean ? '도메인을 입력하세요' : 'Enter a domain')
      return
    }

    if (formDomains.some(d => d.domain === domain)) {
      toast.error(isKorean ? '이미 추가된 도메인입니다' : 'Domain already added')
      return
    }

    setFormDomains([
      ...formDomains,
      {
        domain,
        reason: newReason.trim() || undefined,
        added_at: new Date().toISOString(),
      },
    ])
    setNewDomain('')
    setNewReason('')
  }

  // Remove domain from form
  const handleRemoveDomain = (domain: string) => {
    setFormDomains(formDomains.filter(d => d.domain !== domain))
  }

  // Open edit dialog
  const openEditDialog = (blacklist: DomainBlacklistRow) => {
    setSelectedBlacklist(blacklist)
    setFormName(blacklist.name)
    setFormVersion(blacklist.version)
    setFormDomains([...blacklist.domains])
    setShowEditDialog(true)
  }

  // Reset form
  const resetForm = () => {
    setFormName('')
    setFormVersion('')
    setFormDomains([])
    setNewDomain('')
    setNewReason('')
    setDomainSearch('')
    setSelectedBlacklist(null)
  }

  // Filter domains in form
  const filteredFormDomains = domainSearch
    ? formDomains.filter(d =>
        d.domain.includes(domainSearch.toLowerCase()) ||
        (d.reason && d.reason.toLowerCase().includes(domainSearch.toLowerCase()))
      )
    : formDomains

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Prohibit className="h-5 w-5" />
            {isKorean ? '도메인 블랙리스트' : 'Domain Blacklist'}
          </CardTitle>
          <CardDescription>
            {isKorean
              ? '그라운딩에서 제외할 웹사이트를 관리합니다'
              : 'Manage websites to exclude from grounding'}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBlacklists}
            disabled={isLoading}
          >
            {isLoading ? (
              <SpinnerGap className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowClockwise className="h-4 w-4" />
            )}
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={(open) => {
            setShowCreateDialog(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {isKorean ? '새 블랙리스트' : 'New Blacklist'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {isKorean ? '새 블랙리스트 생성' : 'Create New Blacklist'}
                </DialogTitle>
                <DialogDescription>
                  {isKorean
                    ? '그라운딩에서 제외할 도메인 목록을 생성합니다'
                    : 'Create a list of domains to exclude from grounding'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Name and Version */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isKorean ? '이름' : 'Name'}</Label>
                    <Input
                      placeholder={isKorean ? '예: Production 블랙리스트' : 'e.g., Production Blacklist'}
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isKorean ? '버전' : 'Version'}</Label>
                    <Input
                      placeholder={isKorean ? '예: 1.0' : 'e.g., 1.0'}
                      value={formVersion}
                      onChange={(e) => setFormVersion(e.target.value)}
                    />
                  </div>
                </div>

                {/* Add Domain */}
                <div className="space-y-2">
                  <Label>{isKorean ? '도메인 추가' : 'Add Domain'}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={isKorean ? '도메인 (예: reddit.com)' : 'Domain (e.g., reddit.com)'}
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddDomain()
                        }
                      }}
                      className="flex-1"
                    />
                    <Input
                      placeholder={isKorean ? '사유 (선택)' : 'Reason (optional)'}
                      value={newReason}
                      onChange={(e) => setNewReason(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddDomain()
                        }
                      }}
                      className="flex-1"
                    />
                    <Button onClick={handleAddDomain} size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Domain List */}
                {formDomains.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>
                        {isKorean ? '도메인 목록' : 'Domain List'} ({formDomains.length})
                      </Label>
                      {formDomains.length > 5 && (
                        <div className="relative">
                          <MagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder={isKorean ? '검색...' : 'Search...'}
                            value={domainSearch}
                            onChange={(e) => setDomainSearch(e.target.value)}
                            className="h-8 pl-7 w-40 text-sm"
                          />
                        </div>
                      )}
                    </div>
                    <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                      {filteredFormDomains.map((d) => (
                        <div key={d.domain} className="flex items-center justify-between p-2 hover:bg-muted/50">
                          <div className="flex items-center gap-2 min-w-0">
                            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-mono text-sm truncate">{d.domain}</span>
                            {d.reason && (
                              <Badge variant="outline" className="text-xs truncate max-w-[150px]">
                                {d.reason}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveDomain(d.domain)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  {isKorean ? '취소' : 'Cancel'}
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <SpinnerGap className="h-4 w-4 animate-spin mr-2" />
                      {isKorean ? '생성 중...' : 'Creating...'}
                    </>
                  ) : (
                    isKorean ? '생성' : 'Create'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <SpinnerGap className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : blacklists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Info className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {isKorean ? '블랙리스트가 없습니다' : 'No blacklists found'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isKorean
                ? '새 블랙리스트를 생성하여 시작하세요'
                : 'Create a new blacklist to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {blacklists.map((blacklist) => (
              <div
                key={blacklist.id}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border transition-colors',
                  blacklist.is_active
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-card hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{blacklist.name}</span>
                      <Badge variant="outline" className="text-xs">
                        v{blacklist.version}
                      </Badge>
                      {blacklist.is_active && (
                        <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {isKorean ? '활성' : 'Active'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{blacklist.domains.length} {isKorean ? '도메인' : 'domains'}</span>
                      <span>•</span>
                      <span>{new Date(blacklist.created_at).toLocaleDateString(isKorean ? 'ko-KR' : 'en-US')}</span>
                    </div>
                    {/* Domain preview */}
                    {blacklist.domains.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        {blacklist.domains.slice(0, 3).map((d) => (
                          <Badge key={d.domain} variant="secondary" className="text-xs font-mono">
                            {d.domain}
                          </Badge>
                        ))}
                        {blacklist.domains.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{blacklist.domains.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={blacklist.is_active}
                            onCheckedChange={() => handleToggleActive(blacklist)}
                            disabled={isUpdating === blacklist.id}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isKorean ? (blacklist.is_active ? '비활성화' : '활성화') : (blacklist.is_active ? 'Deactivate' : 'Activate')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(blacklist)}
                  >
                    <PencilSimple className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setSelectedBlacklist(blacklist)
                      setShowDeleteDialog(true)
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isKorean ? '블랙리스트 편집' : 'Edit Blacklist'}
            </DialogTitle>
            <DialogDescription>
              {selectedBlacklist?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name and Version */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isKorean ? '이름' : 'Name'}</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{isKorean ? '버전' : 'Version'}</Label>
                <Input
                  value={formVersion}
                  onChange={(e) => setFormVersion(e.target.value)}
                />
              </div>
            </div>

            {/* Add Domain */}
            <div className="space-y-2">
              <Label>{isKorean ? '도메인 추가' : 'Add Domain'}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={isKorean ? '도메인 (예: reddit.com)' : 'Domain (e.g., reddit.com)'}
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddDomain()
                    }
                  }}
                  className="flex-1"
                />
                <Input
                  placeholder={isKorean ? '사유 (선택)' : 'Reason (optional)'}
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddDomain()
                    }
                  }}
                  className="flex-1"
                />
                <Button onClick={handleAddDomain} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Domain List */}
            {formDomains.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    {isKorean ? '도메인 목록' : 'Domain List'} ({formDomains.length})
                  </Label>
                  {formDomains.length > 5 && (
                    <div className="relative">
                      <MagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder={isKorean ? '검색...' : 'Search...'}
                        value={domainSearch}
                        onChange={(e) => setDomainSearch(e.target.value)}
                        className="h-8 pl-7 w-40 text-sm"
                      />
                    </div>
                  )}
                </div>
                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                  {filteredFormDomains.map((d) => (
                    <div key={d.domain} className="flex items-center justify-between p-2 hover:bg-muted/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-mono text-sm truncate">{d.domain}</span>
                        {d.reason && (
                          <Badge variant="outline" className="text-xs truncate max-w-[150px]">
                            {d.reason}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveDomain(d.domain)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {isKorean ? '취소' : 'Cancel'}
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating === selectedBlacklist?.id}>
              {isUpdating === selectedBlacklist?.id ? (
                <>
                  <SpinnerGap className="h-4 w-4 animate-spin mr-2" />
                  {isKorean ? '저장 중...' : 'Saving...'}
                </>
              ) : (
                isKorean ? '저장' : 'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isKorean ? '블랙리스트 삭제' : 'Delete Blacklist'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isKorean
                ? `"${selectedBlacklist?.name}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
                : `Are you sure you want to delete "${selectedBlacklist?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {isKorean ? '취소' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isUpdating === selectedBlacklist?.id}
            >
              {isUpdating === selectedBlacklist?.id ? (
                <>
                  <SpinnerGap className="h-4 w-4 animate-spin mr-2" />
                  {isKorean ? '삭제 중...' : 'Deleting...'}
                </>
              ) : (
                isKorean ? '삭제' : 'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
