import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Types
export interface Competitor {
  id: string
  name: string
  domain: string
  trackedKeywords: string[]
  lastAnalyzedAt?: string
  createdAt: string
}

export interface CompetitorAnalysis {
  id: string
  competitorId: string
  keyword: string
  ourScore: number
  competitorScore: number
  gap: number
  insights: string[]
  analyzedAt: string
}

export interface ExposureMetric {
  id: string
  productId: string
  aiPlatform: 'chatgpt' | 'gemini' | 'perplexity' | 'claude'
  query: string
  mentioned: boolean
  position?: number
  snippet?: string
  measuredAt: string
}

export interface ExportReport {
  id: string
  name: string
  type: 'pdf' | 'excel' | 'json'
  status: 'generating' | 'ready' | 'failed'
  downloadUrl?: string
  createdAt: string
  expiresAt?: string
}

export interface DateRange {
  from: Date
  to: Date
}

// State
interface AnalyticsState {
  // Competitors
  competitors: Competitor[]
  competitorAnalyses: CompetitorAnalysis[]
  selectedCompetitorId: string | null
  competitorsLoading: boolean
  competitorsError: string | null

  // Exposure
  exposureMetrics: ExposureMetric[]
  selectedPlatforms: ExposureMetric['aiPlatform'][]
  exposureLoading: boolean
  exposureError: string | null

  // Reports
  reports: ExportReport[]
  reportsLoading: boolean
  reportsError: string | null

  // UI State
  dateRange: DateRange | null
  viewMode: 'table' | 'chart'
  comparisonEnabled: boolean
}

// Actions
interface AnalyticsActions {
  // Competitors
  setCompetitors: (competitors: Competitor[]) => void
  addCompetitor: (competitor: Competitor) => void
  updateCompetitor: (id: string, updates: Partial<Competitor>) => void
  removeCompetitor: (id: string) => void
  setSelectedCompetitor: (id: string | null) => void
  setCompetitorAnalyses: (analyses: CompetitorAnalysis[]) => void
  addCompetitorAnalysis: (analysis: CompetitorAnalysis) => void
  setCompetitorsLoading: (loading: boolean) => void
  setCompetitorsError: (error: string | null) => void

  // Exposure
  setExposureMetrics: (metrics: ExposureMetric[]) => void
  addExposureMetric: (metric: ExposureMetric) => void
  setSelectedPlatforms: (platforms: ExposureMetric['aiPlatform'][]) => void
  togglePlatform: (platform: ExposureMetric['aiPlatform']) => void
  setExposureLoading: (loading: boolean) => void
  setExposureError: (error: string | null) => void

  // Reports
  setReports: (reports: ExportReport[]) => void
  addReport: (report: ExportReport) => void
  updateReport: (id: string, updates: Partial<ExportReport>) => void
  removeReport: (id: string) => void
  setReportsLoading: (loading: boolean) => void
  setReportsError: (error: string | null) => void

  // UI State
  setDateRange: (range: DateRange | null) => void
  setViewMode: (mode: 'table' | 'chart') => void
  setComparisonEnabled: (enabled: boolean) => void

  // Reset
  reset: () => void
}

const initialState: AnalyticsState = {
  competitors: [],
  competitorAnalyses: [],
  selectedCompetitorId: null,
  competitorsLoading: false,
  competitorsError: null,

  exposureMetrics: [],
  selectedPlatforms: ['chatgpt', 'gemini', 'perplexity', 'claude'],
  exposureLoading: false,
  exposureError: null,

  reports: [],
  reportsLoading: false,
  reportsError: null,

  dateRange: null,
  viewMode: 'table',
  comparisonEnabled: false,
}

export const useAnalyticsStore = create<AnalyticsState & AnalyticsActions>()(
  devtools(
    (set) => ({
      ...initialState,

      // Competitors
      setCompetitors: (competitors) => set({ competitors }),
      addCompetitor: (competitor) =>
        set((state) => ({ competitors: [...state.competitors, competitor] })),
      updateCompetitor: (id, updates) =>
        set((state) => ({
          competitors: state.competitors.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),
      removeCompetitor: (id) =>
        set((state) => ({
          competitors: state.competitors.filter((c) => c.id !== id),
          selectedCompetitorId:
            state.selectedCompetitorId === id
              ? null
              : state.selectedCompetitorId,
        })),
      setSelectedCompetitor: (id) => set({ selectedCompetitorId: id }),
      setCompetitorAnalyses: (analyses) =>
        set({ competitorAnalyses: analyses }),
      addCompetitorAnalysis: (analysis) =>
        set((state) => ({
          competitorAnalyses: [...state.competitorAnalyses, analysis],
        })),
      setCompetitorsLoading: (loading) => set({ competitorsLoading: loading }),
      setCompetitorsError: (error) => set({ competitorsError: error }),

      // Exposure
      setExposureMetrics: (metrics) => set({ exposureMetrics: metrics }),
      addExposureMetric: (metric) =>
        set((state) => ({
          exposureMetrics: [...state.exposureMetrics, metric],
        })),
      setSelectedPlatforms: (platforms) =>
        set({ selectedPlatforms: platforms }),
      togglePlatform: (platform) =>
        set((state) => ({
          selectedPlatforms: state.selectedPlatforms.includes(platform)
            ? state.selectedPlatforms.filter((p) => p !== platform)
            : [...state.selectedPlatforms, platform],
        })),
      setExposureLoading: (loading) => set({ exposureLoading: loading }),
      setExposureError: (error) => set({ exposureError: error }),

      // Reports
      setReports: (reports) => set({ reports }),
      addReport: (report) =>
        set((state) => ({ reports: [...state.reports, report] })),
      updateReport: (id, updates) =>
        set((state) => ({
          reports: state.reports.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),
      removeReport: (id) =>
        set((state) => ({
          reports: state.reports.filter((r) => r.id !== id),
        })),
      setReportsLoading: (loading) => set({ reportsLoading: loading }),
      setReportsError: (error) => set({ reportsError: error }),

      // UI State
      setDateRange: (range) => set({ dateRange: range }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setComparisonEnabled: (enabled) => set({ comparisonEnabled: enabled }),

      // Reset
      reset: () => set(initialState),
    }),
    { name: 'AnalyticsStore' }
  )
)

// Selectors
export const selectSelectedCompetitor = (state: AnalyticsState) =>
  state.competitors.find((c) => c.id === state.selectedCompetitorId)

export const selectAnalysesForCompetitor = (
  state: AnalyticsState,
  competitorId: string
) => state.competitorAnalyses.filter((a) => a.competitorId === competitorId)

export const selectExposureByPlatform = (
  state: AnalyticsState,
  platform: ExposureMetric['aiPlatform']
) => state.exposureMetrics.filter((m) => m.aiPlatform === platform)

export const selectReadyReports = (state: AnalyticsState) =>
  state.reports.filter((r) => r.status === 'ready')

export const selectPendingReports = (state: AnalyticsState) =>
  state.reports.filter((r) => r.status === 'generating')
