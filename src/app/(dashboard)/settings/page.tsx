'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  User,
  Key,
  SpinnerGap,
  SignOut,
  Sun,
  Moon,
  Desktop,
  PaintBrush,
  Database,
  Upload,
  Trash,
  ArrowClockwise,
  File,
  FilePdf,
  FileDoc,
  FileText,
  CloudArrowUp,
  Warning,
  CheckCircle,
  Info,
  Globe,
  Sparkle,
  MagnifyingGlass,
  CaretDown,
  CaretRight,
  CubeTransparent,
  Prohibit,
} from '@phosphor-icons/react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Language } from '@/lib/i18n'
import { PromptFlowDiagram, type NodeId } from '@/components/settings/prompt-flow-diagram'
import { PromptEditorPanel } from '@/components/settings/prompt-editor-panel'
import { PromptList } from '@/components/settings/prompt-list'
import { BlacklistManager } from '@/components/settings/blacklist-manager'

interface PlaybookDocument {
  id: string
  name: string
  section: string | null
  productCategory: string | null
  status: 'processing' | 'completed' | 'failed'
  totalChunks: number
  uploadedAt: string
}

interface PineconeStats {
  configured: boolean
  indexName?: string
  namespace?: string
  totalRecords?: number
  namespaceRecords?: number
  dimension?: number
  indexFullness?: number
  namespaces?: string[]
  error?: string
}

interface VectorRecord {
  id: string
  metadata: Record<string, unknown>
  values?: number[]
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { t, language, setLanguage } = useTranslation()

  // User state
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Theme
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Playbook management state
  const [documents, setDocuments] = useState<PlaybookDocument[]>([])
  const [pineconeStats, setPineconeStats] = useState<PineconeStats | null>(null)
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // Vector viewer state
  const [vectors, setVectors] = useState<VectorRecord[]>([])
  const [isLoadingVectors, setIsLoadingVectors] = useState(false)
  const [vectorsPaginationToken, setVectorsPaginationToken] = useState<string | null>(null)
  const [vectorsPrefix, setVectorsPrefix] = useState('')
  const [expandedVectorId, setExpandedVectorId] = useState<string | null>(null)

  // Prompts tab state
  const [selectedPromptNode, setSelectedPromptNode] = useState<NodeId | null>(null)
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [selectedEngine, setSelectedEngine] = useState<'gemini' | 'perplexity' | 'cohere' | null>(null)

  // Prevent hydration mismatch for theme
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setIsLoading(false)
    }
    getUser()
  }, [supabase])

  // Get auth token for API calls
  const getAuthToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }, [supabase])

  // Fetch playbook documents
  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocs(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/playbook/ingest', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.documents) {
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      toast.error(t.errors.loadFailed)
    } finally {
      setIsLoadingDocs(false)
    }
  }, [getAuthToken, t.errors.loadFailed])

  // Fetch Pinecone stats
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/playbook/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()
      setPineconeStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      setPineconeStats({ configured: false, error: t.errors.loadFailed })
    } finally {
      setIsLoadingStats(false)
    }
  }, [getAuthToken, t.errors.loadFailed])

  // Fetch vectors with metadata
  const fetchVectors = useCallback(async (prefix?: string, paginationToken?: string) => {
    setIsLoadingVectors(true)
    try {
      const token = await getAuthToken()
      const params = new URLSearchParams()
      if (prefix) params.set('prefix', prefix)
      if (paginationToken) params.set('paginationToken', paginationToken)
      params.set('limit', '20')

      const response = await fetch(`/api/playbook/vectors?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      if (paginationToken) {
        // Append to existing vectors
        setVectors(prev => [...prev, ...(data.vectors || [])])
      } else {
        // Replace vectors
        setVectors(data.vectors || [])
      }
      setVectorsPaginationToken(data.pagination?.next || null)
    } catch (error) {
      console.error('Failed to fetch vectors:', error)
      toast.error(t.errors.loadFailed)
    } finally {
      setIsLoadingVectors(false)
    }
  }, [getAuthToken, t.errors.loadFailed])

  // Upload document
  const handleUpload = async (file: File) => {
    setIsUploading(true)
    try {
      const token = await getAuthToken()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentName', file.name)

      const response = await fetch('/api/playbook/ingest', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || t.errors.uploadFailed)
      }

      toast.success(t.settings.playbook.uploadSuccess)
      fetchDocuments()
      fetchStats()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : t.settings.playbook.uploadError)
    } finally {
      setIsUploading(false)
    }
  }

  // Delete document
  const handleDelete = async (documentId: string, documentName: string) => {
    if (!confirm(t.settings.playbook.deleteConfirm)) {
      return
    }

    setIsDeletingId(documentId)
    try {
      const token = await getAuthToken()
      const response = await fetch(`/api/playbook/ingest?documentId=${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || t.errors.deleteFailed)
      }

      toast.success(t.success.deleted)
      fetchDocuments()
      fetchStats()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : t.errors.deleteFailed)
    } finally {
      setIsDeletingId(null)
    }
  }

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const validTypes = ['.pdf', '.docx', '.txt', '.md']
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()

      if (validTypes.includes(fileExt)) {
        handleUpload(file)
      } else {
        toast.error(t.errors.unsupportedFormat)
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0])
    }
  }

  // Get file icon based on extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return <FilePdf className="h-5 w-5 text-red-500" />
      case 'docx':
      case 'doc':
        return <FileDoc className="h-5 w-5 text-blue-500" />
      case 'txt':
      case 'md':
        return <FileText className="h-5 w-5 text-gray-500" />
      default:
        return <File className="h-5 w-5 text-gray-500" />
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t.errors.invalidPassword)
      return
    }

    if (newPassword.length < 8) {
      toast.error(t.errors.invalidPassword)
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      toast.success(t.success.updated)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errors.saveFailed)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    toast.success(t.success.saved)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <SpinnerGap className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.settings.title}</h1>
        <p className="text-muted-foreground mt-1">
          {t.settings.subtitle}
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t.settings.tabs.profile}</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <PaintBrush className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'ko' ? '환경설정' : 'Preferences'}</span>
          </TabsTrigger>
          <TabsTrigger value="prompts" className="gap-2">
            <Sparkle className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'ko' ? '프롬프트' : 'Prompts'}</span>
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <Prohibit className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'ko' ? '소스 관리' : 'Sources'}</span>
          </TabsTrigger>
          <TabsTrigger
            value="playbook"
            className="gap-2"
            onClick={() => {
              if (documents.length === 0 && !isLoadingDocs) {
                fetchDocuments()
              }
              if (!pineconeStats && !isLoadingStats) {
                fetchStats()
              }
            }}
          >
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">{t.settings.tabs.playbook}</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t.settings.profile.title}
              </CardTitle>
              <CardDescription>
                {t.settings.profile.subtitle}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t.settings.profile.email}</Label>
                <Input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {language === 'ko'
                    ? '이메일은 변경할 수 없습니다. 지원팀에 문의하세요.'
                    : 'Email cannot be changed. Contact support for assistance.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{language === 'ko' ? '사용자 ID' : 'User ID'}</Label>
                <Input
                  type="text"
                  value={user?.id || ''}
                  disabled
                  className="bg-muted font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ko' ? '계정 생성일' : 'Account Created'}</Label>
                <Input
                  type="text"
                  value={user?.created_at ? new Date(user.created_at).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : ''}
                  disabled
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {language === 'ko' ? '비밀번호 변경' : 'Change Password'}
              </CardTitle>
              <CardDescription>
                {language === 'ko' ? '계정 비밀번호를 업데이트합니다' : 'Update your account password'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{language === 'ko' ? '새 비밀번호' : 'New Password'}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={language === 'ko' ? '새 비밀번호 입력' : 'Enter new password'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">{language === 'ko' ? '새 비밀번호 확인' : 'Confirm New Password'}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={language === 'ko' ? '새 비밀번호 확인' : 'Confirm new password'}
                />
              </div>

              <Button
                onClick={handlePasswordChange}
                disabled={isSaving || !newPassword || !confirmPassword}
              >
                {isSaving ? (
                  <>
                    <SpinnerGap className="h-4 w-4 animate-spin mr-2" />
                    {language === 'ko' ? '업데이트 중...' : 'Updating...'}
                  </>
                ) : (
                  language === 'ko' ? '비밀번호 업데이트' : 'Update Password'
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <SignOut className="h-5 w-5" />
                {t.auth.signOut}
              </CardTitle>
              <CardDescription>
                {language === 'ko' ? '이 기기에서 로그아웃합니다' : 'Sign out of your account on this device'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleSignOut}>
                <SignOut className="h-4 w-4 mr-2" />
                {t.auth.signOut}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab - Combined Appearance & Language */}
        <TabsContent value="preferences" className="space-y-6">
          {/* Theme Selection - Compact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PaintBrush className="h-4 w-4" />
                {t.settings.appearance.theme}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant={mounted && theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                  className="gap-2"
                >
                  <Sun className="h-4 w-4" weight="fill" />
                  {t.settings.appearance.themeLight}
                </Button>
                <Button
                  variant={mounted && theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className="gap-2"
                >
                  <Moon className="h-4 w-4" weight="fill" />
                  {t.settings.appearance.themeDark}
                </Button>
                <Button
                  variant={mounted && theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('system')}
                  className="gap-2"
                >
                  <Desktop className="h-4 w-4" weight="fill" />
                  {t.settings.appearance.themeSystem}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Language Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t.settings.language.title}
              </CardTitle>
              <CardDescription>
                {t.settings.language.subtitle}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleLanguageChange('ko')}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                    language === 'ko'
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <div className="font-medium">{t.settings.language.korean}</div>
                    <div className="text-xs text-muted-foreground">Korean</div>
                  </div>
                </button>

                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all hover:border-primary/50 ${
                    language === 'en'
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <div className="font-medium">{t.settings.language.english}</div>
                    <div className="text-xs text-muted-foreground">English</div>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompts Tab */}
        <TabsContent value="prompts" className="space-y-6">
          {/* Visual Flow Diagram */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkle className="h-5 w-5" />
                {language === 'ko' ? 'AI 생성 파이프라인' : 'AI Generation Pipeline'}
              </CardTitle>
              <CardDescription>
                {language === 'ko'
                  ? '각 노드를 클릭하여 프롬프트를 편집할 수 있습니다'
                  : 'Click on any node to edit its prompt'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PromptFlowDiagram
                onNodeClick={(nodeId) => {
                  setSelectedPromptNode(nodeId)
                  setShowPromptEditor(true)
                  // Map node to engine
                  if (nodeId === 'grounding') {
                    setSelectedEngine('perplexity')
                  } else if (nodeId === 'rag') {
                    setSelectedEngine('cohere')
                  } else {
                    setSelectedEngine('gemini')
                  }
                }}
                selectedNode={selectedPromptNode}
                language={language}
              />
            </CardContent>
          </Card>

          {/* Prompt List and Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Prompt List - Left Side */}
            <div className="lg:col-span-1">
              <PromptList
                language={language}
                getAuthToken={getAuthToken}
                onSelectPrompt={(engine) => {
                  setSelectedEngine(engine)
                  setShowPromptEditor(true)
                  // Map engine to node
                  if (engine === 'perplexity') {
                    setSelectedPromptNode('grounding')
                  } else if (engine === 'cohere') {
                    setSelectedPromptNode('rag')
                  } else {
                    setSelectedPromptNode('description')
                  }
                }}
                selectedEngine={selectedEngine}
              />
            </div>

            {/* Prompt Editor Panel - Right Side */}
            <div className="lg:col-span-2">
              {showPromptEditor && selectedEngine ? (
                <PromptEditorPanel
                  language={language}
                  getAuthToken={getAuthToken}
                  selectedEngine={selectedEngine}
                  selectedNode={selectedPromptNode}
                  onClose={() => {
                    setShowPromptEditor(false)
                    setSelectedPromptNode(null)
                    setSelectedEngine(null)
                  }}
                />
              ) : (
                <Card className="h-full min-h-[400px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Sparkle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">
                      {language === 'ko' ? '프롬프트를 선택하세요' : 'Select a prompt to edit'}
                    </p>
                    <p className="text-sm mt-1">
                      {language === 'ko'
                        ? '왼쪽 목록이나 위의 플로우 다이어그램에서 선택'
                        : 'Choose from the list or flow diagram above'}
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-6">
          <BlacklistManager
            language={language}
            getAuthToken={getAuthToken}
          />
        </TabsContent>

        {/* Playbook Tab */}
        <TabsContent value="playbook" className="space-y-6">
          {/* Pinecone Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                {t.settings.playbook.vectorDatabase}
              </CardTitle>
              <CardDescription>
                {t.settings.playbook.subtitle}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <SpinnerGap className="h-4 w-4 animate-spin" />
                  {t.common.loading}
                </div>
              ) : pineconeStats ? (
                pineconeStats.configured ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">{t.settings.playbook.indexName}</div>
                      <div className="font-mono text-sm font-medium mt-1">{pineconeStats.indexName}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">{t.settings.playbook.namespace}</div>
                      <div className="font-mono text-sm font-medium mt-1">{pineconeStats.namespace}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">{t.settings.playbook.totalRecords}</div>
                      <div className="text-2xl font-bold mt-1">{pineconeStats.namespaceRecords?.toLocaleString() || 0}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">{t.settings.playbook.dimension}</div>
                      <div className="text-2xl font-bold mt-1">{pineconeStats.dimension || 'N/A'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600">
                    <Warning className="h-5 w-5" />
                    <span>{pineconeStats.error || t.settings.playbook.notConfigured}</span>
                  </div>
                )
              ) : (
                <Button variant="outline" onClick={fetchStats}>
                  <ArrowClockwise className="h-4 w-4 mr-2" />
                  {language === 'ko' ? '통계 불러오기' : 'Load Stats'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Upload Card - Only show when no vectors exist */}
          {(!pineconeStats?.namespaceRecords || pineconeStats.namespaceRecords === 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {t.settings.playbook.uploadPlaybook}
                </CardTitle>
                <CardDescription>
                  {language === 'ko'
                    ? 'PDF, DOCX, TXT, MD 파일을 업로드하여 플레이북 벡터 데이터베이스에 추가'
                    : 'Upload PDF, DOCX, TXT, or MD files to add to the playbook vector database'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <SpinnerGap className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-muted-foreground">{t.tuning.upload.processing}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <CloudArrowUp className="h-10 w-10 text-muted-foreground" />
                      <p className="font-medium">{t.common.dragAndDrop}</p>
                      <p className="text-sm text-muted-foreground">
                        {t.tuning.upload.supportedFormats}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents List Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <File className="h-5 w-5" />
                  {t.settings.playbook.documents}
                </CardTitle>
                <CardDescription>
                  {language === 'ko'
                    ? '벡터 데이터베이스에 저장된 문서'
                    : 'Documents currently stored in the vector database'}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchDocuments()
                  fetchStats()
                }}
                disabled={isLoadingDocs}
              >
                {isLoadingDocs ? (
                  <SpinnerGap className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowClockwise className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">{t.common.refresh}</span>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingDocs ? (
                <div className="flex items-center justify-center py-8">
                  <SpinnerGap className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Info className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">{t.settings.playbook.noDocuments}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ko'
                      ? '위에서 문서를 업로드하여 시작하세요'
                      : 'Upload a document above to get started'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getFileIcon(doc.name)}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{doc.totalChunks} {language === 'ko' ? '청크' : 'chunks'}</span>
                            {doc.section && (
                              <>
                                <span>•</span>
                                <span>{doc.section}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{new Date(doc.uploadedAt).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {doc.status === 'processing' && (
                          <SpinnerGap className="h-4 w-4 animate-spin text-primary" />
                        )}
                        {doc.status === 'failed' && (
                          <Warning className="h-4 w-4 text-red-500" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(doc.id, doc.name)}
                          disabled={isDeletingId === doc.id}
                        >
                          {isDeletingId === doc.id ? (
                            <SpinnerGap className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vector Viewer Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CubeTransparent className="h-5 w-5" />
                  {language === 'ko' ? '벡터 데이터 뷰어' : 'Vector Data Viewer'}
                </CardTitle>
                <CardDescription>
                  {language === 'ko'
                    ? 'Pinecone에 저장된 벡터와 메타데이터를 확인합니다'
                    : 'View vectors and metadata stored in Pinecone'}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchVectors(vectorsPrefix)}
                disabled={isLoadingVectors}
              >
                {isLoadingVectors ? (
                  <SpinnerGap className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowClockwise className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">{t.common.refresh}</span>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search/Filter Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={language === 'ko' ? '접두사로 검색 (예: doc_)' : 'Filter by prefix (e.g., doc_)'}
                    value={vectorsPrefix}
                    onChange={(e) => setVectorsPrefix(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        fetchVectors(vectorsPrefix)
                      }
                    }}
                    className="pl-9"
                  />
                </div>
                <Button
                  onClick={() => fetchVectors(vectorsPrefix)}
                  disabled={isLoadingVectors}
                >
                  {language === 'ko' ? '검색' : 'Search'}
                </Button>
              </div>

              {/* Vectors List */}
              {isLoadingVectors && vectors.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <SpinnerGap className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : vectors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CubeTransparent className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    {language === 'ko' ? '벡터가 없습니다' : 'No vectors found'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ko'
                      ? '새로고침을 클릭하여 벡터를 불러오세요'
                      : 'Click refresh to load vectors'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {vectors.map((vector) => (
                    <div
                      key={vector.id}
                      className="border rounded-lg bg-card"
                    >
                      {/* Vector Header */}
                      <button
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedVectorId(
                          expandedVectorId === vector.id ? null : vector.id
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {expandedVectorId === vector.id ? (
                            <CaretDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <CaretRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <code className="text-sm font-mono truncate">{vector.id}</code>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {Object.keys(vector.metadata).length} {language === 'ko' ? '필드' : 'fields'}
                        </span>
                      </button>

                      {/* Expanded Metadata */}
                      {expandedVectorId === vector.id && (
                        <div className="border-t p-3 bg-muted/30">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            {language === 'ko' ? '메타데이터' : 'Metadata'}
                          </div>
                          <div className="space-y-1.5">
                            {Object.entries(vector.metadata).map(([key, value]) => (
                              <div key={key} className="flex gap-2 text-sm">
                                <span className="font-mono text-muted-foreground min-w-[120px] flex-shrink-0">
                                  {key}:
                                </span>
                                <span className="font-mono break-all">
                                  {typeof value === 'object'
                                    ? JSON.stringify(value, null, 2)
                                    : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {'content' in vector.metadata && Boolean(vector.metadata.content) && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs font-medium text-muted-foreground mb-2">
                                {language === 'ko' ? '콘텐츠 미리보기' : 'Content Preview'}
                              </div>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-5">
                                {String(vector.metadata.content).slice(0, 500)}
                                {String(vector.metadata.content).length > 500 && '...'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Load More Button */}
                  {vectorsPaginationToken && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => fetchVectors(vectorsPrefix, vectorsPaginationToken)}
                      disabled={isLoadingVectors}
                    >
                      {isLoadingVectors ? (
                        <>
                          <SpinnerGap className="h-4 w-4 animate-spin mr-2" />
                          {language === 'ko' ? '불러오는 중...' : 'Loading...'}
                        </>
                      ) : (
                        language === 'ko' ? '더 보기' : 'Load More'
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Vector Count */}
              {vectors.length > 0 && (
                <div className="text-sm text-muted-foreground text-center">
                  {language === 'ko'
                    ? `${vectors.length}개 벡터 표시됨`
                    : `Showing ${vectors.length} vectors`}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
