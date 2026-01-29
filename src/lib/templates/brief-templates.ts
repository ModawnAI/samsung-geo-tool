/**
 * Brief Templates Library
 * Functions for managing brief templates
 */

import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

export interface BriefTemplate {
  id: string
  name: string
  description: string | null
  categoryId: string | null
  categoryName: string | null
  keywords: string[]
  briefUsps: string[]
  briefDefaults: {
    content?: string
    isActive?: boolean
    campaignTag?: string
  }
  usageCount: number
  createdAt: string
  createdBy: string | null
}

export interface CreateBriefTemplateParams {
  name: string
  description?: string
  categoryId?: string
  keywords?: string[]
  briefUsps: string[]
  briefDefaults?: {
    content?: string
    isActive?: boolean
    campaignTag?: string
  }
}

export interface ApplyTemplateParams {
  templateId: string
  productId: string
  userId: string
  overrides?: {
    usps?: string[]
    content?: string
    isActive?: boolean
    campaignTag?: string
  }
}

/**
 * Get all brief templates, optionally filtered by category
 */
export async function getBriefTemplates(categoryId?: string): Promise<BriefTemplate[]> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('templates')
    .select(`
      id,
      name,
      description,
      category_id,
      categories(name),
      keywords,
      brief_usps,
      brief_defaults,
      usage_count,
      created_at,
      created_by
    `)
    .eq('is_brief_template', true)
    .order('usage_count', { ascending: false })

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[BriefTemplates] Error fetching templates:', error)
    return []
  }

  return (data || []).map(mapToTemplate)
}

/**
 * Get popular brief templates (top N by usage)
 */
export async function getPopularBriefTemplates(limit: number = 10): Promise<BriefTemplate[]> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_popular_brief_templates', { p_limit: limit })

  if (error) {
    console.error('[BriefTemplates] Error fetching popular templates:', error)
    return []
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    categoryId: row.category_id as string | null,
    categoryName: row.category_name as string | null,
    keywords: (row.keywords as string[]) || [],
    briefUsps: (row.brief_usps as string[]) || [],
    briefDefaults: (row.brief_defaults as Record<string, unknown>) || {},
    usageCount: (row.usage_count as number) || 0,
    createdAt: row.created_at as string,
    createdBy: null,
  }))
}

/**
 * Get a single brief template by ID
 */
export async function getBriefTemplate(templateId: string): Promise<BriefTemplate | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('templates')
    .select(`
      id,
      name,
      description,
      category_id,
      categories(name),
      keywords,
      brief_usps,
      brief_defaults,
      usage_count,
      created_at,
      created_by
    `)
    .eq('id', templateId)
    .eq('is_brief_template', true)
    .single()

  if (error || !data) {
    console.error('[BriefTemplates] Error fetching template:', error)
    return null
  }

  return mapToTemplate(data)
}

/**
 * Create a new brief template
 */
export async function createBriefTemplate(
  params: CreateBriefTemplateParams,
  userId: string
): Promise<BriefTemplate | null> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('templates')
    .insert({
      name: params.name,
      description: params.description || null,
      category_id: params.categoryId || null,
      keywords: params.keywords || [],
      brief_usps: params.briefUsps,
      brief_defaults: params.briefDefaults || {},
      is_brief_template: true,
      usage_count: 0,
      created_by: userId,
    })
    .select(`
      id,
      name,
      description,
      category_id,
      categories(name),
      keywords,
      brief_usps,
      brief_defaults,
      usage_count,
      created_at,
      created_by
    `)
    .single()

  if (error || !data) {
    console.error('[BriefTemplates] Error creating template:', error)
    return null
  }

  return mapToTemplate(data)
}

/**
 * Update an existing brief template
 */
export async function updateBriefTemplate(
  templateId: string,
  updates: Partial<CreateBriefTemplateParams>
): Promise<boolean> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId
  if (updates.keywords !== undefined) updateData.keywords = updates.keywords
  if (updates.briefUsps !== undefined) updateData.brief_usps = updates.briefUsps
  if (updates.briefDefaults !== undefined) updateData.brief_defaults = updates.briefDefaults

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('templates')
    .update(updateData)
    .eq('id', templateId)
    .eq('is_brief_template', true)

  if (error) {
    console.error('[BriefTemplates] Error updating template:', error)
    return false
  }

  return true
}

/**
 * Delete a brief template
 */
export async function deleteBriefTemplate(templateId: string): Promise<boolean> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('templates')
    .delete()
    .eq('id', templateId)
    .eq('is_brief_template', true)

  if (error) {
    console.error('[BriefTemplates] Error deleting template:', error)
    return false
  }

  return true
}

/**
 * Apply a template to create a new brief
 */
export async function applyTemplate(params: ApplyTemplateParams): Promise<{
  briefId: string | null
  error: string | null
}> {
  const supabase = await createClient()

  // Get the template
  const template = await getBriefTemplate(params.templateId)
  if (!template) {
    return { briefId: null, error: 'Template not found' }
  }

  // Merge template defaults with overrides
  const usps = params.overrides?.usps || template.briefUsps
  const content = params.overrides?.content ?? template.briefDefaults.content ?? null
  const isActive = params.overrides?.isActive ?? template.briefDefaults.isActive ?? true

  // Get the next version number for this product
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingBriefs } = await (supabase as any)
    .from('briefs')
    .select('version')
    .eq('product_id', params.productId)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = existingBriefs && existingBriefs.length > 0
    ? existingBriefs[0].version + 1
    : 1

  // Create the brief
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: brief, error: briefError } = await (supabase as any)
    .from('briefs')
    .insert({
      product_id: params.productId,
      usps,
      content,
      is_active: isActive,
      version: nextVersion,
      created_by: params.userId,
    })
    .select('id')
    .single()

  if (briefError || !brief) {
    console.error('[BriefTemplates] Error creating brief from template:', briefError)
    return { briefId: null, error: briefError?.message || 'Failed to create brief' }
  }

  // Record template usage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('brief_template_usage').insert({
    template_id: params.templateId,
    brief_id: brief.id,
    user_id: params.userId,
  })

  // Increment usage count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)('increment_template_usage', { p_template_id: params.templateId })

  return { briefId: brief.id, error: null }
}

/**
 * Create a template from an existing brief
 */
export async function createTemplateFromBrief(
  briefId: string,
  templateName: string,
  templateDescription: string | null,
  userId: string
): Promise<BriefTemplate | null> {
  const supabase = await createClient()

  // Get the brief
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: brief, error: briefError } = await (supabase as any)
    .from('briefs')
    .select(`
      usps,
      content,
      is_active,
      products(category_id)
    `)
    .eq('id', briefId)
    .single()

  if (briefError || !brief) {
    console.error('[BriefTemplates] Error fetching brief:', briefError)
    return null
  }

  // Create the template
  return createBriefTemplate({
    name: templateName,
    description: templateDescription || undefined,
    categoryId: (brief.products as { category_id: string } | null)?.category_id,
    briefUsps: brief.usps,
    briefDefaults: {
      content: brief.content || undefined,
      isActive: brief.is_active,
    },
  }, userId)
}

// Helper function to map database row to BriefTemplate
function mapToTemplate(data: Record<string, unknown>): BriefTemplate {
  const categories = data.categories as { name: string } | null
  return {
    id: data.id as string,
    name: data.name as string,
    description: data.description as string | null,
    categoryId: data.category_id as string | null,
    categoryName: categories?.name || null,
    keywords: (data.keywords as string[]) || [],
    briefUsps: (data.brief_usps as string[]) || [],
    briefDefaults: (data.brief_defaults as Record<string, unknown>) || {},
    usageCount: (data.usage_count as number) || 0,
    createdAt: data.created_at as string,
    createdBy: data.created_by as string | null,
  }
}
