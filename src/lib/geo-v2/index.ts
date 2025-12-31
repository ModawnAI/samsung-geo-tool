/**
 * GEO v2 Module Exports
 * Barrel file for all v2 pipeline modules
 */

// USP Extraction
export {
  extractUSPs,
  USP_CATEGORY_LABELS,
  type ExtractUSPsParams,
} from './usp-extraction'

// Anti-Fabrication Guardrails
export {
  checkForFabrications,
  sanitizeContent,
  determineConfidenceLevel,
  generateSafeLanguage,
  validateCaseStudy,
  passesQualityGate,
  getAntiFabricationPrompt,
} from './anti-fabrication'

// Grounding Quality Scoring
export {
  calculateGroundingQualityScore,
  getSourceTier,
  extractGroundingSources,
  aggregateGroundingMetadata,
  getGroundingQualityDescription,
  formatGroundingScore,
} from './grounding-scorer'

// Pipeline Orchestrator
export {
  GEOv2Pipeline,
  executeGEOv2Pipeline,
  PIPELINE_CONFIGS,
  type PipelineInput,
  type PipelineContext,
  type PipelineConfig,
} from './pipeline'

// Export Functionality
export {
  exportToJSON,
  exportToTextReport,
  generateExportFilename,
  createExportBlob,
} from './export'

// Analytics
export {
  trackSourceClick,
  getAnalyticsData,
  getSourceClickCount,
  getSectionClickCount,
  getTopClickedSources,
  getAnalyticsSummary,
  logAnalyticsSummary,
  clearAnalyticsData,
  exportAnalyticsData,
  createSourceClickHandler,
  createSectionTracker,
} from './analytics'

// Progress Tracking
export {
  createInitialProgressState,
  updateProgressState,
  getStageIcon,
  getStageName,
  formatProgressPercentage,
  formatTime,
  getStageStatus,
  getStageStatusIndicator,
  generateProgressBar,
  generateProgressDisplay,
  createConsoleProgressLogger,
  estimatePipelineTime,
  type ProgressState,
} from './progress'

// Re-export types from types/geo-v2
export type {
  USPCategory,
  ConfidenceLevel,
  USPEvidence,
  UniqueSellingPoint,
  USPExtractionResult,
  GroundingSource,
  GroundingMetadata,
  GroundingQualityScore,
  GEOv2Score,
  FAQItem,
  FAQResult,
  CaseStudy,
  CaseStudyResult,
  PipelineStage,
  PipelineProgress,
  GEOv2GenerateResponse,
  ExportOptions,
  TextExportSections,
  SourceClickEvent,
  AnalyticsData,
} from '@/types/geo-v2'

export {
  SOURCE_AUTHORITY_TIERS,
  SAFE_LANGUAGE_PATTERNS,
  PIPELINE_STAGES,
  STAGE_PROGRESS_MAP,
} from '@/types/geo-v2'
