import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type UploadType = 'products' | 'briefs' | 'keywords'
type UploadFormat = 'csv' | 'json'

interface FieldValidation {
  field: string
  required: boolean
  type: 'string' | 'number' | 'boolean' | 'array'
}

interface ParsedRecord {
  index: number
  data: Record<string, unknown>
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface ParseResponse {
  success: boolean
  type: UploadType
  format: UploadFormat
  totalRecords: number
  validRecords: number
  invalidRecords: number
  records: ParsedRecord[]
  headers: string[]
  requiredFields: string[]
  parseErrors: string[]
}

// Field requirements for each upload type
const FIELD_REQUIREMENTS: Record<UploadType, FieldValidation[]> = {
  products: [
    { field: 'name', required: true, type: 'string' },
    { field: 'category_id', required: true, type: 'string' },
    { field: 'code_name', required: false, type: 'string' },
  ],
  briefs: [
    { field: 'product_id', required: true, type: 'string' },
    { field: 'usps', required: true, type: 'array' },
    { field: 'content', required: false, type: 'string' },
    { field: 'is_active', required: false, type: 'boolean' },
  ],
  keywords: [
    { field: 'keyword', required: true, type: 'string' },
    { field: 'priority', required: false, type: 'string' },
    { field: 'category', required: false, type: 'string' },
    { field: 'search_volume', required: false, type: 'number' },
    { field: 'competition', required: false, type: 'string' },
  ],
}

// POST - Parse and validate upload data without committing
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
    const format = (formData.get('format') as UploadFormat) || 'csv'
    const file = formData.get('file') as File | null
    const textData = formData.get('data') as string | null

    // Validate upload type
    if (!uploadType || !['products', 'briefs', 'keywords'].includes(uploadType)) {
      return NextResponse.json(
        { error: 'Invalid upload type. Must be: products, briefs, or keywords' },
        { status: 400 }
      )
    }

    // Get raw data from file or text
    let rawData: string
    if (file) {
      rawData = await file.text()
    } else if (textData) {
      rawData = textData
    } else {
      return NextResponse.json(
        { error: 'No data provided. Include file or data field.' },
        { status: 400 }
      )
    }

    if (!rawData.trim()) {
      return NextResponse.json({ error: 'Empty data provided' }, { status: 400 })
    }

    const response: ParseResponse = {
      success: true,
      type: uploadType,
      format,
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      records: [],
      headers: [],
      requiredFields: FIELD_REQUIREMENTS[uploadType]
        .filter((f) => f.required)
        .map((f) => f.field),
      parseErrors: [],
    }

    // Parse based on format
    let rawRecords: Record<string, unknown>[]
    try {
      if (format === 'csv') {
        const { records, headers } = parseCSV(rawData, uploadType)
        rawRecords = records
        response.headers = headers
      } else {
        const parsed = JSON.parse(rawData)
        rawRecords = Array.isArray(parsed) ? parsed : [parsed]
        if (rawRecords.length > 0) {
          response.headers = Object.keys(rawRecords[0])
        }
      }
    } catch (parseError) {
      response.success = false
      response.parseErrors.push(
        `Failed to parse ${format.toUpperCase()}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      )
      return NextResponse.json(response)
    }

    if (rawRecords.length === 0) {
      response.success = false
      response.parseErrors.push('No records found in data')
      return NextResponse.json(response)
    }

    // Validate each record
    const fieldRequirements = FIELD_REQUIREMENTS[uploadType]
    response.totalRecords = rawRecords.length

    for (let i = 0; i < rawRecords.length; i++) {
      const record = rawRecords[i]
      const parsedRecord = validateRecord(record, fieldRequirements, i, uploadType)
      response.records.push(parsedRecord)

      if (parsedRecord.valid) {
        response.validRecords++
      } else {
        response.invalidRecords++
      }
    }

    response.success = response.parseErrors.length === 0 && response.invalidRecords === 0

    return NextResponse.json(response)
  } catch (error) {
    console.error('Parse error:', error)
    return NextResponse.json(
      { error: 'Failed to parse upload data', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}

function parseCSV(
  csv: string,
  uploadType: UploadType
): { records: Record<string, unknown>[]; headers: string[] } {
  const lines = csv.split('\n').filter((line) => line.trim())
  if (lines.length < 1) {
    return { records: [], headers: [] }
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ''))

  if (lines.length < 2) {
    return { records: [], headers }
  }

  const records: Record<string, unknown>[] = []
  const fieldRequirements = FIELD_REQUIREMENTS[uploadType]

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const record: Record<string, unknown> = {}

    headers.forEach((header, j) => {
      const rawValue = values[j]?.trim().replace(/^"|"$/g, '') || null
      const fieldReq = fieldRequirements.find((f) => f.field === header)

      if (rawValue === null || rawValue === '') {
        record[header] = null
      } else if (fieldReq) {
        // Type coercion based on field requirements
        switch (fieldReq.type) {
          case 'boolean':
            record[header] = rawValue.toLowerCase() === 'true' || rawValue === '1'
            break
          case 'number':
            const num = Number(rawValue)
            record[header] = isNaN(num) ? rawValue : num
            break
          case 'array':
            // Arrays in CSV are pipe-separated
            record[header] = rawValue.includes('|')
              ? rawValue.split('|').map((v) => v.trim())
              : [rawValue]
            break
          default:
            record[header] = rawValue
        }
      } else {
        // Unknown field - try to infer type
        if (rawValue.toLowerCase() === 'true' || rawValue.toLowerCase() === 'false') {
          record[header] = rawValue.toLowerCase() === 'true'
        } else if (!isNaN(Number(rawValue)) && rawValue !== '') {
          record[header] = Number(rawValue)
        } else {
          record[header] = rawValue
        }
      }
    })

    records.push(record)
  }

  return { records, headers }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
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

function validateRecord(
  record: Record<string, unknown>,
  fieldRequirements: FieldValidation[],
  index: number,
  uploadType: UploadType
): ParsedRecord {
  const errors: string[] = []
  const warnings: string[] = []
  const processedData: Record<string, unknown> = { ...record }

  // Check required fields
  for (const req of fieldRequirements) {
    const value = record[req.field]

    if (req.required) {
      if (value === undefined || value === null || value === '') {
        errors.push(`Missing required field: ${req.field}`)
        continue
      }
    }

    if (value !== undefined && value !== null && value !== '') {
      // Type validation
      switch (req.type) {
        case 'string':
          if (typeof value !== 'string') {
            processedData[req.field] = String(value)
            warnings.push(`Field '${req.field}' converted to string`)
          }
          break
        case 'number':
          if (typeof value !== 'number') {
            const num = Number(value)
            if (isNaN(num)) {
              errors.push(`Field '${req.field}' must be a number`)
            } else {
              processedData[req.field] = num
            }
          }
          break
        case 'boolean':
          if (typeof value !== 'boolean') {
            if (typeof value === 'string') {
              processedData[req.field] = value.toLowerCase() === 'true' || value === '1'
            } else {
              processedData[req.field] = Boolean(value)
            }
          }
          break
        case 'array':
          if (!Array.isArray(value)) {
            if (typeof value === 'string') {
              processedData[req.field] = value.includes('|')
                ? value.split('|').map((v) => v.trim())
                : [value]
            } else {
              errors.push(`Field '${req.field}' must be an array`)
            }
          }
          break
      }
    }
  }

  // Type-specific validations
  switch (uploadType) {
    case 'products':
      validateProductRecord(processedData, errors, warnings)
      break
    case 'briefs':
      validateBriefRecord(processedData, errors, warnings)
      break
    case 'keywords':
      validateKeywordRecord(processedData, errors, warnings)
      break
  }

  return {
    index,
    data: processedData,
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

function validateProductRecord(
  record: Record<string, unknown>,
  errors: string[],
  warnings: string[]
): void {
  const name = record.name as string
  const categoryId = record.category_id as string

  // Name length check
  if (name && name.length > 255) {
    errors.push('Product name exceeds 255 characters')
  }

  // Category ID format check (basic)
  if (categoryId && !/^[a-zA-Z0-9_-]+$/.test(categoryId)) {
    warnings.push('Category ID contains special characters')
  }
}

function validateBriefRecord(
  record: Record<string, unknown>,
  errors: string[],
  warnings: string[]
): void {
  const usps = record.usps

  // USPs should be an array
  if (usps && Array.isArray(usps)) {
    if (usps.length === 0) {
      errors.push('USPs array is empty')
    } else if (usps.length > 10) {
      warnings.push('More than 10 USPs may impact quality')
    }
  }
}

function validateKeywordRecord(
  record: Record<string, unknown>,
  errors: string[],
  warnings: string[]
): void {
  const keyword = record.keyword as string
  const priority = record.priority as string

  // Keyword length check
  if (keyword && keyword.length > 255) {
    errors.push('Keyword exceeds 255 characters')
  }

  // Priority validation
  if (priority && !['high', 'medium', 'low'].includes(priority.toLowerCase())) {
    warnings.push('Priority should be: high, medium, or low')
  }
}
