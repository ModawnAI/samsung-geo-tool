# Samsung GEO/AEO Tool - Implementation Plan

## Comprehensive Feature Gap Analysis and Development Roadmap

---

# EXECUTIVE SUMMARY

## Current State Assessment

The Samsung GEO/AEO Content Optimizer has a solid foundation with core content generation capabilities implemented. This document identifies gaps between the requirements specification and current implementation, providing detailed implementation plans for each missing feature.

### Current Implementation Status

| Phase | Target Features | Implemented | Partial | Missing | Completion |
|-------|----------------|-------------|---------|---------|------------|
| Phase 1 - Tuning Console | 12 | 1 | 5 | 6 | 29% |
| Phase 2 - Production Service | 11 | 3 | 5 | 3 | 50% |
| Phase 3 - Advanced Analytics | 12 | 0 | 2 | 10 | 8% |
| **Total** | **35** | **4** | **12** | **19** | **29%** |

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.1 with App Router |
| Language | TypeScript 5.x |
| Database | Supabase (PostgreSQL) |
| Vector DB | Pinecone with `multilingual-e5-large` |
| AI Models | Google Gemini (generation), Cohere (reranking), Perplexity (grounding) |
| State | Zustand (client-side) |
| UI | shadcn/ui + Phosphor Icons |

---

# PART 0: NAVIGATION & CROSS-CUTTING ARCHITECTURE

This section defines the foundational architectural patterns that apply across all phases. These specifications must be implemented before or alongside Phase 1 development.

## 0.1 Navigation Architecture

### Current State Analysis

The current application has a flat 4-item navigation structure:

```typescript
// Current: src/components/features/dashboard-nav.tsx
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: ChartBar },
  { href: '/generate', label: 'Generate', icon: Sparkle },
  { href: '/history', label: 'History', icon: ClockCounterClockwise },
  { href: '/briefs', label: 'Briefs', icon: FileText },
]
```

**Problem**: Cannot accommodate 12+ new routes across tuning/analytics/reports without UX degradation.

### Tiered Navigation Design

Implement a tiered navigation structure that maintains mobile compatibility (max 4-5 primary items) while providing access to all features.

```typescript
// src/components/features/navigation/nav-config.ts
import {
  ChartBar,
  Sparkle,
  FolderOpen,
  Wrench,
  ClockCounterClockwise,
  FileText,
  Sliders,
  CloudArrowUp,
  TextAa,
  FlaskConical,
  ListChecks,
  ChartLine,
  UsersThree,
  Eye,
  Export,
  Gear,
} from '@phosphor-icons/react'

export interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; weight?: 'regular' | 'fill' }>
  children?: NavItem[]
  phase?: 1 | 2 | 3  // Feature flag by phase
  badge?: string     // For notifications/counts
}

export const primaryNavItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: ChartBar,
  },
  {
    href: '/generate',
    label: 'Create',
    icon: Sparkle,
  },
  {
    href: '/content',
    label: 'Content',
    icon: FolderOpen,
    children: [
      { href: '/history', label: 'History', icon: ClockCounterClockwise },
      { href: '/briefs', label: 'Briefs', icon: FileText },
    ],
  },
  {
    href: '/tools',
    label: 'Tools',
    icon: Wrench,
    children: [
      // Phase 1 - Tuning Console
      { href: '/tuning', label: 'Tuning Console', icon: Sliders, phase: 1,
        children: [
          { href: '/tuning/upload', label: 'Bulk Upload', icon: CloudArrowUp },
          { href: '/tuning/prompts', label: 'Prompt Manager', icon: TextAa },
          { href: '/tuning/weights', label: 'Weight Controller', icon: Sliders },
          { href: '/tuning/batch', label: 'Batch Runner', icon: FlaskConical },
          { href: '/tuning/validation', label: 'Validation', icon: ListChecks },
        ]
      },
      // Phase 3 - Analytics
      { href: '/analytics', label: 'Analytics', icon: ChartLine, phase: 3,
        children: [
          { href: '/analytics/competitors', label: 'Competitors', icon: UsersThree },
          { href: '/analytics/exposure', label: 'AI Exposure', icon: Eye },
        ]
      },
      // Phase 3 - Reports
      { href: '/reports', label: 'Export Center', icon: Export, phase: 3 },
    ],
  },
]

export const userMenuItems: NavItem[] = [
  { href: '/dashboard/playbook', label: 'Marketing Playbook', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Gear },
]
```

### Desktop Navigation Component

```typescript
// src/components/features/navigation/desktop-nav.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { CaretDown } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { primaryNavItems, type NavItem } from './nav-config'
import { useFeatureFlags } from '@/hooks/use-feature-flags'

export function DesktopNav() {
  const pathname = usePathname()
  const { isPhaseEnabled } = useFeatureFlags()

  const isActive = (item: NavItem): boolean => {
    if (pathname === item.href) return true
    if (item.children?.some(child => isActive(child))) return true
    return false
  }

  const filterByPhase = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      if (item.phase && !isPhaseEnabled(item.phase)) return false
      if (item.children) {
        item.children = filterByPhase(item.children)
      }
      return true
    })
  }

  const visibleItems = filterByPhase(primaryNavItems)

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon
    const active = isActive(item)

    if (item.children && item.children.length > 0) {
      return (
        <DropdownMenu key={item.href}>
          <DropdownMenuTrigger
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
            <CaretDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {item.children.map(child => renderDropdownItem(child))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          active
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="h-4 w-4" />
        {item.label}
      </Link>
    )
  }

  const renderDropdownItem = (item: NavItem) => {
    const Icon = item.icon
    const active = pathname === item.href

    if (item.children && item.children.length > 0) {
      return (
        <DropdownMenuSub key={item.href}>
          <DropdownMenuSubTrigger className={cn(active && 'bg-muted')}>
            <Icon className="h-4 w-4 mr-2" />
            {item.label}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {item.children.map(child => renderDropdownItem(child))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )
    }

    return (
      <DropdownMenuItem key={item.href} asChild>
        <Link href={item.href} className={cn('flex items-center', active && 'bg-muted')}>
          <Icon className="h-4 w-4 mr-2" />
          {item.label}
        </Link>
      </DropdownMenuItem>
    )
  }

  return (
    <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
      {visibleItems.map(renderNavItem)}
    </nav>
  )
}
```

### Mobile Navigation Updates

```typescript
// src/components/features/navigation/mobile-nav.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { CaretRight, CaretLeft } from '@phosphor-icons/react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { primaryNavItems, type NavItem } from './nav-config'
import { useFeatureFlags } from '@/hooks/use-feature-flags'

interface MobileNavSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileNavSheet({ open, onOpenChange }: MobileNavSheetProps) {
  const pathname = usePathname()
  const { isPhaseEnabled } = useFeatureFlags()
  const [navStack, setNavStack] = useState<NavItem[][]>([primaryNavItems])
  const [titleStack, setTitleStack] = useState<string[]>(['Menu'])

  const currentItems = navStack[navStack.length - 1]
  const currentTitle = titleStack[titleStack.length - 1]
  const canGoBack = navStack.length > 1

  const filterByPhase = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      if (item.phase && !isPhaseEnabled(item.phase)) return false
      return true
    })
  }

  const navigateToChildren = (item: NavItem) => {
    if (item.children && item.children.length > 0) {
      setNavStack([...navStack, filterByPhase(item.children)])
      setTitleStack([...titleStack, item.label])
    }
  }

  const navigateBack = () => {
    if (canGoBack) {
      setNavStack(navStack.slice(0, -1))
      setTitleStack(titleStack.slice(0, -1))
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset navigation state after animation
    setTimeout(() => {
      setNavStack([primaryNavItems])
      setTitleStack(['Menu'])
    }, 300)
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            {canGoBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={navigateBack}
                className="h-8 w-8"
              >
                <CaretLeft className="h-4 w-4" />
              </Button>
            )}
            {currentTitle}
          </SheetTitle>
        </SheetHeader>

        <nav className="p-2" aria-label="Mobile navigation">
          {filterByPhase(currentItems).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const hasChildren = item.children && item.children.length > 0

            if (hasChildren) {
              return (
                <button
                  key={item.href}
                  onClick={() => navigateToChildren(item)}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-3 rounded-lg text-base font-medium transition-colors',
                    'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </span>
                  <CaretRight className="h-4 w-4" />
                </button>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

// Mobile Bottom Nav - Keep 4 primary items only
export function MobileBottomNav() {
  const pathname = usePathname()

  // Only show top-level items without children for bottom nav
  const bottomNavItems = primaryNavItems.filter(item => !item.children).slice(0, 4)

  // If we have less than 4, add the first items with children as entry points
  const itemsWithChildren = primaryNavItems.filter(item => item.children)
  while (bottomNavItems.length < 4 && itemsWithChildren.length > 0) {
    bottomNavItems.push(itemsWithChildren.shift()!)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden"
      aria-label="Mobile bottom navigation"
    >
      <div className="flex items-center justify-around h-16">
        {bottomNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon
                className={cn('h-5 w-5', isActive && 'fill-current')}
                weight={isActive ? 'fill' : 'regular'}
              />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

### Feature Flags Hook

```typescript
// src/hooks/use-feature-flags.ts
import { useMemo } from 'react'

interface FeatureFlags {
  phase1Enabled: boolean
  phase2Enabled: boolean
  phase3Enabled: boolean
}

const defaultFlags: FeatureFlags = {
  phase1Enabled: true,   // Enable after Phase 1 deployment
  phase2Enabled: false,  // Enable after Phase 2 deployment
  phase3Enabled: false,  // Enable after Phase 3 deployment
}

export function useFeatureFlags() {
  const flags = useMemo(() => {
    // In production, fetch from environment or feature flag service
    if (typeof window !== 'undefined') {
      return {
        phase1Enabled: process.env.NEXT_PUBLIC_PHASE1_ENABLED === 'true' || defaultFlags.phase1Enabled,
        phase2Enabled: process.env.NEXT_PUBLIC_PHASE2_ENABLED === 'true' || defaultFlags.phase2Enabled,
        phase3Enabled: process.env.NEXT_PUBLIC_PHASE3_ENABLED === 'true' || defaultFlags.phase3Enabled,
      }
    }
    return defaultFlags
  }, [])

  const isPhaseEnabled = (phase: 1 | 2 | 3): boolean => {
    switch (phase) {
      case 1: return flags.phase1Enabled
      case 2: return flags.phase2Enabled
      case 3: return flags.phase3Enabled
      default: return false
    }
  }

  return { ...flags, isPhaseEnabled }
}
```

---

## 0.2 Protected Routes Configuration

### Middleware Update Required

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// All protected route prefixes
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/generate',
  '/history',
  '/briefs',
  '/tuning',      // Phase 1
  '/analytics',   // Phase 3
  '/reports',     // Phase 3
  '/settings',
  '/content',
  '/tools',
]

// Routes that require specific phases to be enabled
const PHASE_PROTECTED_ROUTES: Record<string, 1 | 2 | 3> = {
  '/tuning': 1,
  '/analytics': 3,
  '/reports': 3,
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Check if route is protected
  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )

  // Redirect to login if not authenticated on protected routes
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Check phase-specific access (optional - for gradual rollout)
  for (const [routePrefix, requiredPhase] of Object.entries(PHASE_PROTECTED_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      const phaseEnabled = process.env[`NEXT_PUBLIC_PHASE${requiredPhase}_ENABLED`] === 'true'
      if (!phaseEnabled) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  // Redirect logged-in users from login page to dashboard
  if (pathname === '/login' && user) {
    const redirect = request.nextUrl.searchParams.get('redirect')
    const url = request.nextUrl.clone()
    url.pathname = redirect || '/dashboard'
    url.searchParams.delete('redirect')
    return NextResponse.redirect(url)
  }

  // Redirect root to dashboard if logged in, login if not
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = user ? '/dashboard' : '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

---

## 0.3 State Management Architecture

### Zustand Store Definitions

All new features require dedicated Zustand stores following the existing pattern of selective subscriptions.

```typescript
// src/stores/tuning-store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// Types
interface Prompt {
  id: string
  name: string
  version: string
  engine: 'gemini' | 'perplexity' | 'cohere'
  systemPrompt: string
  isActive: boolean
  performanceScore?: number
}

interface ScoringWeights {
  keyword_density: { max: number; weight: number }
  ai_exposure: { max: number; weight: number }
  question_patterns: { max: number; weight: number }
  sentence_structure: { max: number; weight: number }
  length_compliance: { max: number; weight: number }
}

interface BatchJob {
  id: string
  name: string
  type: 'score_validation' | 'content_generation' | 'bulk_import'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  totalItems: number
  processedItems: number
  failedItems: number
  estimatedCost?: number
  actualCost?: number
  startedAt?: Date
  completedAt?: Date
}

interface TuningState {
  // Prompts
  prompts: Prompt[]
  activePromptId: string | null
  promptDraft: Partial<Prompt> | null

  // Weights
  weights: ScoringWeights
  weightsModified: boolean

  // Batch Jobs
  batchJobs: BatchJob[]
  activeBatchId: string | null

  // Upload
  uploadProgress: number
  uploadedFiles: File[]
  parsedData: Record<string, unknown>[] | null

  // Actions - Prompts
  setPrompts: (prompts: Prompt[]) => void
  setActivePrompt: (id: string | null) => void
  updatePromptDraft: (draft: Partial<Prompt>) => void
  clearPromptDraft: () => void

  // Actions - Weights
  setWeights: (weights: ScoringWeights) => void
  updateWeight: (key: keyof ScoringWeights, value: { max?: number; weight?: number }) => void
  resetWeights: () => void

  // Actions - Batch
  addBatchJob: (job: BatchJob) => void
  updateBatchJob: (id: string, updates: Partial<BatchJob>) => void
  setActiveBatch: (id: string | null) => void
  removeBatchJob: (id: string) => void

  // Actions - Upload
  setUploadProgress: (progress: number) => void
  setUploadedFiles: (files: File[]) => void
  setParsedData: (data: Record<string, unknown>[] | null) => void
  clearUpload: () => void

  // Reset
  reset: () => void
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  keyword_density: { max: 15, weight: 1.0 },
  ai_exposure: { max: 35, weight: 1.0 },
  question_patterns: { max: 20, weight: 1.0 },
  sentence_structure: { max: 15, weight: 1.0 },
  length_compliance: { max: 15, weight: 1.0 },
}

export const useTuningStore = create<TuningState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        prompts: [],
        activePromptId: null,
        promptDraft: null,
        weights: DEFAULT_WEIGHTS,
        weightsModified: false,
        batchJobs: [],
        activeBatchId: null,
        uploadProgress: 0,
        uploadedFiles: [],
        parsedData: null,

        // Prompt Actions
        setPrompts: (prompts) => set({ prompts }),
        setActivePrompt: (id) => set({ activePromptId: id }),
        updatePromptDraft: (draft) => set({ promptDraft: { ...get().promptDraft, ...draft } }),
        clearPromptDraft: () => set({ promptDraft: null }),

        // Weight Actions
        setWeights: (weights) => set({ weights, weightsModified: false }),
        updateWeight: (key, value) => set({
          weights: {
            ...get().weights,
            [key]: { ...get().weights[key], ...value }
          },
          weightsModified: true,
        }),
        resetWeights: () => set({ weights: DEFAULT_WEIGHTS, weightsModified: false }),

        // Batch Actions
        addBatchJob: (job) => set({ batchJobs: [...get().batchJobs, job] }),
        updateBatchJob: (id, updates) => set({
          batchJobs: get().batchJobs.map(j => j.id === id ? { ...j, ...updates } : j)
        }),
        setActiveBatch: (id) => set({ activeBatchId: id }),
        removeBatchJob: (id) => set({
          batchJobs: get().batchJobs.filter(j => j.id !== id)
        }),

        // Upload Actions
        setUploadProgress: (progress) => set({ uploadProgress: progress }),
        setUploadedFiles: (files) => set({ uploadedFiles: files }),
        setParsedData: (data) => set({ parsedData: data }),
        clearUpload: () => set({ uploadProgress: 0, uploadedFiles: [], parsedData: null }),

        // Reset
        reset: () => set({
          prompts: [],
          activePromptId: null,
          promptDraft: null,
          weights: DEFAULT_WEIGHTS,
          weightsModified: false,
          batchJobs: [],
          activeBatchId: null,
          uploadProgress: 0,
          uploadedFiles: [],
          parsedData: null,
        }),
      }),
      { name: 'tuning-store' }
    )
  )
)
```

```typescript
// src/stores/analytics-store.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface CompetitorAnalysis {
  id: string
  competitorName: string
  competitorUrl: string
  geoScore: number
  keywords: string[]
  keywordCoverage: number
  analyzedAt: Date
}

interface AIExposureMetric {
  id: string
  engine: string
  query: string
  isCited: boolean
  citationRank?: number
  measuredAt: Date
}

interface ExportJob {
  id: string
  format: 'pdf' | 'excel' | 'csv'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  downloadUrl?: string
  createdAt: Date
}

interface AnalyticsState {
  // Competitors
  competitors: CompetitorAnalysis[]
  selectedCompetitorId: string | null

  // AI Exposure
  exposureMetrics: AIExposureMetric[]
  exposureFilters: {
    engine?: string
    dateFrom?: Date
    dateTo?: Date
  }

  // Exports
  exportJobs: ExportJob[]

  // Date Range (global filter)
  dateRange: {
    from: Date
    to: Date
  }

  // Actions
  setCompetitors: (competitors: CompetitorAnalysis[]) => void
  addCompetitor: (competitor: CompetitorAnalysis) => void
  selectCompetitor: (id: string | null) => void
  removeCompetitor: (id: string) => void

  setExposureMetrics: (metrics: AIExposureMetric[]) => void
  setExposureFilters: (filters: Partial<AnalyticsState['exposureFilters']>) => void

  addExportJob: (job: ExportJob) => void
  updateExportJob: (id: string, updates: Partial<ExportJob>) => void
  removeExportJob: (id: string) => void

  setDateRange: (range: { from: Date; to: Date }) => void
  reset: () => void
}

const getDefaultDateRange = () => ({
  from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  to: new Date(),
})

export const useAnalyticsStore = create<AnalyticsState>()(
  devtools(
    (set, get) => ({
      competitors: [],
      selectedCompetitorId: null,
      exposureMetrics: [],
      exposureFilters: {},
      exportJobs: [],
      dateRange: getDefaultDateRange(),

      setCompetitors: (competitors) => set({ competitors }),
      addCompetitor: (competitor) => set({
        competitors: [...get().competitors, competitor]
      }),
      selectCompetitor: (id) => set({ selectedCompetitorId: id }),
      removeCompetitor: (id) => set({
        competitors: get().competitors.filter(c => c.id !== id)
      }),

      setExposureMetrics: (metrics) => set({ exposureMetrics: metrics }),
      setExposureFilters: (filters) => set({
        exposureFilters: { ...get().exposureFilters, ...filters }
      }),

      addExportJob: (job) => set({ exportJobs: [...get().exportJobs, job] }),
      updateExportJob: (id, updates) => set({
        exportJobs: get().exportJobs.map(j => j.id === id ? { ...j, ...updates } : j)
      }),
      removeExportJob: (id) => set({
        exportJobs: get().exportJobs.filter(j => j.id !== id)
      }),

      setDateRange: (range) => set({ dateRange: range }),
      reset: () => set({
        competitors: [],
        selectedCompetitorId: null,
        exposureMetrics: [],
        exposureFilters: {},
        exportJobs: [],
        dateRange: getDefaultDateRange(),
      }),
    })
  )
)
```

---

## 0.4 Error Handling Architecture

### Error Boundary Implementation

```typescript
// src/components/error-boundary.tsx
'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Warning } from '@phosphor-icons/react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // TODO: Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Warning className="h-5 w-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              An unexpected error occurred. Please try again or contact support if the problem persists.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="mt-4 p-2 bg-muted rounded text-xs overflow-auto">
                {this.state.error.message}
              </pre>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Try Again
            </Button>
          </CardFooter>
        </Card>
      )
    }

    return this.props.children
  }
}
```

### API Error Handling

```typescript
// src/lib/api/error-handler.ts
import { NextResponse } from 'next/server'

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class RateLimitError extends APIError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_ERROR', { retryAfter })
    this.name = 'RateLimitError'
  }
}

export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error)

  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { error: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' },
    { status: 500 }
  )
}
```

### Batch Job Error Recovery

```typescript
// src/lib/batch/error-recovery.ts
interface RetryConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  }

  let lastError: Error | undefined
  let delay = initialDelayMs

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === maxRetries) {
        break
      }

      // Check if error is retryable
      if (isNonRetryableError(error)) {
        throw error
      }

      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay))
      delay = Math.min(delay * backoffMultiplier, maxDelayMs)
    }
  }

  throw lastError
}

function isNonRetryableError(error: unknown): boolean {
  if (error instanceof APIError) {
    // Don't retry 4xx errors except rate limits
    return error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429
  }
  return false
}

export interface BatchErrorLog {
  itemId: string
  error: string
  timestamp: Date
  attempt: number
  recoverable: boolean
}

export function createBatchErrorHandler() {
  const errors: BatchErrorLog[] = []

  return {
    logError(itemId: string, error: Error, attempt: number) {
      errors.push({
        itemId,
        error: error.message,
        timestamp: new Date(),
        attempt,
        recoverable: !isNonRetryableError(error),
      })
    },

    getErrors() {
      return [...errors]
    },

    getRecoverableErrors() {
      return errors.filter(e => e.recoverable)
    },

    getSummary() {
      return {
        total: errors.length,
        recoverable: errors.filter(e => e.recoverable).length,
        nonRecoverable: errors.filter(e => !e.recoverable).length,
      }
    },
  }
}
```

---

## 0.5 Accessibility Requirements

### WCAG 2.1 AA Compliance Checklist

All components must meet the following accessibility standards:

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| Color Contrast | 4.5:1 minimum | Use Tailwind's default colors, test with axe |
| Keyboard Navigation | Full keyboard access | All interactive elements focusable |
| Focus Indicators | Visible focus rings | Use `focus-visible:ring-2` pattern |
| Screen Reader Support | Proper ARIA labels | Add `aria-label`, `aria-describedby` |
| Touch Targets | 44x44px minimum | Use `min-h-[44px] min-w-[44px]` |
| Motion | Respects reduced motion | Use `motion-safe:` prefix |
| Form Labels | Associated labels | Use `htmlFor` or wrap in label |
| Error Messages | Programmatically associated | Use `aria-describedby` for errors |

### Accessible Component Patterns

```typescript
// src/components/ui/accessible-slider.tsx
// Weight Controller sliders must include screen reader values

'use client'

import * as SliderPrimitive from '@radix-ui/react-slider'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface AccessibleSliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  label: string
  valueLabel?: (value: number) => string
  showValue?: boolean
}

export const AccessibleSlider = forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  AccessibleSliderProps
>(({ className, label, valueLabel, showValue = true, ...props }, ref) => {
  const value = props.value?.[0] ?? props.defaultValue?.[0] ?? 0
  const displayValue = valueLabel ? valueLabel(value) : String(value)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          id={`${label}-label`}
          className="text-sm font-medium"
        >
          {label}
        </label>
        {showValue && (
          <span
            className="text-sm text-muted-foreground"
            aria-live="polite"
          >
            {displayValue}
          </span>
        )}
      </div>
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          'relative flex w-full touch-none select-none items-center',
          className
        )}
        aria-labelledby={`${label}-label`}
        aria-valuetext={displayValue}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            'block h-5 w-5 rounded-full border-2 border-primary bg-background',
            'ring-offset-background transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            'min-h-[44px] min-w-[44px] -mt-[11px]' // Touch target
          )}
        />
      </SliderPrimitive.Root>
    </div>
  )
})
AccessibleSlider.displayName = 'AccessibleSlider'
```

```typescript
// src/components/ui/accessible-diff.tsx
// Diff Viewer must not rely solely on color

'use client'

import { cn } from '@/lib/utils'
import { Plus, Minus, Equals } from '@phosphor-icons/react'

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumber: number
}

interface AccessibleDiffProps {
  lines: DiffLine[]
  className?: string
}

export function AccessibleDiff({ lines, className }: AccessibleDiffProps) {
  return (
    <div
      className={cn('font-mono text-sm', className)}
      role="region"
      aria-label="Text differences"
    >
      {lines.map((line, index) => (
        <div
          key={index}
          className={cn(
            'flex items-start gap-2 px-2 py-0.5',
            line.type === 'added' && 'bg-green-500/10',
            line.type === 'removed' && 'bg-red-500/10'
          )}
        >
          <span
            className="flex-shrink-0 w-8 text-muted-foreground text-right"
            aria-hidden="true"
          >
            {line.lineNumber}
          </span>
          <span className="flex-shrink-0 w-5" aria-label={line.type}>
            {line.type === 'added' && <Plus className="h-4 w-4 text-green-600" aria-hidden="true" />}
            {line.type === 'removed' && <Minus className="h-4 w-4 text-red-600" aria-hidden="true" />}
            {line.type === 'unchanged' && <Equals className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          </span>
          <span
            className={cn(
              'flex-1',
              line.type === 'added' && 'text-green-700 dark:text-green-400',
              line.type === 'removed' && 'text-red-700 dark:text-red-400'
            )}
          >
            <span className="sr-only">
              {line.type === 'added' && 'Added: '}
              {line.type === 'removed' && 'Removed: '}
            </span>
            {line.content}
          </span>
        </div>
      ))}
    </div>
  )
}
```

---

## 0.6 Performance Specifications

### Performance Budgets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| First Contentful Paint (FCP) | < 1.5s | < 2.5s |
| Largest Contentful Paint (LCP) | < 2.5s | < 4.0s |
| Time to Interactive (TTI) | < 3.5s | < 5.0s |
| Cumulative Layout Shift (CLS) | < 0.1 | < 0.25 |
| First Input Delay (FID) | < 100ms | < 300ms |
| JS Bundle Size (gzipped) | < 200KB | < 350KB |

### Lazy Loading Patterns

```typescript
// src/lib/lazy-components.ts
import dynamic from 'next/dynamic'

// Heavy components should be dynamically imported
export const LazyDiffViewer = dynamic(
  () => import('@/components/features/tuning/diff-viewer').then(mod => mod.DiffViewer),
  {
    loading: () => <DiffViewerSkeleton />,
    ssr: false,
  }
)

export const LazyChartComponents = dynamic(
  () => import('@/components/features/analytics/charts').then(mod => mod.Charts),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
)

export const LazyPDFGenerator = dynamic(
  () => import('@/components/features/reports/pdf-generator').then(mod => mod.PDFGenerator),
  {
    loading: () => <GeneratorSkeleton />,
    ssr: false,
  }
)
```

### Virtualization for Large Lists

```typescript
// Use @tanstack/react-virtual for batch job items
// src/components/features/tuning/virtual-batch-list.tsx
'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import type { BatchJobItem } from '@/types/tuning'

interface VirtualBatchListProps {
  items: BatchJobItem[]
  renderItem: (item: BatchJobItem) => React.ReactNode
}

export function VirtualBatchList({ items, renderItem }: VirtualBatchListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Estimated row height
    overscan: 10,
  })

  return (
    <div
      ref={parentRef}
      className="h-[400px] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index])}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Background Processing with Web Workers

```typescript
// src/workers/diff-worker.ts
// Heavy diff calculations should run in a worker

self.onmessage = (event: MessageEvent<{ oldText: string; newText: string }>) => {
  const { oldText, newText } = event.data

  // Perform diff calculation
  const diff = calculateDiff(oldText, newText)

  self.postMessage(diff)
}

function calculateDiff(oldText: string, newText: string) {
  // Implementation using diff-match-patch or similar
  // This runs in background, not blocking main thread
}
```

---

## 0.7 Mobile UX Requirements

### Universal Mobile Requirements

All components must implement these mobile patterns:

| Requirement | Specification |
|-------------|---------------|
| Touch Targets | Minimum 44x44px for all interactive elements |
| Swipe Gestures | Support swipe for navigation where appropriate |
| Bottom Actions | Primary actions at bottom for thumb reach |
| Stack Layouts | Switch to stacked layout below 768px |
| File Input | Use native file picker, not drag-drop only |
| Responsive Tables | Convert to card list on mobile |
| Sheet Dialogs | Use Sheet instead of Dialog on mobile |

### Mobile Component Template

```typescript
// Pattern for responsive component implementation
export function ResponsiveComponent() {
  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:block">
        <SplitPaneLayout />
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <StackedLayout />
      </div>
    </>
  )
}

// Or using container queries
export function ContainerQueryComponent() {
  return (
    <div className="@container">
      <div className="@md:flex @md:gap-4 space-y-4 @md:space-y-0">
        <div className="@md:w-1/2">Panel 1</div>
        <div className="@md:w-1/2">Panel 2</div>
      </div>
    </div>
  )
}
```

### Mobile File Upload Pattern

```typescript
// src/components/features/bulk-upload/mobile-uploader.tsx
'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { CloudArrowUp, File } from '@phosphor-icons/react'

interface MobileUploaderProps {
  accept: string
  multiple?: boolean
  onFilesSelected: (files: File[]) => void
}

export function MobileUploader({ accept, multiple, onFilesSelected }: MobileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onFilesSelected(files)
    }
  }

  return (
    <div className="md:hidden">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="sr-only"
        aria-label="Select files to upload"
      />
      <Button
        onClick={handleClick}
        className="w-full h-24 flex flex-col gap-2"
        variant="outline"
      >
        <CloudArrowUp className="h-8 w-8" />
        <span>Tap to select files</span>
      </Button>
    </div>
  )
}
```

---

# PART 1: DATABASE SCHEMA ADDITIONS

## 1.1 New Tables Required

### Table: `prompt_versions`

Stores versioned system prompts for AI engines.

```sql
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  version VARCHAR(20) NOT NULL,
  engine VARCHAR(20) NOT NULL CHECK (engine IN ('gemini', 'perplexity', 'cohere')),
  system_prompt TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  performance_score DECIMAL(5,2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, version)
);

CREATE INDEX idx_prompt_versions_active ON prompt_versions(is_active, engine);
```

### Table: `scoring_weights`

Configurable weights for GEO score calculation.

```sql
CREATE TABLE scoring_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  version VARCHAR(20) NOT NULL,
  weights JSONB NOT NULL,
  -- weights structure:
  -- {
  --   "keyword_density": { "max": 15, "weight": 1.0 },
  --   "ai_exposure": { "max": 35, "weight": 1.0 },
  --   "question_patterns": { "max": 20, "weight": 1.0 },
  --   "sentence_structure": { "max": 15, "weight": 1.0 },
  --   "length_compliance": { "max": 15, "weight": 1.0 }
  -- }
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `batch_jobs`

Tracks batch processing operations.

```sql
CREATE TABLE batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('score_validation', 'content_generation', 'bulk_import')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_items INTEGER NOT NULL,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  config JSONB,
  results JSONB,
  error_log TEXT[],
  estimated_cost DECIMAL(10,4),
  actual_cost DECIMAL(10,4),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batch_jobs_status ON batch_jobs(status, created_at DESC);
```

### Table: `batch_job_items`

Individual items within a batch job.

```sql
CREATE TABLE batch_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_job_id UUID NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  input_data JSONB NOT NULL,
  output_data JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_batch_items_job ON batch_job_items(batch_job_id, sequence_number);
```

### Table: `validation_results`

Stores AI vs Human score validation data.

```sql
CREATE TABLE validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES generations(id),
  prompt_version_id UUID REFERENCES prompt_versions(id),
  weights_version_id UUID REFERENCES scoring_weights(id),
  ai_scores JSONB NOT NULL,
  human_scores JSONB,
  score_diff DECIMAL(5,2),
  validation_status VARCHAR(20) DEFAULT 'pending',
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_validation_generation ON validation_results(generation_id);
```

### Table: `competitor_analyses`

Stores competitor content analysis results.

```sql
CREATE TABLE competitor_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  competitor_name VARCHAR(255) NOT NULL,
  competitor_url TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  analysis_data JSONB NOT NULL,
  -- analysis_data structure:
  -- {
  --   "geo_score": number,
  --   "keywords": string[],
  --   "structure_analysis": object,
  --   "ai_exposure_signals": object
  -- }
  keyword_coverage DECIMAL(5,2),
  gap_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_competitor_product ON competitor_analyses(product_id, created_at DESC);
```

### Table: `ai_exposure_metrics`

Tracks actual AI engine citation/exposure data.

```sql
CREATE TABLE ai_exposure_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  generation_id UUID REFERENCES generations(id),
  engine VARCHAR(50) NOT NULL,
  query_text TEXT NOT NULL,
  is_cited BOOLEAN NOT NULL,
  citation_rank INTEGER,
  citation_context TEXT,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  measurement_method VARCHAR(50),
  raw_response JSONB
);

CREATE INDEX idx_exposure_product ON ai_exposure_metrics(product_id, measured_at DESC);
CREATE INDEX idx_exposure_generation ON ai_exposure_metrics(generation_id);
```

### Table: `user_feedback`

Captures user feedback on generated content quality.

```sql
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES generations(id),
  user_id UUID REFERENCES users(id),
  feedback_type VARCHAR(50) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  improvement_suggestions TEXT[],
  context_useful BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_generation ON user_feedback(generation_id);
```

### Table: `export_reports`

Tracks generated export reports.

```sql
CREATE TABLE export_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'xlsx', 'csv', 'json')),
  filters JSONB,
  file_url TEXT,
  file_size_bytes INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
```

## 1.2 Table Modifications

### Modify: `generations`

Add fields for enhanced scoring and schema markup.

```sql
ALTER TABLE generations ADD COLUMN IF NOT EXISTS
  geo_score_v2 JSONB,
  -- geo_score_v2 structure:
  -- {
  --   "total": number,
  --   "breakdown": {
  --     "keyword_density": number,
  --     "ai_exposure": number,
  --     "question_patterns": number,
  --     "sentence_structure": number,
  --     "length_compliance": number,
  --     "grounding_quality": number
  --   },
  --   "version": string
  -- }
  json_ld_schema TEXT,
  schema_type VARCHAR(50),
  simulation_results JSONB,
  created_with_prompt_version UUID REFERENCES prompt_versions(id);
```

---

# PART 2: PHASE 1 - TUNING AND VALIDATION CONSOLE

## 2.1 Feature: Bulk Data Uploader

### Overview

Enables bulk import of content data from Excel/CSV files for large-scale testing and validation.

### File Structure

```
src/
  app/
    (dashboard)/
      tuning/
        upload/
          page.tsx           # Main upload page
  components/
    features/
      bulk-upload/
        uploader.tsx         # File drop zone component
        preview-table.tsx    # Data preview with validation
        mapping-dialog.tsx   # Column mapping configuration
        progress-tracker.tsx # Upload progress display
  lib/
    bulk-upload/
      parser.ts              # CSV/Excel parsing
      validator.ts           # Data validation rules
      processor.ts           # Batch processing logic
  app/
    api/
      bulk-upload/
        route.ts             # Upload endpoint
        [jobId]/
          route.ts           # Job status endpoint
```

### UI Component: BulkUploader

```tsx
// src/components/features/bulk-upload/uploader.tsx
'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  UploadSimple,
  FileXls,
  FileCsv,
  CheckCircle,
  XCircle,
  SpinnerGap,
} from '@phosphor-icons/react'

interface BulkUploaderProps {
  onUploadComplete: (jobId: string) => void
  acceptedFormats?: string[]
}

interface UploadState {
  status: 'idle' | 'parsing' | 'validating' | 'uploading' | 'complete' | 'error'
  progress: number
  totalRows: number
  validRows: number
  invalidRows: number
  errors: string[]
}

export function BulkUploader({
  onUploadComplete,
  acceptedFormats = ['.csv', '.xlsx', '.xls']
}: BulkUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    errors: [],
  })
  const [file, setFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      parseFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  })

  const parseFile = async (file: File) => {
    setUploadState(prev => ({ ...prev, status: 'parsing', progress: 10 }))

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/bulk-upload/parse', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      setUploadState(prev => ({
        ...prev,
        status: 'validating',
        progress: 30,
        totalRows: result.totalRows,
      }))

      // Continue with validation...
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        errors: [error instanceof Error ? error.message : 'Parse failed'],
      }))
    }
  }

  const getFileIcon = () => {
    if (!file) return <UploadSimple size={48} weight="light" />
    if (file.name.endsWith('.csv')) return <FileCsv size={48} weight="fill" />
    return <FileXls size={48} weight="fill" />
  }

  const getStatusIcon = () => {
    switch (uploadState.status) {
      case 'complete':
        return <CheckCircle size={24} weight="fill" className="text-green-500" />
      case 'error':
        return <XCircle size={24} weight="fill" className="text-red-500" />
      case 'parsing':
      case 'validating':
      case 'uploading':
        return <SpinnerGap size={24} className="animate-spin" />
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadSimple size={24} weight="bold" />
          Bulk Data Upload
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${uploadState.status !== 'idle' ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            {getFileIcon()}
            {isDragActive ? (
              <p className="text-blue-600">Drop the file here...</p>
            ) : (
              <>
                <p className="text-gray-600">
                  Drag and drop a CSV or Excel file, or click to browse
                </p>
                <p className="text-sm text-gray-400">
                  Supported formats: CSV, XLSX, XLS
                </p>
              </>
            )}
          </div>
        </div>

        {uploadState.status !== 'idle' && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium capitalize">
                {uploadState.status}...
              </span>
              {getStatusIcon()}
            </div>
            <Progress value={uploadState.progress} />
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Rows:</span>
                <span className="ml-2 font-medium">{uploadState.totalRows}</span>
              </div>
              <div>
                <span className="text-gray-500">Valid:</span>
                <span className="ml-2 font-medium text-green-600">
                  {uploadState.validRows}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Invalid:</span>
                <span className="ml-2 font-medium text-red-600">
                  {uploadState.invalidRows}
                </span>
              </div>
            </div>
          </div>
        )}

        {uploadState.errors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <p className="font-medium text-red-800">Errors:</p>
            <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
              {uploadState.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### API Endpoint: Bulk Upload

```typescript
// src/app/api/bulk-upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseCSV, parseExcel } from '@/lib/bulk-upload/parser'
import { validateBulkData } from '@/lib/bulk-upload/validator'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  const datasetName = formData.get('datasetName') as string
  const datasetVersion = formData.get('version') as string

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  try {
    // Parse file based on type
    const buffer = await file.arrayBuffer()
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    const rows = isExcel
      ? await parseExcel(buffer)
      : await parseCSV(buffer)

    // Validate data
    const validation = validateBulkData(rows)

    // Create batch job
    const { data: job, error: jobError } = await supabase
      .from('batch_jobs')
      .insert({
        name: datasetName || file.name,
        type: 'bulk_import',
        status: 'pending',
        total_items: validation.validRows.length,
        config: {
          version: datasetVersion,
          originalFileName: file.name,
          columnMapping: validation.columnMapping,
        },
        created_by: user.id,
      })
      .select()
      .single()

    if (jobError) throw jobError

    // Insert batch items
    const items = validation.validRows.map((row, index) => ({
      batch_job_id: job.id,
      sequence_number: index + 1,
      input_data: row,
      status: 'pending',
    }))

    const { error: itemsError } = await supabase
      .from('batch_job_items')
      .insert(items)

    if (itemsError) throw itemsError

    return NextResponse.json({
      jobId: job.id,
      totalRows: rows.length,
      validRows: validation.validRows.length,
      invalidRows: validation.invalidRows.length,
      errors: validation.errors,
    })
  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    )
  }
}
```

---

## 2.2 Feature: Prompt Manager

### Overview

Web-based interface for managing system prompts with versioning, A/B testing, and rollback capabilities.

### File Structure

```
src/
  app/
    (dashboard)/
      tuning/
        prompts/
          page.tsx             # Prompt list view
          [id]/
            page.tsx           # Prompt editor
  components/
    features/
      prompt-manager/
        prompt-editor.tsx      # Code editor with syntax highlighting
        version-history.tsx    # Version comparison
        test-panel.tsx         # Live testing panel
        diff-viewer.tsx        # Version diff display
```

### UI Component: PromptEditor

```tsx
// src/components/features/prompt-manager/prompt-editor.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FloppyDisk,
  Play,
  ArrowCounterClockwise,
  Code,
  ListBullets,
  Clock,
  CheckCircle,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface PromptVersion {
  id: string
  name: string
  version: string
  engine: 'gemini' | 'perplexity' | 'cohere'
  systemPrompt: string
  description: string
  isActive: boolean
  performanceScore: number | null
  createdAt: string
}

interface PromptEditorProps {
  prompt?: PromptVersion
  onSave: (prompt: Partial<PromptVersion>) => Promise<void>
  onTest: (prompt: string, engine: string) => Promise<string>
}

export function PromptEditor({ prompt, onSave, onTest }: PromptEditorProps) {
  const [name, setName] = useState(prompt?.name || '')
  const [version, setVersion] = useState(prompt?.version || '1.0')
  const [engine, setEngine] = useState<'gemini' | 'perplexity' | 'cohere'>(
    prompt?.engine || 'gemini'
  )
  const [systemPrompt, setSystemPrompt] = useState(prompt?.systemPrompt || '')
  const [description, setDescription] = useState(prompt?.description || '')
  const [testInput, setTestInput] = useState('')
  const [testOutput, setTestOutput] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        name,
        version,
        engine,
        systemPrompt,
        description,
      })
      toast.success('Prompt saved successfully')
    } catch (error) {
      toast.error('Failed to save prompt')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const result = await onTest(systemPrompt, engine)
      setTestOutput(result)
    } catch (error) {
      toast.error('Test failed')
    } finally {
      setIsTesting(false)
    }
  }

  const variableTokens = [
    '{{product_name}}',
    '{{keywords}}',
    '{{srt_content}}',
    '{{grounding_data}}',
    '{{brief_usps}}',
    '{{language}}',
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code size={24} weight="bold" />
              Prompt Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Prompt Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="description_generator_v2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="engine">AI Engine</Label>
              <Select value={engine} onValueChange={(v) => setEngine(v as typeof engine)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                  <SelectItem value="cohere">Cohere</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this prompt version"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <div className="flex gap-1">
                  {variableTokens.map((token) => (
                    <Badge
                      key={token}
                      variant="outline"
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        setSystemPrompt((prev) => prev + ' ' + token)
                      }}
                    >
                      {token}
                    </Badge>
                  ))}
                </div>
              </div>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="font-mono text-sm min-h-[300px]"
                placeholder="Enter your system prompt here..."
              />
              <p className="text-xs text-gray-500">
                Character count: {systemPrompt.length} |
                Estimated tokens: ~{Math.ceil(systemPrompt.length / 4)}
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving}>
                <FloppyDisk size={20} weight="bold" className="mr-2" />
                {isSaving ? 'Saving...' : 'Save Version'}
              </Button>
              {prompt && (
                <Button variant="outline">
                  <ArrowCounterClockwise size={20} weight="bold" className="mr-2" />
                  Rollback
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play size={24} weight="bold" />
              Test Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Test Input</Label>
              <Textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Enter test input..."
                className="min-h-[100px]"
              />
            </div>
            <Button
              onClick={handleTest}
              disabled={isTesting || !systemPrompt}
              className="w-full"
            >
              <Play size={20} weight="fill" className="mr-2" />
              {isTesting ? 'Running...' : 'Run Test'}
            </Button>
            {testOutput && (
              <div className="space-y-2">
                <Label>Output</Label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm font-mono max-h-[200px] overflow-y-auto">
                  {testOutput}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {prompt && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={24} weight="bold" />
                Version Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Badge variant={prompt.isActive ? 'default' : 'secondary'}>
                  {prompt.isActive ? (
                    <>
                      <CheckCircle size={14} className="mr-1" />
                      Active
                    </>
                  ) : (
                    'Inactive'
                  )}
                </Badge>
              </div>
              {prompt.performanceScore !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Performance</span>
                  <span className="font-medium">{prompt.performanceScore}%</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm">
                  {new Date(prompt.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
```

---

## 2.3 Feature: Weight Controller

### Overview

Visual interface for adjusting GEO score calculation weights with real-time preview.

### UI Component: WeightController

```tsx
// src/components/features/tuning/weight-controller.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Sliders,
  FloppyDisk,
  ArrowCounterClockwise,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react'

interface WeightConfig {
  id: string
  name: string
  maxPoints: number
  weight: number
  enabled: boolean
  description: string
}

interface WeightControllerProps {
  initialWeights: WeightConfig[]
  onSave: (weights: WeightConfig[]) => Promise<void>
  onPreview: (weights: WeightConfig[]) => Promise<{ score: number; breakdown: Record<string, number> }>
}

const DEFAULT_WEIGHTS: WeightConfig[] = [
  {
    id: 'keyword_density',
    name: 'Keyword Density',
    maxPoints: 15,
    weight: 1.0,
    enabled: true,
    description: 'Measures optimal keyword placement and frequency',
  },
  {
    id: 'ai_exposure',
    name: 'AI Exposure Signals',
    maxPoints: 35,
    weight: 1.0,
    enabled: true,
    description: 'Evaluates content structure for AI citation likelihood',
  },
  {
    id: 'question_patterns',
    name: 'Question Patterns',
    maxPoints: 20,
    weight: 1.0,
    enabled: true,
    description: 'Assesses FAQ optimization for conversational queries',
  },
  {
    id: 'sentence_structure',
    name: 'Sentence Structure',
    maxPoints: 15,
    weight: 1.0,
    enabled: true,
    description: 'Analyzes readability and extraction-friendliness',
  },
  {
    id: 'length_compliance',
    name: 'Length Compliance',
    maxPoints: 15,
    weight: 1.0,
    enabled: true,
    description: 'Checks content length against platform guidelines',
  },
]

export function WeightController({
  initialWeights = DEFAULT_WEIGHTS,
  onSave,
  onPreview,
}: WeightControllerProps) {
  const [weights, setWeights] = useState<WeightConfig[]>(initialWeights)
  const [previewResult, setPreviewResult] = useState<{
    score: number
    breakdown: Record<string, number>
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const totalMaxPoints = weights
    .filter(w => w.enabled)
    .reduce((sum, w) => sum + w.maxPoints * w.weight, 0)

  const updateWeight = (id: string, value: number) => {
    setWeights(prev =>
      prev.map(w => (w.id === id ? { ...w, weight: value } : w))
    )
  }

  const toggleEnabled = (id: string) => {
    setWeights(prev =>
      prev.map(w => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    )
  }

  const handlePreview = async () => {
    const result = await onPreview(weights)
    setPreviewResult(result)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(weights)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setWeights(DEFAULT_WEIGHTS)
    setPreviewResult(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders size={24} weight="bold" />
            Score Weight Configuration
          </div>
          <Badge variant="outline">
            Max Total: {totalMaxPoints.toFixed(1)} pts
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {weights.map((config) => (
          <div
            key={config.id}
            className={`p-4 rounded-lg border ${
              config.enabled ? 'bg-white' : 'bg-gray-50 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={config.enabled}
                  onCheckedChange={() => toggleEnabled(config.id)}
                />
                <div>
                  <Label className="font-medium">{config.name}</Label>
                  <p className="text-xs text-gray-500">{config.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-sm text-gray-500">Max Points</span>
                  <p className="font-medium">{config.maxPoints}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">Weight</span>
                  <p className="font-medium">{config.weight.toFixed(2)}x</p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">Effective</span>
                  <p className="font-medium text-blue-600">
                    {(config.maxPoints * config.weight).toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            {config.enabled && (
              <div className="mt-3">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.weight}
                  onChange={(e) => updateWeight(config.id, parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0x (Disabled)</span>
                  <span>1x (Normal)</span>
                  <span>2x (Double)</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {previewResult && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Preview Score</span>
              <span className="text-2xl font-bold text-blue-600">
                {previewResult.score.toFixed(1)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(previewResult.breakdown).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-500">{key}:</span>
                  <span>{value.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            <FloppyDisk size={20} weight="bold" className="mr-2" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
          <Button variant="outline" onClick={handlePreview}>
            <Eye size={20} weight="bold" className="mr-2" />
            Preview Impact
          </Button>
          <Button variant="ghost" onClick={handleReset}>
            <ArrowCounterClockwise size={20} weight="bold" className="mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 2.4 Feature: Batch Runner

### Overview

Execute scoring validation across multiple content items with real-time monitoring.

### UI Component: BatchRunner

```tsx
// src/components/features/tuning/batch-runner.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Pause,
  Stop,
  Lightning,
  Clock,
  CurrencyDollar,
  CheckCircle,
  XCircle,
  SpinnerGap,
} from '@phosphor-icons/react'

interface BatchJob {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  totalItems: number
  processedItems: number
  failedItems: number
  startedAt: string | null
  estimatedCost: number
  actualCost: number
}

interface BatchRunnerProps {
  datasetId: string
  promptVersionId: string
  weightsVersionId: string
  onComplete: (jobId: string) => void
}

export function BatchRunner({
  datasetId,
  promptVersionId,
  weightsVersionId,
  onComplete,
}: BatchRunnerProps) {
  const [job, setJob] = useState<BatchJob | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (job?.status === 'running') {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1)
        fetchJobStatus()
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [job?.status])

  const fetchJobStatus = async () => {
    if (!job) return

    const response = await fetch(`/api/batch-jobs/${job.id}`)
    const data = await response.json()
    setJob(data.job)

    if (data.job.status === 'completed') {
      onComplete(job.id)
    }
  }

  const startBatch = async () => {
    setIsStarting(true)
    try {
      const response = await fetch('/api/batch-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'score_validation',
          datasetId,
          promptVersionId,
          weightsVersionId,
        }),
      })
      const data = await response.json()
      setJob(data.job)
      setElapsedTime(0)
    } finally {
      setIsStarting(false)
    }
  }

  const pauseBatch = async () => {
    if (!job) return
    await fetch(`/api/batch-jobs/${job.id}/pause`, { method: 'POST' })
    fetchJobStatus()
  }

  const cancelBatch = async () => {
    if (!job) return
    await fetch(`/api/batch-jobs/${job.id}/cancel`, { method: 'POST' })
    fetchJobStatus()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = job
    ? Math.round((job.processedItems / job.totalItems) * 100)
    : 0

  const estimatedRemaining = job && job.processedItems > 0
    ? Math.round(((job.totalItems - job.processedItems) / job.processedItems) * elapsedTime)
    : null

  const getStatusBadge = () => {
    if (!job) return null

    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', icon: <Clock size={14} /> },
      running: { variant: 'default', icon: <SpinnerGap size={14} className="animate-spin" /> },
      completed: { variant: 'outline', icon: <CheckCircle size={14} /> },
      failed: { variant: 'destructive', icon: <XCircle size={14} /> },
      cancelled: { variant: 'secondary', icon: <Stop size={14} /> },
    }

    const { variant, icon } = variants[job.status]
    return (
      <Badge variant={variant} className="gap-1">
        {icon}
        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightning size={24} weight="bold" />
            Batch Execution
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!job ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              Ready to run validation across the selected dataset
            </p>
            <Button onClick={startBatch} disabled={isStarting} size="lg">
              <Play size={20} weight="fill" className="mr-2" />
              {isStarting ? 'Starting...' : 'Start Batch'}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{job.processedItems} / {job.totalItems}</span>
              </div>
              <Progress value={progressPercentage} />
              <p className="text-xs text-gray-500 text-right">
                {progressPercentage}% complete
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Clock size={16} />
                  Elapsed
                </div>
                <p className="text-xl font-mono">{formatTime(elapsedTime)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Clock size={16} />
                  Remaining
                </div>
                <p className="text-xl font-mono">
                  {estimatedRemaining !== null ? formatTime(estimatedRemaining) : '--:--'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <CurrencyDollar size={16} />
                  Est. Cost
                </div>
                <p className="text-xl font-mono">
                  ${job.actualCost > 0 ? job.actualCost.toFixed(4) : job.estimatedCost.toFixed(4)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{job.processedItems - job.failedItems}</p>
                <p className="text-sm text-gray-500">Successful</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{job.failedItems}</p>
                <p className="text-sm text-gray-500">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">{job.totalItems - job.processedItems}</p>
                <p className="text-sm text-gray-500">Remaining</p>
              </div>
            </div>

            {job.status === 'running' && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={pauseBatch}>
                  <Pause size={20} weight="fill" className="mr-2" />
                  Pause
                </Button>
                <Button variant="destructive" onClick={cancelBatch}>
                  <Stop size={20} weight="fill" className="mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## 2.5 Feature: Diff Viewer

### Overview

Compare AI-generated scores against human-validated scores to identify discrepancies and tune the scoring algorithm.

### UI Component: DiffViewer

```tsx
// src/components/features/tuning/diff-viewer.tsx
'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowUp,
  ArrowDown,
  Equals,
  Warning,
  SortAscending,
  SortDescending,
} from '@phosphor-icons/react'

interface ScoreComparison {
  id: string
  contentName: string
  category: string
  aiScore: number
  humanScore: number | null
  diff: number
  breakdown: {
    category: string
    aiValue: number
    humanValue: number | null
    diff: number
  }[]
}

interface DiffViewerProps {
  comparisons: ScoreComparison[]
  promptVersion: string
  weightsVersion: string
}

export function DiffViewer({
  comparisons,
  promptVersion,
  weightsVersion,
}: DiffViewerProps) {
  const stats = useMemo(() => {
    const validated = comparisons.filter(c => c.humanScore !== null)
    if (validated.length === 0) return null

    const diffs = validated.map(c => Math.abs(c.diff))
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length
    const maxDiff = Math.max(...diffs)
    const minDiff = Math.min(...diffs)

    const overestimated = validated.filter(c => c.diff > 0).length
    const underestimated = validated.filter(c => c.diff < 0).length
    const accurate = validated.filter(c => Math.abs(c.diff) < 5).length

    return {
      total: validated.length,
      avgDiff,
      maxDiff,
      minDiff,
      overestimated,
      underestimated,
      accurate,
      accuracyRate: (accurate / validated.length) * 100,
    }
  }, [comparisons])

  const getDiffBadge = (diff: number) => {
    const absDiff = Math.abs(diff)

    if (absDiff < 3) {
      return (
        <Badge variant="outline" className="text-green-600">
          <Equals size={14} className="mr-1" />
          {diff.toFixed(1)}
        </Badge>
      )
    }

    if (diff > 0) {
      return (
        <Badge variant="outline" className={absDiff > 10 ? 'text-red-600' : 'text-orange-500'}>
          <ArrowUp size={14} className="mr-1" />
          +{diff.toFixed(1)}
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className={absDiff > 10 ? 'text-red-600' : 'text-blue-500'}>
        <ArrowDown size={14} className="mr-1" />
        {diff.toFixed(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.accuracyRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">Accuracy Rate</p>
                <p className="text-xs text-gray-400">within 5 points</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.avgDiff.toFixed(1)}</p>
                <p className="text-sm text-gray-500">Avg Difference</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-500">{stats.overestimated}</p>
                <p className="text-sm text-gray-500">Overestimated</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-500">{stats.underestimated}</p>
                <p className="text-sm text-gray-500">Underestimated</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Score Comparison</span>
            <div className="flex gap-2 text-sm font-normal">
              <Badge variant="secondary">Prompt: {promptVersion}</Badge>
              <Badge variant="secondary">Weights: {weightsVersion}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">AI Score</TableHead>
                <TableHead className="text-right">Human Score</TableHead>
                <TableHead className="text-right">Difference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {item.contentName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.aiScore.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.humanScore !== null ? item.humanScore.toFixed(1) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.humanScore !== null ? getDiffBadge(item.diff) : '-'}
                  </TableCell>
                  <TableCell>
                    {item.humanScore === null ? (
                      <Badge variant="secondary">Pending Review</Badge>
                    ) : Math.abs(item.diff) > 10 ? (
                      <Badge variant="destructive">
                        <Warning size={14} className="mr-1" />
                        Outlier
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600">
                        Validated
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

# PART 3: PHASE 2 - PRODUCTION SERVICE

## 3.1 Feature: 100-Point Score Report

### Overview

Comprehensive scoring breakdown with actionable improvement suggestions.

### File Structure

```
src/
  components/
    features/
      score-report/
        score-summary.tsx      # Overall score display
        score-breakdown.tsx    # Category-by-category analysis
        improvement-tips.tsx   # AI-generated suggestions
        score-history.tsx      # Historical score trends
```

### UI Component: ScoreSummary

```tsx
// src/components/features/score-report/score-summary.tsx
'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  ChartPie,
  TrendUp,
  TrendDown,
  Target,
  Lightning,
  Question,
  TextAlignLeft,
  Ruler,
  Anchor,
} from '@phosphor-icons/react'

interface ScoreBreakdown {
  keywordDensity: number
  aiExposure: number
  questionPatterns: number
  sentenceStructure: number
  lengthCompliance: number
  groundingQuality: number
}

interface ScoreSummaryProps {
  totalScore: number
  breakdown: ScoreBreakdown
  previousScore?: number
}

const SCORE_CONFIG = [
  {
    key: 'keywordDensity',
    label: 'Keyword Density',
    max: 15,
    icon: Target,
    description: 'Optimal keyword placement and frequency',
  },
  {
    key: 'aiExposure',
    label: 'AI Exposure',
    max: 35,
    icon: Lightning,
    description: 'Content structure for AI citation',
  },
  {
    key: 'questionPatterns',
    label: 'Question Patterns',
    max: 20,
    icon: Question,
    description: 'FAQ optimization for conversational queries',
  },
  {
    key: 'sentenceStructure',
    label: 'Sentence Structure',
    max: 15,
    icon: TextAlignLeft,
    description: 'Readability and extraction-friendliness',
  },
  {
    key: 'lengthCompliance',
    label: 'Length Compliance',
    max: 15,
    icon: Ruler,
    description: 'Content length within guidelines',
  },
] as const

export function ScoreSummary({
  totalScore,
  breakdown,
  previousScore,
}: ScoreSummaryProps) {
  const scoreChange = previousScore ? totalScore - previousScore : null

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartPie size={24} weight="bold" />
            GEO Score Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(totalScore)}`}>
                {totalScore.toFixed(0)}
              </div>
              <div className="text-gray-500 mt-1">out of 100</div>
              {scoreChange !== null && (
                <div className="flex items-center justify-center gap-1 mt-2">
                  {scoreChange > 0 ? (
                    <TrendUp size={20} className="text-green-500" />
                  ) : scoreChange < 0 ? (
                    <TrendDown size={20} className="text-red-500" />
                  ) : null}
                  <span className={scoreChange > 0 ? 'text-green-500' : 'text-red-500'}>
                    {scoreChange > 0 ? '+' : ''}{scoreChange.toFixed(1)} from previous
                  </span>
                </div>
              )}
            </div>

            <div className="h-32 w-32">
              {/* Circular progress visualization */}
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={totalScore >= 80 ? '#22c55e' : totalScore >= 60 ? '#eab308' : '#ef4444'}
                  strokeWidth="10"
                  strokeDasharray={`${totalScore * 2.83} 283`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCORE_CONFIG.map(({ key, label, max, icon: Icon, description }) => {
          const value = breakdown[key as keyof ScoreBreakdown]
          const percentage = (value / max) * 100

          return (
            <Card key={key}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon size={24} weight="bold" />
                    </div>
                    <div>
                      <h4 className="font-medium">{label}</h4>
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl font-bold ${getScoreColor(percentage)}`}>
                      {value.toFixed(1)}
                    </span>
                    <span className="text-gray-400">/{max}</span>
                  </div>
                </div>
                <Progress
                  value={percentage}
                  className="h-2"
                />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
```

---

## 3.2 Feature: JSON-LD Schema Generator

### Overview

Automatically generates structured data markup (JSON-LD) for enhanced search visibility.

### UI Component: SchemaGenerator

```tsx
// src/components/features/schema/schema-generator.tsx
'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Code,
  Copy,
  Check,
  Download,
  Eye,
  Question,
  ListNumbers,
  Package,
  Video,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface SchemaGeneratorProps {
  productName: string
  description: string
  faqs: { question: string; answer: string }[]
  steps?: { name: string; text: string }[]
  videoUrl?: string
}

export function SchemaGenerator({
  productName,
  description,
  faqs,
  steps,
  videoUrl,
}: SchemaGeneratorProps) {
  const [copied, setCopied] = useState(false)
  const [selectedSchema, setSelectedSchema] = useState<'faq' | 'howto' | 'product' | 'video'>('faq')

  const schemas = useMemo(() => {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    }

    const howToSchema = steps ? {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `How to use ${productName}`,
      description: description,
      step: steps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.name,
        text: step.text,
      })),
    } : null

    const productSchema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: productName,
      description: description,
      brand: {
        '@type': 'Brand',
        name: 'Samsung',
      },
    }

    const videoSchema = videoUrl ? {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: productName,
      description: description,
      contentUrl: videoUrl,
      uploadDate: new Date().toISOString(),
    } : null

    return { faq: faqSchema, howto: howToSchema, product: productSchema, video: videoSchema }
  }, [productName, description, faqs, steps, videoUrl])

  const currentSchema = schemas[selectedSchema]
  const schemaString = currentSchema ? JSON.stringify(currentSchema, null, 2) : ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(schemaString)
    setCopied(true)
    toast.success('Schema copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([schemaString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedSchema}-schema.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const schemaTypes = [
    { id: 'faq', label: 'FAQ', icon: Question, available: faqs.length > 0 },
    { id: 'howto', label: 'HowTo', icon: ListNumbers, available: !!steps },
    { id: 'product', label: 'Product', icon: Package, available: true },
    { id: 'video', label: 'Video', icon: Video, available: !!videoUrl },
  ] as const

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code size={24} weight="bold" />
          JSON-LD Schema Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {schemaTypes.map(({ id, label, icon: Icon, available }) => (
            <Button
              key={id}
              variant={selectedSchema === id ? 'default' : 'outline'}
              size="sm"
              disabled={!available}
              onClick={() => setSelectedSchema(id)}
            >
              <Icon size={16} className="mr-1" />
              {label}
              {!available && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  N/A
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {currentSchema ? (
          <>
            <div className="relative">
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono max-h-[400px]">
                {schemaString}
              </pre>
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCopy}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleDownload}
                >
                  <Download size={16} />
                </Button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Eye size={20} />
                Implementation Guide
              </h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Copy the generated JSON-LD schema above</li>
                <li>Add it within a {'<script type="application/ld+json">'} tag</li>
                <li>Place it in the {'<head>'} section of your page</li>
                <li>Validate using Google Rich Results Test</li>
              </ol>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>This schema type is not available for the current content.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## 3.3 Feature: AI Simulation Preview

### Overview

Preview how AI chatbots might respond to queries about the optimized content.

### UI Component: AISimulation

```tsx
// src/components/features/simulation/ai-simulation.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Robot,
  MagnifyingGlass,
  SpinnerGap,
  CheckCircle,
  XCircle,
  ArrowRight,
} from '@phosphor-icons/react'

interface SimulationResult {
  engine: string
  query: string
  response: string
  citationLikelihood: 'high' | 'medium' | 'low'
  relevantSections: string[]
}

interface AISimulationProps {
  productName: string
  content: {
    description: string
    faq: { question: string; answer: string }[]
    keywords: string[]
  }
}

const SAMPLE_QUERIES = [
  'What is {product}?',
  'Best features of {product}',
  '{product} vs competitors',
  'How to use {product}?',
  'Is {product} worth it?',
]

const AI_ENGINES = [
  { id: 'chatgpt', name: 'ChatGPT', color: 'bg-green-500' },
  { id: 'gemini', name: 'Gemini', color: 'bg-blue-500' },
  { id: 'perplexity', name: 'Perplexity', color: 'bg-purple-500' },
  { id: 'claude', name: 'Claude', color: 'bg-orange-500' },
]

export function AISimulation({ productName, content }: AISimulationProps) {
  const [query, setQuery] = useState('')
  const [isSimulating, setIsSimulating] = useState(false)
  const [results, setResults] = useState<SimulationResult[]>([])
  const [selectedEngine, setSelectedEngine] = useState('chatgpt')

  const sampleQueries = SAMPLE_QUERIES.map(q => q.replace('{product}', productName))

  const runSimulation = async () => {
    if (!query.trim()) return

    setIsSimulating(true)
    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          productName,
          content,
          engines: [selectedEngine],
        }),
      })
      const data = await response.json()
      setResults(data.results)
    } catch (error) {
      console.error('Simulation failed:', error)
    } finally {
      setIsSimulating(false)
    }
  }

  const getCitationBadge = (likelihood: string) => {
    switch (likelihood) {
      case 'high':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle size={14} className="mr-1" />
            High Citation Likelihood
          </Badge>
        )
      case 'medium':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            Medium Citation Likelihood
          </Badge>
        )
      case 'low':
        return (
          <Badge className="bg-red-100 text-red-700">
            <XCircle size={14} className="mr-1" />
            Low Citation Likelihood
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Robot size={24} weight="bold" />
          AI Response Simulation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex gap-2">
            {AI_ENGINES.map(engine => (
              <Button
                key={engine.id}
                variant={selectedEngine === engine.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedEngine(engine.id)}
              >
                <div className={`w-2 h-2 rounded-full ${engine.color} mr-2`} />
                {engine.name}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter a query to simulate..."
              onKeyDown={(e) => e.key === 'Enter' && runSimulation()}
            />
            <Button onClick={runSimulation} disabled={isSimulating || !query.trim()}>
              {isSimulating ? (
                <SpinnerGap size={20} className="animate-spin" />
              ) : (
                <MagnifyingGlass size={20} />
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Try:</span>
            {sampleQueries.map((q, i) => (
              <Badge
                key={i}
                variant="outline"
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => setQuery(q)}
              >
                {q}
              </Badge>
            ))}
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{result.engine}</Badge>
                    <ArrowRight size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">{result.query}</span>
                  </div>
                  {getCitationBadge(result.citationLikelihood)}
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">{result.response}</p>
                </div>

                {result.relevantSections.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Content sections used:</p>
                    <div className="flex flex-wrap gap-1">
                      {result.relevantSections.map((section, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {section}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

# PART 4: PHASE 3 - ADVANCED ANALYTICS

## 4.1 Feature: Competitor Analysis

### Overview

Compare content performance against competitor products with gap analysis.

### File Structure

```
src/
  app/
    (dashboard)/
      analytics/
        competitors/
          page.tsx             # Competitor list/dashboard
          [id]/
            page.tsx           # Detailed comparison view
  components/
    features/
      analytics/
        competitor-card.tsx    # Individual competitor display
        gap-analysis.tsx       # Keyword/content gap visualization
        comparison-chart.tsx   # Side-by-side metrics
  lib/
    analytics/
      competitor-scraper.ts    # Content extraction
      gap-analyzer.ts          # Gap calculation logic
```

### UI Component: CompetitorAnalysis

```tsx
// src/components/features/analytics/competitor-analysis.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  MagnifyingGlass,
  Plus,
  ArrowsLeftRight,
  Target,
  TrendUp,
  TrendDown,
  CheckCircle,
  XCircle,
} from '@phosphor-icons/react'

interface Competitor {
  id: string
  name: string
  url: string
  geoScore: number
  lastAnalyzed: string
}

interface GapItem {
  keyword: string
  ourCoverage: boolean
  competitorCoverage: boolean
  priority: 'high' | 'medium' | 'low'
}

interface CompetitorAnalysisProps {
  productId: string
  competitors: Competitor[]
  gapAnalysis: GapItem[]
  onAddCompetitor: (url: string) => Promise<void>
}

export function CompetitorAnalysis({
  productId,
  competitors,
  gapAnalysis,
  onAddCompetitor,
}: CompetitorAnalysisProps) {
  const [newUrl, setNewUrl] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAddCompetitor = async () => {
    if (!newUrl.trim()) return
    setIsAdding(true)
    try {
      await onAddCompetitor(newUrl)
      setNewUrl('')
    } finally {
      setIsAdding(false)
    }
  }

  const ourKeywords = gapAnalysis.filter(g => g.ourCoverage).length
  const theirKeywords = gapAnalysis.filter(g => g.competitorCoverage).length
  const gaps = gapAnalysis.filter(g => !g.ourCoverage && g.competitorCoverage)
  const advantages = gapAnalysis.filter(g => g.ourCoverage && !g.competitorCoverage)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowsLeftRight size={24} weight="bold" />
            Competitor Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Enter competitor URL to analyze..."
            />
            <Button onClick={handleAddCompetitor} disabled={isAdding}>
              <Plus size={20} className="mr-1" />
              Add
            </Button>
          </div>

          <div className="grid gap-4">
            {competitors.map((competitor) => (
              <div
                key={competitor.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h4 className="font-medium">{competitor.name}</h4>
                  <p className="text-sm text-gray-500 truncate max-w-[300px]">
                    {competitor.url}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold">{competitor.geoScore}</p>
                    <p className="text-xs text-gray-500">GEO Score</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <MagnifyingGlass size={16} className="mr-1" />
                    Analyze
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{ourKeywords}</p>
              <p className="text-sm text-gray-500">Our Keywords</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{theirKeywords}</p>
              <p className="text-sm text-gray-500">Competitor Keywords</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{gaps.length}</p>
              <p className="text-sm text-gray-500">Gaps to Fill</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{advantages.length}</p>
              <p className="text-sm text-gray-500">Our Advantages</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target size={24} weight="bold" />
            Keyword Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gapAnalysis.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      item.priority === 'high'
                        ? 'destructive'
                        : item.priority === 'medium'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {item.priority}
                  </Badge>
                  <span className="font-medium">{item.keyword}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Us:</span>
                    {item.ourCoverage ? (
                      <CheckCircle size={20} className="text-green-500" weight="fill" />
                    ) : (
                      <XCircle size={20} className="text-red-500" weight="fill" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Them:</span>
                    {item.competitorCoverage ? (
                      <CheckCircle size={20} className="text-green-500" weight="fill" />
                    ) : (
                      <XCircle size={20} className="text-red-500" weight="fill" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 4.2 Feature: AI Exposure Tracker

### Overview

Monitor actual citation rates across major AI engines.

### UI Component: ExposureTracker

```tsx
// src/components/features/analytics/exposure-tracker.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Robot,
  TrendUp,
  TrendDown,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Minus,
} from '@phosphor-icons/react'

interface ExposureMetric {
  engine: string
  engineColor: string
  query: string
  isCited: boolean | null
  citationRank: number | null
  citationContext: string | null
  measuredAt: string
}

interface ExposureSummary {
  engine: string
  totalQueries: number
  citedCount: number
  avgRank: number | null
  trend: 'up' | 'down' | 'stable'
  trendValue: number
}

interface ExposureTrackerProps {
  productName: string
  metrics: ExposureMetric[]
  summary: ExposureSummary[]
  onRefresh: () => Promise<void>
}

export function ExposureTracker({
  productName,
  metrics,
  summary,
  onRefresh,
}: ExposureTrackerProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendUp size={16} className="text-green-500" />
      case 'down':
        return <TrendDown size={16} className="text-red-500" />
      default:
        return <Minus size={16} className="text-gray-400" />
    }
  }

  const getEngineColor = (engine: string) => {
    const colors: Record<string, string> = {
      chatgpt: 'bg-green-500',
      gemini: 'bg-blue-500',
      perplexity: 'bg-purple-500',
      claude: 'bg-orange-500',
    }
    return colors[engine.toLowerCase()] || 'bg-gray-500'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Robot size={24} weight="bold" />
              AI Engine Exposure for {productName}
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <Clock size={16} className="mr-1" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {summary.map((item) => (
              <div key={item.engine} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${getEngineColor(item.engine)}`} />
                  <span className="font-medium">{item.engine}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Citation Rate</span>
                    <span className="font-bold">
                      {((item.citedCount / item.totalQueries) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Avg Rank</span>
                    <span className="font-bold">
                      {item.avgRank ? `#${item.avgRank.toFixed(1)}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Trend</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(item.trend)}
                      <span className={
                        item.trend === 'up' ? 'text-green-500' :
                        item.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                      }>
                        {item.trendValue > 0 ? '+' : ''}{item.trendValue}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Measurements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.slice(0, 10).map((metric, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getEngineColor(metric.engine)}`} />
                  <span className="text-sm font-medium">{metric.engine}</span>
                  <ArrowRight size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600 max-w-[300px] truncate">
                    "{metric.query}"
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {metric.isCited === null ? (
                    <Badge variant="secondary">Pending</Badge>
                  ) : metric.isCited ? (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle size={14} className="mr-1" />
                      Cited #{metric.citationRank}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      <XCircle size={14} className="mr-1" />
                      Not Cited
                    </Badge>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(metric.measuredAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 4.3 Feature: Export Center

### Overview

Generate and download reports in various formats.

### UI Component: ExportCenter

```tsx
// src/components/features/reports/export-center.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Export,
  FilePdf,
  FileXls,
  FileCsv,
  FileJs,
  CalendarBlank,
  SpinnerGap,
  Download,
  Clock,
} from '@phosphor-icons/react'
import { format } from 'date-fns'

interface ExportJob {
  id: string
  name: string
  format: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  fileUrl: string | null
  createdAt: string
}

interface ExportCenterProps {
  recentExports: ExportJob[]
  onExport: (config: {
    reportType: string
    format: string
    dateRange: { from: Date; to: Date }
  }) => Promise<void>
}

const REPORT_TYPES = [
  { id: 'performance', label: 'Performance Summary' },
  { id: 'content', label: 'Content Analysis' },
  { id: 'competitor', label: 'Competitor Comparison' },
  { id: 'exposure', label: 'AI Exposure Report' },
  { id: 'full', label: 'Complete Report' },
]

const FORMATS = [
  { id: 'pdf', label: 'PDF', icon: FilePdf },
  { id: 'xlsx', label: 'Excel', icon: FileXls },
  { id: 'csv', label: 'CSV', icon: FileCsv },
  { id: 'json', label: 'JSON', icon: FileJs },
]

export function ExportCenter({ recentExports, onExport }: ExportCenterProps) {
  const [reportType, setReportType] = useState('performance')
  const [format, setFormat] = useState('pdf')
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport({ reportType, format, dateRange })
    } finally {
      setIsExporting(false)
    }
  }

  const getFormatIcon = (fmt: string) => {
    const FormatIcon = FORMATS.find(f => f.id === fmt)?.icon || FileJs
    return <FormatIcon size={20} />
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Export size={24} weight="bold" />
            Export Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <div className="flex gap-2">
                {FORMATS.map(fmt => (
                  <Button
                    key={fmt.id}
                    variant={format === fmt.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormat(fmt.id)}
                  >
                    <fmt.icon size={16} className="mr-1" />
                    {fmt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarBlank size={16} className="mr-2" />
                    {format(dateRange.from, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                  />
                </PopoverContent>
              </Popover>
              <span className="self-center text-gray-500">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarBlank size={16} className="mr-2" />
                    {format(dateRange.to, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button onClick={handleExport} disabled={isExporting} className="w-full">
            {isExporting ? (
              <SpinnerGap size={20} className="animate-spin mr-2" />
            ) : (
              <Export size={20} className="mr-2" />
            )}
            Generate Report
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={24} weight="bold" />
            Recent Exports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentExports.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getFormatIcon(job.format)}
                  <div>
                    <p className="font-medium">{job.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(job.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      job.status === 'completed' ? 'outline' :
                      job.status === 'processing' ? 'default' :
                      job.status === 'failed' ? 'destructive' : 'secondary'
                    }
                  >
                    {job.status}
                  </Badge>
                  {job.fileUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={job.fileUrl} download>
                        <Download size={16} />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

# PART 5: API SPECIFICATIONS

## 5.1 New API Endpoints

### Batch Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/batch-jobs` | Create new batch job |
| GET | `/api/batch-jobs` | List batch jobs |
| GET | `/api/batch-jobs/[id]` | Get batch job status |
| POST | `/api/batch-jobs/[id]/pause` | Pause running job |
| POST | `/api/batch-jobs/[id]/cancel` | Cancel job |
| POST | `/api/batch-jobs/[id]/resume` | Resume paused job |

### Prompt Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/prompts` | List all prompt versions |
| POST | `/api/prompts` | Create new prompt version |
| GET | `/api/prompts/[id]` | Get prompt details |
| PUT | `/api/prompts/[id]` | Update prompt |
| POST | `/api/prompts/[id]/activate` | Set as active version |
| POST | `/api/prompts/[id]/test` | Test prompt with sample input |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/exposure` | Get AI exposure metrics |
| POST | `/api/analytics/exposure/measure` | Trigger exposure measurement |
| GET | `/api/analytics/competitors` | List tracked competitors |
| POST | `/api/analytics/competitors` | Add competitor to track |
| GET | `/api/analytics/competitors/[id]` | Get competitor analysis |
| POST | `/api/analytics/competitors/[id]/analyze` | Refresh competitor analysis |

### Exports

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/exports` | Create export job |
| GET | `/api/exports` | List export jobs |
| GET | `/api/exports/[id]` | Get export status/download |

### Simulation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulate` | Run AI response simulation |

---

# PART 6: IMPLEMENTATION PRIORITY

## 6.1 Priority Matrix

### P0 - Critical (Weeks 1-2)

| Feature | Impact | Effort | Dependencies |
|---------|--------|--------|--------------|
| 100-Point Score Report | High | Medium | Existing scoring logic |
| Settings Page (Basic) | High | Low | None |
| Prompt Manager UI | High | Medium | New DB tables |

### P1 - High Priority (Weeks 3-4)

| Feature | Impact | Effort | Dependencies |
|---------|--------|--------|--------------|
| Weight Controller | High | Medium | scoring_weights table |
| Bulk Data Uploader | High | High | batch_jobs tables |
| JSON-LD Schema Generator | Medium | Low | None |

### P2 - Medium Priority (Weeks 5-6)

| Feature | Impact | Effort | Dependencies |
|---------|--------|--------|--------------|
| Batch Runner | Medium | High | Bulk uploader |
| Diff Viewer | Medium | Medium | Batch runner |
| AI Simulation | Medium | Medium | None |

### P3 - Lower Priority (Weeks 7-8)

| Feature | Impact | Effort | Dependencies |
|---------|--------|--------|--------------|
| Competitor Analysis | Medium | High | External scraping |
| AI Exposure Tracker | Medium | High | External API calls |
| Export Center | Low | Medium | All analytics |

## 6.2 Development Sequence

```
Week 1-2: Foundation
  - Database migrations for new tables
  - 100-Point Score Report UI
  - Settings page skeleton
  - Prompt Manager backend + UI

Week 3-4: Tuning Tools
  - Weight Controller UI
  - Bulk Data Uploader
  - JSON-LD Schema Generator

Week 5-6: Batch Processing
  - Batch Runner implementation
  - Diff Viewer for validation
  - AI Simulation preview

Week 7-8: Analytics
  - Competitor Analysis foundation
  - AI Exposure Tracker
  - Export Center
```

---

# PART 7: FILE STRUCTURE SUMMARY

## 7.1 New Directories

```
src/
  app/
    (dashboard)/
      tuning/                    # Phase 1 - Tuning Console
        page.tsx                 # Tuning dashboard
        upload/
          page.tsx               # Bulk upload page
        prompts/
          page.tsx               # Prompt list
          [id]/
            page.tsx             # Prompt editor
        validation/
          page.tsx               # Validation results
      analytics/                 # Phase 3 - Analytics
        page.tsx                 # Analytics dashboard
        competitors/
          page.tsx               # Competitor tracking
          [id]/
            page.tsx             # Competitor detail
        exposure/
          page.tsx               # AI exposure tracking
      reports/
        page.tsx                 # Export center
      settings/
        page.tsx                 # Settings page
    api/
      batch-jobs/
        route.ts
        [id]/
          route.ts
          pause/
            route.ts
          cancel/
            route.ts
      bulk-upload/
        route.ts
        parse/
          route.ts
      prompts/
        route.ts
        [id]/
          route.ts
          activate/
            route.ts
          test/
            route.ts
      weights/
        route.ts
        [id]/
          route.ts
      analytics/
        exposure/
          route.ts
          measure/
            route.ts
        competitors/
          route.ts
          [id]/
            route.ts
            analyze/
              route.ts
      exports/
        route.ts
        [id]/
          route.ts
      simulate/
        route.ts
  components/
    features/
      navigation/                # Cross-cutting: Navigation Architecture (0.1)
        nav-config.ts            # Navigation configuration with phase flags
        desktop-nav.tsx          # Desktop navigation with dropdowns
        mobile-nav.tsx           # Mobile navigation with sheet/drawer
        nav-item.tsx             # Reusable navigation item component
        nav-submenu.tsx          # Submenu component for nested items
      bulk-upload/
        uploader.tsx
        preview-table.tsx
        mapping-dialog.tsx
        progress-tracker.tsx
        mobile-uploader.tsx      # Mobile-optimized upload (0.7)
      prompt-manager/
        prompt-editor.tsx
        version-history.tsx
        test-panel.tsx
        diff-viewer.tsx
      tuning/
        weight-controller.tsx
        batch-runner.tsx
        diff-viewer.tsx
      score-report/
        score-summary.tsx
        score-breakdown.tsx
        improvement-tips.tsx
        score-history.tsx
      schema/
        schema-generator.tsx
        schema-preview.tsx
      simulation/
        ai-simulation.tsx
      analytics/
        competitor-analysis.tsx
        gap-analysis.tsx
        comparison-chart.tsx
        exposure-tracker.tsx
      reports/
        export-center.tsx
    ui/
      accessible-slider.tsx      # WCAG 2.1 AA slider (0.5)
      accessible-diff.tsx        # Accessible diff viewer (0.5)
      error-boundary.tsx         # Route-level error boundary (0.4)
      virtualized-list.tsx       # Performance: large list handling (0.6)
  hooks/
    use-feature-flags.ts         # Phase-based feature flags (0.1)
    use-accessible-slider.ts     # Accessibility hook for sliders
    use-virtual-scroll.ts        # Performance: virtualization hook
  stores/
    tuning-store.ts              # Zustand store for tuning (0.3)
    analytics-store.ts           # Zustand store for analytics (0.3)
  lib/
    api/
      error-handler.ts           # API error classes and handling (0.4)
      error-types.ts             # Error type definitions
    batch/
      error-recovery.ts          # Batch job error recovery (0.4)
      retry-queue.ts             # Exponential backoff retry logic
    bulk-upload/
      parser.ts
      validator.ts
      processor.ts
    analytics/
      competitor-scraper.ts
      gap-analyzer.ts
      exposure-measurer.ts
    exports/
      pdf-generator.ts
      excel-generator.ts
  workers/
    diff-worker.ts               # Web worker for large diffs (0.6)
    batch-processor-worker.ts    # Background batch processing
  types/
    tuning.ts
    analytics.ts
    exports.ts
    navigation.ts                # Navigation type definitions
    errors.ts                    # Error type definitions
```

---

# APPENDIX A: MIGRATION SCRIPTS

## A.1 Initial Migration

```sql
-- Migration: 001_phase1_tables.sql

-- Prompt versions table
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  version VARCHAR(20) NOT NULL,
  engine VARCHAR(20) NOT NULL CHECK (engine IN ('gemini', 'perplexity', 'cohere')),
  system_prompt TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  performance_score DECIMAL(5,2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, version)
);

-- Scoring weights table
CREATE TABLE IF NOT EXISTS scoring_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  version VARCHAR(20) NOT NULL,
  weights JSONB NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batch jobs table
CREATE TABLE IF NOT EXISTS batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  total_items INTEGER NOT NULL,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  config JSONB,
  results JSONB,
  error_log TEXT[],
  estimated_cost DECIMAL(10,4),
  actual_cost DECIMAL(10,4),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batch job items table
CREATE TABLE IF NOT EXISTS batch_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_job_id UUID NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  input_data JSONB NOT NULL,
  output_data JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Validation results table
CREATE TABLE IF NOT EXISTS validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES generations(id),
  prompt_version_id UUID REFERENCES prompt_versions(id),
  weights_version_id UUID REFERENCES scoring_weights(id),
  ai_scores JSONB NOT NULL,
  human_scores JSONB,
  score_diff DECIMAL(5,2),
  validation_status VARCHAR(20) DEFAULT 'pending',
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_prompt_versions_active ON prompt_versions(is_active, engine);
CREATE INDEX idx_batch_jobs_status ON batch_jobs(status, created_at DESC);
CREATE INDEX idx_batch_items_job ON batch_job_items(batch_job_id, sequence_number);
CREATE INDEX idx_validation_generation ON validation_results(generation_id);
```

## A.2 Phase 3 Migration

```sql
-- Migration: 002_phase3_tables.sql

-- Competitor analyses table
CREATE TABLE IF NOT EXISTS competitor_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  competitor_name VARCHAR(255) NOT NULL,
  competitor_url TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  analysis_data JSONB NOT NULL,
  keyword_coverage DECIMAL(5,2),
  gap_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- AI exposure metrics table
CREATE TABLE IF NOT EXISTS ai_exposure_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  generation_id UUID REFERENCES generations(id),
  engine VARCHAR(50) NOT NULL,
  query_text TEXT NOT NULL,
  is_cited BOOLEAN,
  citation_rank INTEGER,
  citation_context TEXT,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  measurement_method VARCHAR(50),
  raw_response JSONB
);

-- User feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES generations(id),
  user_id UUID REFERENCES users(id),
  feedback_type VARCHAR(50) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  improvement_suggestions TEXT[],
  context_useful BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Export reports table
CREATE TABLE IF NOT EXISTS export_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  format VARCHAR(20) NOT NULL,
  filters JSONB,
  file_url TEXT,
  file_size_bytes INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_competitor_product ON competitor_analyses(product_id, created_at DESC);
CREATE INDEX idx_exposure_product ON ai_exposure_metrics(product_id, measured_at DESC);
CREATE INDEX idx_exposure_generation ON ai_exposure_metrics(generation_id);
CREATE INDEX idx_feedback_generation ON user_feedback(generation_id);

-- Modify generations table
ALTER TABLE generations ADD COLUMN IF NOT EXISTS geo_score_v2 JSONB;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS json_ld_schema TEXT;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS schema_type VARCHAR(50);
ALTER TABLE generations ADD COLUMN IF NOT EXISTS simulation_results JSONB;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS created_with_prompt_version UUID REFERENCES prompt_versions(id);
```

---

# APPENDIX B: ENVIRONMENT VARIABLES

## B.1 Phase Feature Flags (Required)

```bash
# Phase-Based Feature Activation
# These control which features are visible/accessible in the UI
# Set to 'true' to enable, 'false' or omit to disable

NEXT_PUBLIC_PHASE1_ENABLED=true    # Tuning Console features
NEXT_PUBLIC_PHASE2_ENABLED=false   # Production Service features
NEXT_PUBLIC_PHASE3_ENABLED=false   # Analytics & Feedback features

# Default Rollout (recommended production values)
# Phase 1: true  (after 2026-01-24)
# Phase 2: true  (after 2026-02-28)
# Phase 3: true  (after 2026-03-31)
```

## B.2 Existing Environment Variables (Reference)

```bash
# Supabase (Required - existing)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# LLM API Keys (Required - existing)
GOOGLE_GEMINI_API_KEY=               # Gemini Pro for content generation
PERPLEXITY_API_KEY=                  # Perplexity for research
COHERE_API_KEY=                      # Cohere for embeddings

# Pinecone (Required - existing)
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX_NAME=
```

## B.3 Phase-Specific Environment Variables

```bash
# Phase 1 - Tuning Console
# No additional env vars required - uses existing API keys

# Phase 2 - Production Service
# No additional env vars required

# Phase 3 - Analytics
SCRAPER_API_KEY=                     # Optional: For competitor content scraping
SERP_API_KEY=                        # Optional: For search result analysis

# Export Generation (Phase 3)
AWS_S3_BUCKET=                       # Optional: For storing generated reports
AWS_S3_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

## B.4 Performance & Monitoring (Optional)

```bash
# Error Tracking
SENTRY_DSN=                          # Optional: Error reporting

# Performance Monitoring
NEXT_PUBLIC_ANALYTICS_ID=            # Optional: Analytics tracking

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000           # Default: 1 minute
RATE_LIMIT_MAX_REQUESTS=100          # Default: 100 requests per window
```

## B.5 Environment Variable Validation

The application validates required environment variables at startup.
Missing required variables will cause build/startup failures with clear error messages.

```typescript
// Validation happens in: src/lib/env-validation.ts
// Required variables are checked:
// - NEXT_PUBLIC_SUPABASE_URL
// - NEXT_PUBLIC_SUPABASE_ANON_KEY
// - At least one LLM API key (GOOGLE_GEMINI_API_KEY or PERPLEXITY_API_KEY)
// - PINECONE_API_KEY (if vector features enabled)
```

---

Document Version: 1.1
Created: 2026-01-01
Last Updated: 2026-01-01
Updates: Added PART 0 (Navigation & Cross-Cutting Architecture) based on alignment evaluation
