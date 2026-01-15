import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parse JSON with multiple fallback strategies
 * Handles common LLM output issues like unterminated strings, markdown blocks, etc.
 */
export function safeJsonParse<T>(content: string, defaultValue: T, context: string): T {
  if (!content || !content.trim()) {
    console.warn(`[${context}] Empty content, using default`)
    return defaultValue
  }

  let jsonString = content.trim()

  // Debug: Log first and last parts of the content
  console.log(`[${context}] Raw content length: ${jsonString.length}`)
  console.log(`[${context}] Raw content start: ${jsonString.slice(0, 100)}`)
  console.log(`[${context}] Raw content end: ${jsonString.slice(-100)}`)

  // Strategy 1: Try direct parse
  try {
    const result = JSON.parse(jsonString) as T
    console.log(`[${context}] Direct parse succeeded`)
    return result
  } catch (e) {
    console.log(`[${context}] Direct parse failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    // Continue to fallback strategies
  }

  // Strategy 2: Extract from markdown code block
  const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T
    } catch {
      // Continue
    }
  }

  // Strategy 3: Find JSON object/array boundaries
  const jsonStart = jsonString.indexOf('{')
  const arrayStart = jsonString.indexOf('[')
  const start = jsonStart === -1 ? arrayStart : (arrayStart === -1 ? jsonStart : Math.min(jsonStart, arrayStart))

  if (start > 0) {
    jsonString = jsonString.slice(start)
    try {
      return JSON.parse(jsonString) as T
    } catch {
      // Continue
    }
  }

  // Strategy 4: Try to repair unterminated strings by finding last valid JSON end
  try {
    // Find the last complete object/array
    let depth = 0
    let inString = false
    let escaped = false
    let lastValidEnd = -1

    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i]

      if (escaped) {
        escaped = false
        continue
      }

      if (char === '\\' && inString) {
        escaped = true
        continue
      }

      if (char === '"' && !escaped) {
        inString = !inString
        continue
      }

      if (!inString) {
        if (char === '{' || char === '[') depth++
        if (char === '}' || char === ']') {
          depth--
          if (depth === 0) lastValidEnd = i + 1
        }
      }
    }

    if (lastValidEnd > 0) {
      const repaired = jsonString.slice(0, lastValidEnd)
      console.warn(`[${context}] Repaired truncated JSON (${jsonString.length} -> ${repaired.length} chars)`)
      return JSON.parse(repaired) as T
    }
  } catch {
    // Continue
  }

  // Strategy 5: Try closing unclosed structures
  try {
    let repaired = jsonString
    // Count unclosed brackets
    const openBraces = (repaired.match(/{/g) || []).length
    const closeBraces = (repaired.match(/}/g) || []).length
    const openBrackets = (repaired.match(/\[/g) || []).length
    const closeBrackets = (repaired.match(/]/g) || []).length

    // Close any unclosed string (look for odd number of unescaped quotes)
    if (repaired.endsWith('"')) {
      // Might be complete
    } else if (/[^\\]"[^"]*$/.test(repaired)) {
      // Has unclosed string, close it
      repaired = repaired + '"'
    }

    // Add missing closing brackets
    repaired += '}'.repeat(Math.max(0, openBraces - closeBraces))
    repaired += ']'.repeat(Math.max(0, openBrackets - closeBrackets))

    if (repaired !== jsonString) {
      console.warn(`[${context}] Attempted JSON repair`)
      return JSON.parse(repaired) as T
    }
  } catch {
    // All strategies failed
  }

  console.error(`[${context}] All JSON parse strategies failed, using default`)
  return defaultValue
}

/**
 * Normalize a URL to ensure it has a proper protocol prefix.
 * This prevents URLs from being treated as relative paths (e.g., localhost:3000/samsung.com)
 */
export function normalizeUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return url ?? ''

  const trimmed = url.trim()

  // Already has a valid protocol
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  // Has a protocol-like prefix but missing slashes (e.g., "http:samsung.com")
  if (trimmed.startsWith('http:') || trimmed.startsWith('https:')) {
    return trimmed.replace(/^(https?:)\/?/, '$1//')
  }

  // Default to https
  return `https://${trimmed}`
}
