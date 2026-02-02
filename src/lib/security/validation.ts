import { z } from 'zod'

// ========================================
// SQL Injection Detection
// ========================================
const SQL_INJECTION_PATTERNS = [
  /(\b(select|insert|update|delete|drop|create|alter|truncate|exec|execute|union)\b)/i,
  /(--|;|'|"|\\)/,
  /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,
  /(\bor\b\s+'[^']*'\s*=\s*'[^']*')/i,
  /(\/\*[\s\S]*?\*\/)/,
  /(\bwaitfor\b\s+\bdelay\b)/i,
  /(\bsleep\b\s*\(\s*\d+\s*\))/i,
]

export function hasSQLInjection(input: string): boolean {
  if (typeof input !== 'string') return false
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input))
}

// ========================================
// XSS Detection & Sanitization
// ========================================
const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /<[^>]+on\w+\s*=/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
  /<input[^>]+type\s*=\s*["']?hidden/gi,
]

export function hasXSS(input: string): boolean {
  if (typeof input !== 'string') return false
  return XSS_PATTERNS.some(pattern => pattern.test(input))
}

export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') return input

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// ========================================
// Path Traversal Detection
// ========================================
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e\//gi,
  /\.\.%2f/gi,
  /%2e%2e%5c/gi,
  /%00/g,
  /\0/g,
]

export function hasPathTraversal(input: string): boolean {
  if (typeof input !== 'string') return false
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(input))
}

// ========================================
// Comprehensive Input Validation
// ========================================
export interface ValidationResult {
  valid: boolean
  errors: string[]
  sanitized?: string
}

export function validateInput(input: string, options?: {
  maxLength?: number
  allowHTML?: boolean
  checkSQL?: boolean
  checkXSS?: boolean
  checkPath?: boolean
}): ValidationResult {
  const {
    maxLength = 10000,
    allowHTML = false,
    checkSQL = true,
    checkXSS = true,
    checkPath = true,
  } = options || {}

  const errors: string[] = []

  if (typeof input !== 'string') {
    return { valid: false, errors: ['Input must be a string'] }
  }

  if (input.length > maxLength) {
    errors.push(`Input exceeds maximum length of ${maxLength}`)
  }

  if (checkSQL && hasSQLInjection(input)) {
    errors.push('Potential SQL injection detected')
  }

  if (checkXSS && hasXSS(input)) {
    errors.push('Potential XSS attack detected')
  }

  if (checkPath && hasPathTraversal(input)) {
    errors.push('Path traversal attempt detected')
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: allowHTML ? input : sanitizeHTML(input),
  }
}

// ========================================
// Zod Schemas for Common Validations
// ========================================
export const emailSchema = z.string()
  .email('올바른 이메일 형식이 아닙니다')
  .max(255)
  .refine(val => !hasSQLInjection(val), 'Invalid input')
  .refine(val => !hasXSS(val), 'Invalid input')

export const passwordSchema = z.string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .max(128, '비밀번호가 너무 깁니다')
  .regex(/[A-Za-z]/, '비밀번호에 영문자가 포함되어야 합니다')
  .regex(/[0-9]/, '비밀번호에 숫자가 포함되어야 합니다')
  .regex(/[^A-Za-z0-9]/, '비밀번호에 특수문자가 포함되어야 합니다')

export const usernameSchema = z.string()
  .min(2, '이름은 최소 2자 이상이어야 합니다')
  .max(50)
  .regex(/^[a-zA-Z0-9가-힣_-]+$/, '이름에 허용되지 않는 문자가 포함되어 있습니다')

// ========================================
// File Upload Validation
// ========================================
export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  videos: ['video/mp4', 'video/webm', 'video/quicktime'],
  srt: ['text/plain', 'application/x-subrip', 'text/srt'],
} as const

export function validateFileUpload(
  file: { name: string; type: string; size: number },
  options: {
    allowedTypes: string[]
    maxSizeMB?: number
  }
): ValidationResult {
  const { allowedTypes, maxSizeMB = 50 } = options
  const errors: string[] = []

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`파일 형식 ${file.type}은(는) 허용되지 않습니다`)
  }

  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    errors.push(`파일 크기가 ${maxSizeMB}MB를 초과합니다`)
  }

  // Check for null bytes in filename (path traversal attempt)
  if (file.name.includes('\0') || file.name.includes('%00')) {
    errors.push('잘못된 파일명입니다')
  }

  // Check for path traversal in filename
  if (hasPathTraversal(file.name)) {
    errors.push('잘못된 파일명입니다')
  }

  // Check file extension matches MIME type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const expectedExts: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'video/mp4': ['mp4'],
    'video/webm': ['webm'],
    'application/pdf': ['pdf'],
    'text/plain': ['txt', 'srt'],
  }

  if (ext && expectedExts[file.type] && !expectedExts[file.type].includes(ext)) {
    errors.push('파일 확장자가 파일 형식과 일치하지 않습니다')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ========================================
// URL Validation (Open Redirect Prevention)
// ========================================
const ALLOWED_REDIRECT_HOSTS: string[] = []

export function isValidRedirectUrl(url: string, currentHost: string): boolean {
  try {
    const parsed = new URL(url, `https://${currentHost}`)

    // Allow same-origin redirects
    if (parsed.host === currentHost) {
      return true
    }

    // Allow whitelisted external hosts
    if (ALLOWED_REDIRECT_HOSTS.includes(parsed.host)) {
      return true
    }

    // Block javascript: and data: URLs
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
      return false
    }

    return false
  } catch {
    // Relative URLs are okay
    return url.startsWith('/') && !url.startsWith('//')
  }
}
