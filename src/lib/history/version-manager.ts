/**
 * Version Manager for Generation Version History
 * Phase 2.4: Manages version snapshots for content generations
 */

import { createClient } from '@/lib/supabase/client'
import type { Database, Json } from '@/types/database'

// ==========================================
// TYPES
// ==========================================

type GenerationVersion = Database['public']['Tables']['generation_versions']['Row']
type GenerationVersionInsert = Database['public']['Tables']['generation_versions']['Insert']

// Type helper for Supabase client with proper generics
type SupabaseClient = ReturnType<typeof createClient>

export interface VersionContent {
  description: string | null
  timestamps: string | null
  hashtags: string[]
  faq: Json | null
  usps: Json | null
  caseStudies: Json | null
  keywords: Json | null
  chapters: Json | null
}

export interface VersionMetadata {
  selectedKeywords: string[]
  campaignTag: string | null
  geoScoreV2: Json | null
  qualityScores: Json | null
  finalScore: number | null
}

export interface VersionConfig {
  promptVersionId?: string
  weightsVersionId?: string
  generationConfig?: Json
}

export interface SaveVersionParams {
  generationId: string
  userId: string
  productId: string
  content: VersionContent
  metadata: VersionMetadata
  config?: VersionConfig
  srtContent?: string
  versionLabel?: string
  changeSummary?: string
  setAsCurrent?: boolean
}

export interface VersionComparison {
  versionA: GenerationVersion
  versionB: GenerationVersion
  differences: {
    field: string
    valueA: unknown
    valueB: unknown
  }[]
  summary: string
}

export interface VersionListOptions {
  limit?: number
  offset?: number
  starredOnly?: boolean
  currentOnly?: boolean
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Generate SHA256 hash for SRT content to track changes
 * Note: Using simple hash for browser compatibility
 */
async function hashSrtContent(srtContent: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(srtContent)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Compare two values and determine if they differ
 */
function valuesDiffer(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

// ==========================================
// VERSION MANAGER CLASS
// ==========================================

export class VersionManager {
  private getSupabase(): SupabaseClient {
    return createClient()
  }

  /**
   * Get next version number for a generation
   */
  private async getNextVersionNumber(generationId: string): Promise<number> {
    const supabase = this.getSupabase()

    const { data } = await supabase
      .from('generation_versions')
      .select('version_number')
      .eq('generation_id', generationId)
      .order('version_number', { ascending: false })
      .limit(1)

    const versions = data as GenerationVersion[] | null
    return (versions?.[0]?.version_number ?? 0) + 1
  }

  /**
   * Save a new version of generated content
   */
  async saveVersion(params: SaveVersionParams): Promise<{
    success: boolean
    version?: GenerationVersion
    error?: string
  }> {
    try {
      const supabase = this.getSupabase()
      const nextVersionNumber = await this.getNextVersionNumber(params.generationId)

      // Generate hash for SRT content if provided
      const srtHash = params.srtContent
        ? await hashSrtContent(params.srtContent)
        : null

      // Prepare insert data
      const insertData: GenerationVersionInsert = {
        generation_id: params.generationId,
        user_id: params.userId,
        product_id: params.productId,
        version_number: nextVersionNumber,
        version_label: params.versionLabel || `Version ${nextVersionNumber}`,

        // Content snapshot
        description: params.content.description,
        timestamps: params.content.timestamps,
        hashtags: params.content.hashtags,
        faq: params.content.faq,
        usps: params.content.usps,
        case_studies: params.content.caseStudies,
        keywords: params.content.keywords,
        chapters: params.content.chapters,

        // Metadata
        srt_content_hash: srtHash,
        selected_keywords: params.metadata.selectedKeywords,
        campaign_tag: params.metadata.campaignTag,

        // Scores
        geo_score_v2: params.metadata.geoScoreV2,
        quality_scores: params.metadata.qualityScores,
        final_score: params.metadata.finalScore,

        // Config
        prompt_version_id: params.config?.promptVersionId,
        weights_version_id: params.config?.weightsVersionId,
        generation_config: params.config?.generationConfig,

        // Version metadata
        change_summary: params.changeSummary,
        is_current: params.setAsCurrent ?? false,
        is_starred: false,
      }

      // Insert new version
      const { data: newVersion, error: insertError } = await supabase
        .from('generation_versions')
        .insert(insertData as never)
        .select()
        .single()

      if (insertError) {
        return { success: false, error: insertError.message }
      }

      const version = newVersion as GenerationVersion

      // If setting as current, unset other current flags
      if (params.setAsCurrent && version) {
        await this.setCurrentVersion(version.id, params.generationId)
      }

      return { success: true, version }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving version'
      }
    }
  }

  /**
   * List all versions for a generation
   */
  async listVersions(
    generationId: string,
    options: VersionListOptions = {}
  ): Promise<{
    success: boolean
    versions?: GenerationVersion[]
    total?: number
    error?: string
  }> {
    try {
      const supabase = this.getSupabase()

      let query = supabase
        .from('generation_versions')
        .select('*', { count: 'exact' })
        .eq('generation_id', generationId)
        .order('version_number', { ascending: false })

      if (options.starredOnly) {
        query = query.eq('is_starred', true)
      }

      if (options.currentOnly) {
        query = query.eq('is_current', true)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data, error, count } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        versions: data as GenerationVersion[],
        total: count ?? 0
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error listing versions'
      }
    }
  }

  /**
   * Get a specific version by ID or version number
   */
  async getVersion(
    generationId: string,
    versionIdOrNumber: string | number
  ): Promise<{
    success: boolean
    version?: GenerationVersion
    error?: string
  }> {
    try {
      const supabase = this.getSupabase()

      let query = supabase
        .from('generation_versions')
        .select('*')
        .eq('generation_id', generationId)

      if (typeof versionIdOrNumber === 'number') {
        query = query.eq('version_number', versionIdOrNumber)
      } else {
        query = query.eq('id', versionIdOrNumber)
      }

      const { data, error } = await query.single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, version: data as GenerationVersion }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting version'
      }
    }
  }

  /**
   * Get the current version for a generation
   */
  async getCurrentVersion(generationId: string): Promise<{
    success: boolean
    version?: GenerationVersion
    error?: string
  }> {
    try {
      const supabase = this.getSupabase()

      const { data, error } = await supabase
        .from('generation_versions')
        .select('*')
        .eq('generation_id', generationId)
        .eq('is_current', true)
        .single()

      if (error) {
        // No current version found, get latest
        const { data: latestData, error: latestError } = await supabase
          .from('generation_versions')
          .select('*')
          .eq('generation_id', generationId)
          .order('version_number', { ascending: false })
          .limit(1)
          .single()

        if (latestError) {
          return { success: false, error: 'No versions found' }
        }

        return { success: true, version: latestData as GenerationVersion }
      }

      return { success: true, version: data as GenerationVersion }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting current version'
      }
    }
  }

  /**
   * Set a version as the current active version
   */
  async setCurrentVersion(
    versionId: string,
    generationId?: string
  ): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const supabase = this.getSupabase()

      // Get the generation_id if not provided
      let genId = generationId
      if (!genId) {
        const { data: versionData } = await supabase
          .from('generation_versions')
          .select('generation_id')
          .eq('id', versionId)
          .single()

        const version = versionData as GenerationVersion | null
        genId = version?.generation_id
      }

      if (!genId) {
        return { success: false, error: 'Could not determine generation ID' }
      }

      // Unset all current flags for this generation
      await supabase
        .from('generation_versions')
        .update({ is_current: false } as never)
        .eq('generation_id', genId)

      // Set the specified version as current
      await supabase
        .from('generation_versions')
        .update({ is_current: true } as never)
        .eq('id', versionId)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error setting current version'
      }
    }
  }

  /**
   * Restore a previous version to the generations table
   */
  async restoreVersion(
    versionId: string,
    generationId: string
  ): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const supabase = this.getSupabase()

      // Get the version to restore
      const { version, error: getError } = await this.getVersion(generationId, versionId)

      if (getError || !version) {
        return { success: false, error: getError || 'Version not found' }
      }

      // Update the main generation record with version content
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          description: version.description,
          timestamps: version.timestamps,
          hashtags: version.hashtags,
          faq: version.faq,
          selected_keywords: version.selected_keywords,
          campaign_tag: version.campaign_tag,
          geo_score_v2: version.geo_score_v2,
        } as never)
        .eq('id', generationId)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      // Set this version as current
      await this.setCurrentVersion(versionId, generationId)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error restoring version'
      }
    }
  }

  /**
   * Compare two versions and identify differences
   */
  async compareVersions(
    generationId: string,
    versionIdA: string,
    versionIdB: string
  ): Promise<{
    success: boolean
    comparison?: VersionComparison
    error?: string
  }> {
    try {
      // Fetch both versions
      const [resultA, resultB] = await Promise.all([
        this.getVersion(generationId, versionIdA),
        this.getVersion(generationId, versionIdB)
      ])

      if (!resultA.success || !resultA.version) {
        return { success: false, error: `Version A not found: ${resultA.error}` }
      }

      if (!resultB.success || !resultB.version) {
        return { success: false, error: `Version B not found: ${resultB.error}` }
      }

      const versionA = resultA.version
      const versionB = resultB.version

      // Compare content fields
      const fieldsToCompare = [
        'description',
        'timestamps',
        'hashtags',
        'faq',
        'usps',
        'case_studies',
        'keywords',
        'chapters',
        'selected_keywords',
        'campaign_tag',
        'geo_score_v2',
        'quality_scores',
        'final_score',
      ] as const

      const differences: VersionComparison['differences'] = []

      for (const field of fieldsToCompare) {
        const valueA = versionA[field]
        const valueB = versionB[field]

        if (valuesDiffer(valueA, valueB)) {
          differences.push({ field, valueA, valueB })
        }
      }

      // Generate summary
      const summary = differences.length === 0
        ? 'Versions are identical'
        : `${differences.length} field(s) differ: ${differences.map(d => d.field).join(', ')}`

      return {
        success: true,
        comparison: {
          versionA,
          versionB,
          differences,
          summary,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error comparing versions'
      }
    }
  }

  /**
   * Toggle starred status for a version
   */
  async toggleStarred(versionId: string): Promise<{
    success: boolean
    isStarred?: boolean
    error?: string
  }> {
    try {
      const supabase = this.getSupabase()

      // Get current starred status
      const { data: current, error: getError } = await supabase
        .from('generation_versions')
        .select('is_starred')
        .eq('id', versionId)
        .single()

      if (getError) {
        return { success: false, error: getError.message }
      }

      const currentVersion = current as Pick<GenerationVersion, 'is_starred'>
      const newStatus = !currentVersion.is_starred

      // Update starred status
      const { error: updateError } = await supabase
        .from('generation_versions')
        .update({ is_starred: newStatus } as never)
        .eq('id', versionId)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      return { success: true, isStarred: newStatus }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error toggling starred'
      }
    }
  }

  /**
   * Update version label
   */
  async updateVersionLabel(
    versionId: string,
    label: string
  ): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const supabase = this.getSupabase()

      const { error } = await supabase
        .from('generation_versions')
        .update({ version_label: label } as never)
        .eq('id', versionId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error updating label'
      }
    }
  }

  /**
   * Delete a version (only non-current versions)
   */
  async deleteVersion(versionId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const supabase = this.getSupabase()

      // Check if it's the current version
      const { data: version, error: getError } = await supabase
        .from('generation_versions')
        .select('is_current')
        .eq('id', versionId)
        .single()

      if (getError) {
        return { success: false, error: getError.message }
      }

      const versionData = version as Pick<GenerationVersion, 'is_current'>
      if (versionData.is_current) {
        return { success: false, error: 'Cannot delete the current version' }
      }

      // Delete the version
      const { error: deleteError } = await supabase
        .from('generation_versions')
        .delete()
        .eq('id', versionId)

      if (deleteError) {
        return { success: false, error: deleteError.message }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error deleting version'
      }
    }
  }

  /**
   * Get version count for a generation
   */
  async getVersionCount(generationId: string): Promise<{
    success: boolean
    count?: number
    error?: string
  }> {
    try {
      const supabase = this.getSupabase()

      const { count, error } = await supabase
        .from('generation_versions')
        .select('*', { count: 'exact', head: true })
        .eq('generation_id', generationId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, count: count ?? 0 }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting count'
      }
    }
  }
}

// Export singleton instance
export const versionManager = new VersionManager()

// Export convenience functions
export const saveVersion = (params: SaveVersionParams) => versionManager.saveVersion(params)
export const listVersions = (generationId: string, options?: VersionListOptions) =>
  versionManager.listVersions(generationId, options)
export const getVersion = (generationId: string, versionIdOrNumber: string | number) =>
  versionManager.getVersion(generationId, versionIdOrNumber)
export const getCurrentVersion = (generationId: string) =>
  versionManager.getCurrentVersion(generationId)
export const setCurrentVersion = (versionId: string, generationId?: string) =>
  versionManager.setCurrentVersion(versionId, generationId)
export const restoreVersion = (versionId: string, generationId: string) =>
  versionManager.restoreVersion(versionId, generationId)
export const compareVersions = (generationId: string, versionIdA: string, versionIdB: string) =>
  versionManager.compareVersions(generationId, versionIdA, versionIdB)
export const toggleStarred = (versionId: string) =>
  versionManager.toggleStarred(versionId)
