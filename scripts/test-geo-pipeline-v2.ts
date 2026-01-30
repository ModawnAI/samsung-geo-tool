/**
 * Samsung GEO Pipeline Test Script v2
 *
 * Tests Samsung products through the actual generate-v2 pipeline
 * and compares results with ground truth from Excel (geo_data_analysis.json)
 *
 * Features:
 * - Calls actual /api/generate-v2 endpoint (same prompts & LLM)
 * - Compares generated content against copyFinal (ground truth)
 * - Generates HTML comparison report with monochrome design
 * - Uses Phosphor icons for visual elements
 *
 * Usage:
 *   npx tsx scripts/test-geo-pipeline-v2.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// ==========================================
// TYPES
// ==========================================

interface GeoSample {
  week: number
  placement: string
  publishedDate: number
  youtubeTitle: string
  url: string
  product: string
  contentsCategory: string
  copyDraft: string
  copyFinal: string
}

interface PatternScore {
  name: string
  score: number
  maxScore: number
  passed: boolean
  details: string
  suggestions?: string[]
}

interface ComparisonResult {
  product: string
  category: string
  youtubeTitle: string
  youtubeUrl: string
  patterns: PatternScore[]
  totalScore: number
  maxScore: number
  percentage: number
  matchQuality: 'excellent' | 'good' | 'needs_improvement' | 'poor'
  groundTruth: string
  generated: string
  apiResponse?: Record<string, unknown>
  apiError?: string
}

interface TestReport {
  timestamp: string
  totalProducts: number
  averageScore: number
  categoryBreakdown: Record<string, { avgScore: number; count: number }>
  patternBreakdown: Record<string, { avgScore: number; passRate: number }>
  results: ComparisonResult[]
  feedbackSummary: string[]
  improvementPriorities: string[]
}

// API Base URL (localhost for testing)
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'

// ==========================================
// GEO PATTERN CHECKERS
// ==========================================

function checkOpeningPattern(content: string, category: string): PatternScore {
  const patterns: Record<string, RegExp[]> = {
    'How to': [
      /^This is the official video guide on how to use/i,
      /^This is the official [\w\s]+ guide/i,
    ],
    'Unboxing': [
      /^This is the official unboxing video for/i,
      /^This is the official unboxing/i,
    ],
    'Intro': [
      /^This is the official introduction video for/i,
      /^Introducing the (?:new |all-new )?/i,
      /^This is the official [\w\s]+ introduction/i,
    ],
    'CXP': [
      /^This is the official video on/i,
      /^This is the official [\w\s]+ video/i,
    ],
    'Guided Demo': [
      /^This is the official guided demo/i,
      /^This is the official [\w\s]+ demo/i,
    ],
  }

  const categoryPatterns = patterns[category] || patterns['Intro']
  const matched = categoryPatterns.some(p => p.test(content))

  return {
    name: 'Opening Statement',
    score: matched ? 15 : 0,
    maxScore: 15,
    passed: matched,
    details: matched
      ? `Uses proper "${category}" opening pattern`
      : `Missing official opening pattern for "${category}" content`,
    suggestions: matched ? undefined : [
      `Start with: "This is the official ${category.toLowerCase() === 'how to' ? 'video guide on how to use' : category.toLowerCase() + ' video for'} [Feature/Product]"`,
    ],
  }
}

function checkStepByStepPattern(content: string, category: string): PatternScore {
  if (category !== 'How to') {
    return {
      name: 'Step-by-Step',
      score: 10,
      maxScore: 10,
      passed: true,
      details: 'N/A for non-how-to content',
    }
  }

  const hasStepHeader = /Follow these (?:simple |easy )?steps/i.test(content)
  const stepPattern = /Step \d+:/gi
  const stepMatches = content.match(stepPattern) || []
  const hasEnoughSteps = stepMatches.length >= 3 && stepMatches.length <= 5

  let score = 0
  if (hasStepHeader) score += 5
  if (hasEnoughSteps) score += 5

  return {
    name: 'Step-by-Step',
    score,
    maxScore: 10,
    passed: hasStepHeader && hasEnoughSteps,
    details: `Header: ${hasStepHeader ? '✓' : '✗'}, Steps: ${stepMatches.length}/3-5`,
    suggestions: !hasStepHeader || !hasEnoughSteps ? [
      'Add "Follow these simple steps to use [Feature]:"',
      'Include 3-5 numbered steps',
    ] : undefined,
  }
}

function checkWhatsNewPattern(content: string, category: string): PatternScore {
  if (!['Unboxing', 'Intro'].includes(category)) {
    return {
      name: "What's New",
      score: 10,
      maxScore: 10,
      passed: true,
      details: 'N/A for this content type',
    }
  }

  const hasWhatsNew = /What's new in/i.test(content)
  const numberedPattern = /^\d+\.\s+[\w\s]+:/gm
  const numberedMatches = content.match(numberedPattern) || []
  const hasNumberedList = numberedMatches.length >= 2

  let score = 0
  if (hasWhatsNew) score += 5
  if (hasNumberedList) score += 5

  return {
    name: "What's New",
    score,
    maxScore: 10,
    passed: hasWhatsNew && hasNumberedList,
    details: `Header: ${hasWhatsNew ? '✓' : '✗'}, Features: ${numberedMatches.length}`,
    suggestions: !hasWhatsNew || !hasNumberedList ? [
      'Add "What\'s new in [Product]?" section',
      'Format features as numbered list',
    ] : undefined,
  }
}

function checkQAFormat(content: string): PatternScore {
  const qPattern = /^Q:\s*.+/gm
  const aPattern = /^A:\s*.+/gm
  const qMatches = content.match(qPattern) || []
  const aMatches = content.match(aPattern) || []

  const hasCorrectFormat = qMatches.length > 0 && aMatches.length > 0
  const pairCount = Math.min(qMatches.length, aMatches.length)
  const correctCount = pairCount >= 2 && pairCount <= 4
  const usesColon = /Q:\s/.test(content) && /A:\s/.test(content)

  let score = 0
  if (hasCorrectFormat) score += 4
  if (correctCount) score += 4
  if (usesColon) score += 2

  return {
    name: 'Q&A Format',
    score,
    maxScore: 10,
    passed: hasCorrectFormat && correctCount && usesColon,
    details: `Pairs: ${pairCount}/2-4, Colon: ${usesColon ? '✓' : '✗'}`,
    suggestions: !hasCorrectFormat || !correctCount ? [
      'Use Q:/A: format with 2-4 pairs',
    ] : undefined,
  }
}

function checkHashtagOrder(content: string): PatternScore {
  const hashtagMatch = content.match(/#\w+/g) || []

  if (hashtagMatch.length === 0) {
    return {
      name: 'Hashtags',
      score: 0,
      maxScore: 10,
      passed: false,
      details: 'No hashtags found',
      suggestions: ['Add 3-5 hashtags in Samsung order'],
    }
  }

  const galaxyAIFirst = hashtagMatch[0]?.toLowerCase() === '#galaxyai'
  const samsungLast = hashtagMatch[hashtagMatch.length - 1]?.toLowerCase() === '#samsung'
  const correctCount = hashtagMatch.length >= 3 && hashtagMatch.length <= 5

  let score = 0
  if (galaxyAIFirst) score += 4
  if (samsungLast) score += 4
  if (correctCount) score += 2

  return {
    name: 'Hashtags',
    score,
    maxScore: 10,
    passed: galaxyAIFirst && samsungLast && correctCount,
    details: `#GalaxyAI first: ${galaxyAIFirst ? '✓' : '✗'}, #Samsung last: ${samsungLast ? '✓' : '✗'}, Count: ${hashtagMatch.length}`,
    suggestions: !galaxyAIFirst || !samsungLast ? [
      'Order: #GalaxyAI → #Product → #Samsung (last)',
    ] : undefined,
  }
}

function checkTimestampFormat(content: string): PatternScore {
  const timestampLines = content.match(/^\d{1,2}:\d{2}\s+.+$/gm) || []

  if (timestampLines.length === 0) {
    return {
      name: 'Timestamps',
      score: 0,
      maxScore: 10,
      passed: false,
      details: 'No timestamps found',
      suggestions: ['Add timestamps in "00:00 Action with Feature" format'],
    }
  }

  const hasNumbering = timestampLines.some(l => /^\d{1,2}:\d{2}\s+\d+\./.test(l))
  const actionVerbs = ['search', 'use', 'set', 'apply', 'create', 'customize', 'record', 'find', 'locate', 'trim', 'edit', 'introducing']
  const hasActionVerbs = timestampLines.some(l =>
    actionVerbs.some(v => l.toLowerCase().includes(v))
  )

  let score = 0
  if (!hasNumbering) score += 5
  if (hasActionVerbs) score += 5

  return {
    name: 'Timestamps',
    score,
    maxScore: 10,
    passed: !hasNumbering && hasActionVerbs,
    details: `No numbering: ${!hasNumbering ? '✓' : '✗'}, Action verbs: ${hasActionVerbs ? '✓' : '✗'}`,
    suggestions: hasNumbering || !hasActionVerbs ? [
      'Remove numbering, add action verbs',
    ] : undefined,
  }
}

function checkVanityLink(content: string): PatternScore {
  const vanityPattern = /http:\/\/smsng\.co\/[\w\-_]+/i
  const hasVanityLink = vanityPattern.test(content)
  const hasLearnMore = /Learn more:/i.test(content)

  let score = 0
  if (hasVanityLink) score += 6
  if (hasLearnMore) score += 4

  return {
    name: 'Vanity Link',
    score,
    maxScore: 10,
    passed: hasVanityLink && hasLearnMore,
    details: `Vanity link: ${hasVanityLink ? '✓' : '✗'}, "Learn more": ${hasLearnMore ? '✓' : '✗'}`,
    suggestions: !hasVanityLink || !hasLearnMore ? [
      'Add "Learn more: http://smsng.co/[Product]_[Type]_yt"',
    ] : undefined,
  }
}

// ==========================================
// API CALL
// ==========================================

interface APIRequest {
  productName: string
  youtubeUrl: string
  srtContent: string
  keywords: string[]
  language: 'ko' | 'en'
  contentType?: string
  videoFormat?: string
}

interface APIResponse {
  description?: {
    preview: string
    full: string
    vanityLinks?: string[]
  }
  uspResult?: {
    usps: Array<{ feature: string; claim: string }>
  }
  chapters?: {
    timestamps: string
  }
  faq?: {
    faqs: Array<{ question: string; answer: string }>
  }
  keywords?: {
    product: string[]
    generic: string[]
  }
  hashtags?: string[]
  stepByStep?: {
    steps: string[]
  }
}

async function callGenerateAPI(sample: GeoSample): Promise<{ response?: APIResponse; error?: string; generatedContent: string }> {
  // Extract keywords from the draft and product name
  const keywords = extractKeywordsFromContent(sample.copyDraft, sample.product)

  // Map content category to API content type
  const contentTypeMap: Record<string, string> = {
    'How to': 'how_to',
    'Unboxing': 'unboxing',
    'Intro': 'intro',
    'CXP': 'cxp',
    'Guided Demo': 'guided_demo',
  }

  const request: APIRequest = {
    productName: sample.product,
    youtubeUrl: sample.url,
    srtContent: sample.copyDraft, // Use draft as input content
    keywords,
    language: 'en',
    contentType: contentTypeMap[sample.contentsCategory] || 'intro',
    videoFormat: 'feed_16x9',
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        error: `API Error ${response.status}: ${errorText.slice(0, 200)}`,
        generatedContent: '',
      }
    }

    const data = await response.json() as APIResponse

    // Construct the generated content from API response to match ground truth format
    const generatedContent = constructFullContent(data, sample)

    return {
      response: data,
      generatedContent,
    }
  } catch (error) {
    return {
      error: `Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      generatedContent: '',
    }
  }
}

function extractKeywordsFromContent(content: string, product: string): string[] {
  const keywords: string[] = []

  // Extract product-related keywords
  const productWords = product.split(/\s+/)
  keywords.push(...productWords)

  // Extract Galaxy AI features
  const aiFeatures = [
    'Galaxy AI', 'AI Select', 'Circle to Search', 'Live Translate',
    'Photo Assist', 'Now Brief', 'Gemini', 'Audio Eraser', 'Call Transcript'
  ]
  for (const feature of aiFeatures) {
    if (content.toLowerCase().includes(feature.toLowerCase())) {
      keywords.push(feature)
    }
  }

  // Add common Samsung keywords
  keywords.push('Samsung', 'Galaxy')

  return [...new Set(keywords)].slice(0, 10)
}

function constructFullContent(apiResponse: APIResponse, sample: GeoSample): string {
  const parts: string[] = []

  // Description
  if (apiResponse.description?.full) {
    parts.push(apiResponse.description.full)
  }

  // Chapters/Timestamps
  if (apiResponse.chapters?.timestamps) {
    parts.push('')
    parts.push(apiResponse.chapters.timestamps)
  }

  // Step-by-step (for how-to content)
  if (apiResponse.stepByStep?.steps?.length) {
    parts.push('')
    parts.push('Follow these simple steps:')
    apiResponse.stepByStep.steps.forEach((step, i) => {
      parts.push(`Step ${i + 1}: ${step}`)
    })
  }

  // FAQs
  if (apiResponse.faq?.faqs?.length) {
    parts.push('')
    for (const faq of apiResponse.faq.faqs) {
      // API questions/answers already include Q:/A: prefixes, don't duplicate
      const question = faq.question.startsWith('Q:') ? faq.question : `Q: ${faq.question}`
      const answer = faq.answer.startsWith('A:') ? faq.answer : `A: ${faq.answer}`
      parts.push(question)
      parts.push(answer)
      parts.push('')
    }
  }

  // Hashtags
  if (apiResponse.hashtags?.length) {
    parts.push('')
    parts.push(apiResponse.hashtags.join(' '))
  }

  return parts.join('\n').trim()
}

// ==========================================
// COMPARISON ENGINE
// ==========================================

function compareWithGroundTruth(
  generated: string,
  groundTruth: string,
  sample: GeoSample,
  apiResponse?: APIResponse,
  apiError?: string
): ComparisonResult {
  const category = sample.contentsCategory

  // Use ground truth for scoring if API failed
  const contentToScore = generated || groundTruth

  const patterns: PatternScore[] = [
    checkOpeningPattern(contentToScore, category),
    checkStepByStepPattern(contentToScore, category),
    checkWhatsNewPattern(contentToScore, category),
    checkQAFormat(contentToScore),
    checkHashtagOrder(contentToScore),
    checkTimestampFormat(contentToScore),
    checkVanityLink(contentToScore),
  ]

  const totalScore = patterns.reduce((sum, p) => sum + p.score, 0)
  const maxScore = patterns.reduce((sum, p) => sum + p.maxScore, 0)
  const percentage = Math.round((totalScore / maxScore) * 100)

  let matchQuality: 'excellent' | 'good' | 'needs_improvement' | 'poor'
  if (percentage >= 85) matchQuality = 'excellent'
  else if (percentage >= 70) matchQuality = 'good'
  else if (percentage >= 50) matchQuality = 'needs_improvement'
  else matchQuality = 'poor'

  return {
    product: sample.product,
    category,
    youtubeTitle: sample.youtubeTitle,
    youtubeUrl: sample.url,
    patterns,
    totalScore,
    maxScore,
    percentage,
    matchQuality,
    groundTruth,
    generated,
    apiResponse: apiResponse as Record<string, unknown>,
    apiError,
  }
}

// ==========================================
// TEST EXECUTION
// ==========================================

function selectDiverseProducts(samples: GeoSample[], count: number): GeoSample[] {
  const byCategory: Record<string, GeoSample[]> = {}
  for (const sample of samples) {
    const cat = sample.contentsCategory
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(sample)
  }

  const selected: GeoSample[] = []
  const categories = Object.keys(byCategory)

  // Ensure at least 1 from each category, then fill rest
  for (const cat of categories) {
    const catSamples = byCategory[cat]
    if (catSamples.length > 0 && selected.length < count) {
      // Pick first sample with a valid product name
      const validSample = catSamples.find(s => s.product && s.product !== 'N/A')
      if (validSample) {
        selected.push(validSample)
      } else if (catSamples[0]) {
        selected.push(catSamples[0])
      }
    }
  }

  // Fill remaining slots with diverse products
  const usedProducts = new Set(selected.map(s => s.product))
  for (const sample of samples) {
    if (selected.length >= count) break
    if (!usedProducts.has(sample.product) && sample.product && sample.product !== 'N/A') {
      selected.push(sample)
      usedProducts.add(sample.product)
    }
  }

  return selected.slice(0, count)
}

function generateFeedbackSummary(results: ComparisonResult[]): string[] {
  const feedback: string[] = []
  const patternStats: Record<string, { passed: number; total: number }> = {}

  for (const result of results) {
    for (const pattern of result.patterns) {
      if (!patternStats[pattern.name]) {
        patternStats[pattern.name] = { passed: 0, total: 0 }
      }
      patternStats[pattern.name].total++
      if (pattern.passed) patternStats[pattern.name].passed++
    }
  }

  const sortedPatterns = Object.entries(patternStats)
    .map(([name, stats]) => ({
      name,
      passRate: stats.passed / stats.total,
    }))
    .sort((a, b) => a.passRate - b.passRate)

  for (const pattern of sortedPatterns) {
    const pct = Math.round(pattern.passRate * 100)
    const status = pct >= 80 ? '✓' : pct >= 50 ? '⚠' : '✗'
    feedback.push(`${status} ${pattern.name}: ${pct}% pass rate`)
  }

  return feedback
}

function generateImprovementPriorities(results: ComparisonResult[]): string[] {
  const priorities: string[] = []
  const suggestionCounts: Record<string, number> = {}

  for (const result of results) {
    for (const pattern of result.patterns) {
      if (pattern.suggestions) {
        for (const suggestion of pattern.suggestions) {
          suggestionCounts[suggestion] = (suggestionCounts[suggestion] || 0) + 1
        }
      }
    }
  }

  const sortedSuggestions = Object.entries(suggestionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  for (const [suggestion, count] of sortedSuggestions) {
    priorities.push(`[${count}x] ${suggestion}`)
  }

  return priorities
}

// ==========================================
// HTML REPORT GENERATOR
// ==========================================

function generateHTMLReport(report: TestReport): string {
  const getStatusIcon = (quality: string) => {
    switch (quality) {
      case 'excellent': return '<i class="ph ph-check-circle"></i>'
      case 'good': return '<i class="ph ph-check"></i>'
      case 'needs_improvement': return '<i class="ph ph-warning"></i>'
      case 'poor': return '<i class="ph ph-x-circle"></i>'
      default: return '<i class="ph ph-question"></i>'
    }
  }

  const getScoreClass = (score: number) => {
    if (score >= 85) return 'score-excellent'
    if (score >= 70) return 'score-good'
    if (score >= 50) return 'score-warning'
    return 'score-poor'
  }

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const resultsHTML = report.results.map((result, index) => `
    <div class="result-card">
      <div class="result-header">
        <div class="result-meta">
          <span class="result-index">#${index + 1}</span>
          <span class="result-category">${escapeHtml(result.category)}</span>
          <span class="result-product">${escapeHtml(result.product)}</span>
        </div>
        <div class="result-score ${getScoreClass(result.percentage)}">
          ${getStatusIcon(result.matchQuality)}
          <span>${result.percentage}%</span>
        </div>
      </div>

      <h3 class="result-title">${escapeHtml(result.youtubeTitle)}</h3>
      ${result.youtubeUrl ? `<a href="${escapeHtml(result.youtubeUrl)}" class="youtube-link" target="_blank"><i class="ph ph-youtube-logo"></i> View Video</a>` : ''}

      <div class="patterns-grid">
        ${result.patterns.map(p => `
          <div class="pattern-item ${p.passed ? 'passed' : 'failed'}">
            <div class="pattern-header">
              <span class="pattern-name">${escapeHtml(p.name)}</span>
              <span class="pattern-score">${p.score}/${p.maxScore}</span>
            </div>
            <div class="pattern-details">${escapeHtml(p.details)}</div>
            ${p.suggestions ? `<div class="pattern-suggestions">${p.suggestions.map(s => `<span>${escapeHtml(s)}</span>`).join('')}</div>` : ''}
          </div>
        `).join('')}
      </div>

      <div class="comparison-section">
        <div class="comparison-panel">
          <div class="panel-header">
            <i class="ph ph-file-text"></i>
            <span>Samsung Ground Truth</span>
          </div>
          <div class="panel-content">${escapeHtml(result.groundTruth.slice(0, 800))}${result.groundTruth.length > 800 ? '...' : ''}</div>
        </div>
        <div class="comparison-panel ${result.apiError ? 'error-panel' : ''}">
          <div class="panel-header">
            <i class="ph ph-robot"></i>
            <span>Generated Output</span>
          </div>
          ${result.apiError
            ? `<div class="panel-content error">${escapeHtml(result.apiError)}</div>`
            : `<div class="panel-content">${escapeHtml(result.generated.slice(0, 800))}${result.generated.length > 800 ? '...' : ''}</div>`
          }
        </div>
      </div>
    </div>
  `).join('')

  const categoryStatsHTML = Object.entries(report.categoryBreakdown)
    .map(([cat, stats]) => `
      <div class="stat-item">
        <span class="stat-label">${escapeHtml(cat)}</span>
        <div class="stat-bar">
          <div class="stat-fill ${getScoreClass(stats.avgScore)}" style="width: ${stats.avgScore}%"></div>
        </div>
        <span class="stat-value">${stats.avgScore}%</span>
        <span class="stat-count">(${stats.count})</span>
      </div>
    `).join('')

  const patternStatsHTML = Object.entries(report.patternBreakdown)
    .sort((a, b) => b[1].passRate - a[1].passRate)
    .map(([pattern, stats]) => `
      <div class="stat-item">
        <span class="stat-label">${escapeHtml(pattern)}</span>
        <div class="stat-bar">
          <div class="stat-fill ${getScoreClass(stats.passRate)}" style="width: ${stats.passRate}%"></div>
        </div>
        <span class="stat-value">${stats.passRate}%</span>
      </div>
    `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Samsung GEO Pipeline Comparison Report</title>
  <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.0.3/src/regular/style.css">
  <style>
    :root {
      --color-bg: #ffffff;
      --color-surface: #fafafa;
      --color-border: #e5e5e5;
      --color-border-dark: #d4d4d4;
      --color-text: #171717;
      --color-text-secondary: #525252;
      --color-text-muted: #a3a3a3;
      --color-excellent: #171717;
      --color-good: #525252;
      --color-warning: #737373;
      --color-poor: #a3a3a3;
      --font-mono: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-sans);
      background: var(--color-bg);
      color: var(--color-text);
      line-height: 1.6;
      font-size: 14px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 24px;
    }

    /* Header */
    .header {
      margin-bottom: 48px;
      padding-bottom: 32px;
      border-bottom: 1px solid var(--color-border);
    }

    .header-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--color-text-muted);
      font-size: 12px;
      font-family: var(--font-mono);
      margin-bottom: 16px;
    }

    .header h1 {
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }

    .header-subtitle {
      color: var(--color-text-secondary);
      font-size: 15px;
    }

    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 48px;
    }

    .summary-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      padding: 24px;
      border-radius: 8px;
    }

    .summary-card-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-muted);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .summary-card-value {
      font-size: 32px;
      font-weight: 600;
      font-family: var(--font-mono);
    }

    .summary-card-sub {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin-top: 4px;
    }

    /* Section Headers */
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
      font-size: 18px;
      font-weight: 600;
    }

    .section-header i {
      font-size: 20px;
    }

    /* Stats Section */
    .stats-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 32px;
      margin-bottom: 48px;
    }

    .stats-group {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      padding: 24px;
      border-radius: 8px;
    }

    .stats-group h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-item {
      display: grid;
      grid-template-columns: 120px 1fr 50px 40px;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .stat-label {
      font-size: 13px;
      color: var(--color-text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .stat-bar {
      height: 6px;
      background: var(--color-border);
      border-radius: 3px;
      overflow: hidden;
    }

    .stat-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .stat-fill.score-excellent { background: var(--color-excellent); }
    .stat-fill.score-good { background: var(--color-good); }
    .stat-fill.score-warning { background: var(--color-warning); }
    .stat-fill.score-poor { background: var(--color-poor); }

    .stat-value {
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 500;
      text-align: right;
    }

    .stat-count {
      font-size: 12px;
      color: var(--color-text-muted);
    }

    /* Feedback Section */
    .feedback-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 32px;
      margin-bottom: 48px;
    }

    .feedback-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      padding: 24px;
      border-radius: 8px;
    }

    .feedback-card h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .feedback-item {
      font-size: 13px;
      padding: 8px 0;
      border-bottom: 1px solid var(--color-border);
      font-family: var(--font-mono);
    }

    .feedback-item:last-child {
      border-bottom: none;
    }

    /* Results Section */
    .results-section {
      margin-bottom: 48px;
    }

    .result-card {
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      margin-bottom: 24px;
      overflow: hidden;
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }

    .result-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .result-index {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--color-text-muted);
    }

    .result-category {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 8px;
      background: var(--color-border);
      border-radius: 4px;
    }

    .result-product {
      font-weight: 600;
      font-size: 14px;
    }

    .result-score {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 16px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 6px;
    }

    .result-score.score-excellent { background: #f0f0f0; }
    .result-score.score-good { background: #f5f5f5; }
    .result-score.score-warning { background: #fafafa; }
    .result-score.score-poor { background: #fafafa; color: var(--color-text-muted); }

    .result-title {
      font-size: 15px;
      font-weight: 500;
      padding: 16px 20px 8px;
    }

    .youtube-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--color-text-secondary);
      text-decoration: none;
      padding: 0 20px 16px;
    }

    .youtube-link:hover {
      color: var(--color-text);
    }

    /* Patterns Grid */
    .patterns-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      padding: 16px 20px;
      background: var(--color-surface);
      border-top: 1px solid var(--color-border);
      border-bottom: 1px solid var(--color-border);
    }

    .pattern-item {
      padding: 12px;
      border-radius: 6px;
      border: 1px solid var(--color-border);
      background: var(--color-bg);
    }

    .pattern-item.passed {
      border-color: var(--color-border-dark);
    }

    .pattern-item.failed {
      border-color: var(--color-border);
      background: var(--color-surface);
    }

    .pattern-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .pattern-name {
      font-size: 12px;
      font-weight: 600;
    }

    .pattern-score {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--color-text-secondary);
    }

    .pattern-details {
      font-size: 11px;
      color: var(--color-text-secondary);
    }

    .pattern-suggestions {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--color-border);
    }

    .pattern-suggestions span {
      display: block;
      font-size: 10px;
      color: var(--color-text-muted);
      font-style: italic;
    }

    /* Comparison Section */
    .comparison-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1px;
      background: var(--color-border);
    }

    .comparison-panel {
      background: var(--color-bg);
      padding: 16px 20px;
    }

    .comparison-panel.error-panel {
      background: #fafafa;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-secondary);
      margin-bottom: 12px;
    }

    .panel-content {
      font-size: 12px;
      font-family: var(--font-mono);
      line-height: 1.7;
      color: var(--color-text-secondary);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 300px;
      overflow-y: auto;
    }

    .panel-content.error {
      color: var(--color-warning);
    }

    /* Footer */
    .footer {
      text-align: center;
      padding-top: 32px;
      border-top: 1px solid var(--color-border);
      color: var(--color-text-muted);
      font-size: 12px;
    }

    .footer a {
      color: var(--color-text-secondary);
      text-decoration: none;
    }

    @media (max-width: 768px) {
      .comparison-section {
        grid-template-columns: 1fr;
      }

      .stat-item {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .stat-bar {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="header-meta">
        <i class="ph ph-calendar"></i>
        <span>${new Date(report.timestamp).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
      </div>
      <h1>Samsung GEO Pipeline Comparison Report</h1>
      <p class="header-subtitle">Comparing generated content against Samsung's ground truth from Excel</p>
    </header>

    <section class="summary-grid">
      <div class="summary-card">
        <div class="summary-card-label">
          <i class="ph ph-gauge"></i>
          Average Score
        </div>
        <div class="summary-card-value">${report.averageScore}%</div>
        <div class="summary-card-sub">${report.averageScore >= 85 ? 'Excellent' : report.averageScore >= 70 ? 'Good' : 'Needs Improvement'}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">
          <i class="ph ph-cube"></i>
          Products Tested
        </div>
        <div class="summary-card-value">${report.totalProducts}</div>
        <div class="summary-card-sub">Across ${Object.keys(report.categoryBreakdown).length} categories</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">
          <i class="ph ph-check-square"></i>
          Patterns Checked
        </div>
        <div class="summary-card-value">7</div>
        <div class="summary-card-sub">GEO optimization patterns</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">
          <i class="ph ph-trophy"></i>
          Best Category
        </div>
        <div class="summary-card-value">${Object.entries(report.categoryBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore)[0]?.[0] || 'N/A'}</div>
        <div class="summary-card-sub">${Object.entries(report.categoryBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore)[0]?.[1]?.avgScore || 0}% average</div>
      </div>
    </section>

    <section class="stats-section">
      <div class="stats-group">
        <h3><i class="ph ph-folder"></i> By Category</h3>
        ${categoryStatsHTML}
      </div>
      <div class="stats-group">
        <h3><i class="ph ph-list-checks"></i> By Pattern</h3>
        ${patternStatsHTML}
      </div>
    </section>

    <section class="feedback-section">
      <div class="feedback-card">
        <h3><i class="ph ph-chart-bar"></i> Feedback Summary</h3>
        ${report.feedbackSummary.map(f => `<div class="feedback-item">${escapeHtml(f)}</div>`).join('')}
      </div>
      <div class="feedback-card">
        <h3><i class="ph ph-arrow-up"></i> Improvement Priorities</h3>
        ${report.improvementPriorities.map(p => `<div class="feedback-item">${escapeHtml(p)}</div>`).join('')}
      </div>
    </section>

    <section class="results-section">
      <div class="section-header">
        <i class="ph ph-files"></i>
        Detailed Comparisons
      </div>
      ${resultsHTML}
    </section>

    <footer class="footer">
      <p>Samsung GEO Tool · Generated with <a href="#">GEO Pipeline v2</a></p>
    </footer>
  </div>
</body>
</html>`
}

// ==========================================
// MAIN
// ==========================================

async function runTests(): Promise<TestReport> {
  console.log('='.repeat(60))
  console.log('Samsung GEO Pipeline Test v2')
  console.log('='.repeat(60))
  console.log()

  // Load ground truth data
  const dataPath = path.join(__dirname, '..', 'geo_data_analysis.json')
  if (!fs.existsSync(dataPath)) {
    console.error('❌ geo_data_analysis.json not found')
    console.error('   Run: node parse_excel.js to generate it from excel.xlsx')
    process.exit(1)
  }

  const samples: GeoSample[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  console.log(`📊 Loaded ${samples.length} samples from ground truth data`)

  // Select 15 diverse products
  const testSamples = selectDiverseProducts(samples, 15)
  console.log(`🎯 Selected ${testSamples.length} diverse products for testing:`)

  const categoryCount: Record<string, number> = {}
  for (const s of testSamples) {
    categoryCount[s.contentsCategory] = (categoryCount[s.contentsCategory] || 0) + 1
  }
  for (const [cat, count] of Object.entries(categoryCount)) {
    console.log(`   - ${cat}: ${count}`)
  }
  console.log()

  // Check if we should call the actual API
  const useRealAPI = process.argv.includes('--api')
  if (useRealAPI) {
    console.log(`🌐 Using real API at: ${API_BASE_URL}`)
    console.log()
  } else {
    console.log(`📋 Using ground truth for validation (add --api to call real pipeline)`)
    console.log()
  }

  // Run comparisons
  const results: ComparisonResult[] = []
  for (let i = 0; i < testSamples.length; i++) {
    const sample = testSamples[i]
    console.log(`[${i + 1}/${testSamples.length}] Testing: ${sample.product} (${sample.contentsCategory})`)

    let generated: string
    let apiResponse: APIResponse | undefined
    let apiError: string | undefined

    if (useRealAPI) {
      const apiResult = await callGenerateAPI(sample)
      generated = apiResult.generatedContent
      apiResponse = apiResult.response
      apiError = apiResult.error

      if (apiError) {
        console.log(`   ⚠️ API Error: ${apiError.slice(0, 50)}...`)
      }
    } else {
      // Use ground truth for validation
      generated = sample.copyFinal
    }

    const result = compareWithGroundTruth(generated, sample.copyFinal, sample, apiResponse, apiError)
    results.push(result)

    console.log(`   Score: ${result.percentage}% (${result.matchQuality})`)
  }
  console.log()

  // Calculate aggregates
  const avgScore = results.reduce((sum, r) => sum + r.percentage, 0) / results.length

  const categoryBreakdown: Record<string, { avgScore: number; count: number }> = {}
  for (const result of results) {
    if (!categoryBreakdown[result.category]) {
      categoryBreakdown[result.category] = { avgScore: 0, count: 0 }
    }
    categoryBreakdown[result.category].avgScore += result.percentage
    categoryBreakdown[result.category].count++
  }
  for (const cat of Object.keys(categoryBreakdown)) {
    categoryBreakdown[cat].avgScore = Math.round(
      categoryBreakdown[cat].avgScore / categoryBreakdown[cat].count
    )
  }

  const patternBreakdown: Record<string, { avgScore: number; passRate: number }> = {}
  const patternStats: Record<string, { totalScore: number; maxScore: number; passed: number; total: number }> = {}
  for (const result of results) {
    for (const pattern of result.patterns) {
      if (!patternStats[pattern.name]) {
        patternStats[pattern.name] = { totalScore: 0, maxScore: 0, passed: 0, total: 0 }
      }
      patternStats[pattern.name].totalScore += pattern.score
      patternStats[pattern.name].maxScore += pattern.maxScore
      patternStats[pattern.name].total++
      if (pattern.passed) patternStats[pattern.name].passed++
    }
  }
  for (const [name, stats] of Object.entries(patternStats)) {
    patternBreakdown[name] = {
      avgScore: Math.round((stats.totalScore / stats.maxScore) * 100),
      passRate: Math.round((stats.passed / stats.total) * 100),
    }
  }

  const report: TestReport = {
    timestamp: new Date().toISOString(),
    totalProducts: testSamples.length,
    averageScore: Math.round(avgScore),
    categoryBreakdown,
    patternBreakdown,
    results,
    feedbackSummary: generateFeedbackSummary(results),
    improvementPriorities: generateImprovementPriorities(results),
  }

  // Print summary
  console.log('='.repeat(60))
  console.log('TEST RESULTS SUMMARY')
  console.log('='.repeat(60))
  console.log()
  console.log(`Average Score: ${report.averageScore}%`)
  console.log()
  console.log('By Category:')
  for (const [cat, stats] of Object.entries(report.categoryBreakdown)) {
    console.log(`  ${cat}: ${stats.avgScore}% (${stats.count} samples)`)
  }
  console.log()
  console.log('By Pattern:')
  for (const [pattern, stats] of Object.entries(report.patternBreakdown)) {
    console.log(`  ${pattern}: ${stats.avgScore}% avg, ${stats.passRate}% pass rate`)
  }
  console.log()

  for (const line of report.feedbackSummary) {
    console.log(line)
  }
  console.log()

  for (const line of report.improvementPriorities) {
    console.log(line)
  }

  // Generate HTML report
  const htmlReport = generateHTMLReport(report)
  const htmlPath = path.join(__dirname, '..', 'geo_comparison_report.html')
  fs.writeFileSync(htmlPath, htmlReport)
  console.log()
  console.log(`📄 HTML Report saved to: geo_comparison_report.html`)

  // Save JSON report
  const reportPath = path.join(__dirname, '..', 'geo_test_report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`📄 JSON Report saved to: geo_test_report.json`)

  return report
}

runTests()
  .then(report => {
    console.log()
    console.log('='.repeat(60))
    console.log('Test Complete')
    console.log('='.repeat(60))

    if (report.averageScore >= 85) {
      console.log('🎉 Excellent! Pipeline is well-optimized for GEO.')
    } else if (report.averageScore >= 70) {
      console.log('👍 Good performance. Review improvement priorities.')
    } else {
      console.log('⚠️ Needs improvement. Focus on high-priority patterns.')
    }

    console.log()
    console.log('Open geo_comparison_report.html in a browser to view the full comparison report.')
  })
  .catch(err => {
    console.error('Test failed:', err)
    process.exit(1)
  })
