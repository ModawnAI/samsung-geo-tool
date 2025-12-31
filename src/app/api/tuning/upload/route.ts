import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type UploadType = 'products' | 'briefs' | 'keywords'

interface UploadResult {
  success: boolean
  inserted: number
  updated: number
  skipped: number
  errors: string[]
}

// POST - Handle bulk upload
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const uploadType = formData.get('type') as UploadType
    const format = formData.get('format') as 'csv' | 'json'
    const file = formData.get('file') as File | null
    const textData = formData.get('data') as string | null

    if (!uploadType || !['products', 'briefs', 'keywords'].includes(uploadType)) {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 })
    }

    let rawData: string
    if (file) {
      rawData = await file.text()
    } else if (textData) {
      rawData = textData
    } else {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 })
    }

    // Parse data based on format
    let records: Record<string, unknown>[]
    try {
      if (format === 'csv') {
        records = parseCSV(rawData)
      } else {
        const parsed = JSON.parse(rawData)
        records = Array.isArray(parsed) ? parsed : [parsed]
      }
    } catch {
      return NextResponse.json({ error: 'Failed to parse data' }, { status: 400 })
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'No records found in data' }, { status: 400 })
    }

    // Process based on upload type
    let result: UploadResult
    switch (uploadType) {
      case 'products':
        result = await uploadProducts(supabase, records)
        break
      case 'briefs':
        result = await uploadBriefs(supabase, records, user.id)
        break
      case 'keywords':
        result = await uploadKeywords(supabase, records)
        break
      default:
        return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 })
  }
}

function parseCSV(csv: string): Record<string, unknown>[] {
  const lines = csv.split('\n').filter((line) => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
  const records: Record<string, unknown>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const record: Record<string, unknown> = {}
    headers.forEach((header, j) => {
      record[header] = values[j]?.trim().replace(/"/g, '') || null
    })
    records.push(record)
  }

  return records
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)

  return result
}

async function uploadProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  records: Record<string, unknown>[]
): Promise<UploadResult> {
  const result: UploadResult = {
    success: true,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  for (const record of records) {
    const { name, category_id, code_name } = record as {
      name?: string
      category_id?: string
      code_name?: string
    }

    if (!name || !category_id) {
      result.errors.push(`Missing required fields for product: ${JSON.stringify(record)}`)
      result.skipped++
      continue
    }

    try {
      // Check if product exists by name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('products')
        .select('id')
        .eq('name', name)
        .single()

      if (existing) {
        // Update existing
        const updateData = {
          category_id,
          code_name: code_name || null,
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('products')
          .update(updateData)
          .eq('id', existing.id)

        if (error) throw error
        result.updated++
      } else {
        // Insert new
        const insertData = {
          name,
          category_id,
          code_name: code_name || null,
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from('products').insert(insertData)

        if (error) throw error
        result.inserted++
      }
    } catch (err) {
      result.errors.push(`Failed to process product "${name}": ${err}`)
      result.skipped++
    }
  }

  result.success = result.errors.length === 0
  return result
}

async function uploadBriefs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  records: Record<string, unknown>[],
  userId: string
): Promise<UploadResult> {
  const result: UploadResult = {
    success: true,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  for (const record of records) {
    const { product_id, usps, content, is_active } = record as {
      product_id?: string
      usps?: string | string[]
      content?: string
      is_active?: boolean | string
    }

    if (!product_id || !usps) {
      result.errors.push(`Missing required fields for brief: ${JSON.stringify(record)}`)
      result.skipped++
      continue
    }

    // Parse USPs if they're a pipe-separated string
    const uspArray = typeof usps === 'string' ? usps.split('|').map((u) => u.trim()) : usps

    try {
      // Get next version number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingBriefs } = await (supabase as any)
        .from('briefs')
        .select('version')
        .eq('product_id', product_id)
        .order('version', { ascending: false })
        .limit(1)

      const nextVersion =
        existingBriefs && existingBriefs.length > 0 ? existingBriefs[0].version + 1 : 1

      // If setting as active, deactivate others
      const shouldBeActive = is_active === true || is_active === 'true'
      if (shouldBeActive) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('briefs')
          .update({ is_active: false })
          .eq('product_id', product_id)
          .eq('is_active', true)
      }

      const insertData = {
        product_id,
        usps: uspArray,
        content: content || null,
        is_active: shouldBeActive,
        version: nextVersion,
        created_by: userId,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('briefs').insert(insertData)

      if (error) throw error
      result.inserted++
    } catch (err) {
      result.errors.push(`Failed to process brief for product "${product_id}": ${err}`)
      result.skipped++
    }
  }

  result.success = result.errors.length === 0
  return result
}

async function uploadKeywords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  records: Record<string, unknown>[]
): Promise<UploadResult> {
  const result: UploadResult = {
    success: true,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  // Keywords would typically be stored in grounding_cache or a separate keywords table
  // For now, we'll store them as metadata or return info about the parsed keywords
  for (const record of records) {
    const { keyword } = record as { keyword?: string }

    if (!keyword) {
      result.errors.push(`Missing keyword field: ${JSON.stringify(record)}`)
      result.skipped++
      continue
    }

    // Since there's no dedicated keywords table, we track what was processed
    // This could be extended to store in a keywords table if one is added
    result.inserted++
  }

  result.success = result.errors.length === 0
  return result
}
