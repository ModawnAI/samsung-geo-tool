import type { ChunkingConfig } from '@/types/playbook'

/**
 * Text chunking utilities for document ingestion
 */

export interface TextChunk {
  content: string
  index: number
  startOffset: number
  endOffset: number
}

/**
 * Split text into overlapping chunks while preserving paragraph boundaries
 */
export function chunkText(
  text: string,
  config: ChunkingConfig = {
    maxChunkSize: 1000,
    chunkOverlap: 200,
    minChunkSize: 100,
    preserveParagraphs: true,
  }
): TextChunk[] {
  const { maxChunkSize, chunkOverlap, minChunkSize, preserveParagraphs } = config

  // Normalize whitespace
  const normalizedText = text.replace(/\r\n/g, '\n').trim()

  if (normalizedText.length <= maxChunkSize) {
    return [{
      content: normalizedText,
      index: 0,
      startOffset: 0,
      endOffset: normalizedText.length,
    }]
  }

  const chunks: TextChunk[] = []
  let currentPosition = 0
  let chunkIndex = 0

  while (currentPosition < normalizedText.length) {
    // Calculate end position for this chunk
    let endPosition = Math.min(currentPosition + maxChunkSize, normalizedText.length)

    // If we're not at the end and preserving paragraphs, find a good break point
    if (endPosition < normalizedText.length && preserveParagraphs) {
      // Look for paragraph break (double newline)
      const paragraphBreak = normalizedText.lastIndexOf('\n\n', endPosition)
      if (paragraphBreak > currentPosition + minChunkSize) {
        endPosition = paragraphBreak + 2
      } else {
        // Look for sentence break
        const sentenceBreak = findSentenceBreak(normalizedText, currentPosition, endPosition)
        if (sentenceBreak > currentPosition + minChunkSize) {
          endPosition = sentenceBreak
        }
      }
    }

    const chunkContent = normalizedText.slice(currentPosition, endPosition).trim()

    if (chunkContent.length >= minChunkSize || currentPosition + maxChunkSize >= normalizedText.length) {
      chunks.push({
        content: chunkContent,
        index: chunkIndex,
        startOffset: currentPosition,
        endOffset: endPosition,
      })
      chunkIndex++
    }

    // Move position forward, accounting for overlap
    currentPosition = endPosition - chunkOverlap

    // Ensure we're making progress
    if (currentPosition <= chunks[chunks.length - 1]?.startOffset) {
      currentPosition = endPosition
    }
  }

  return chunks
}

/**
 * Find a sentence break point within the given range
 */
function findSentenceBreak(text: string, start: number, end: number): number {
  // Look for sentence-ending punctuation followed by space
  const sentenceEndings = ['. ', '! ', '? ', '.\n', '!\n', '?\n', '。', '！', '？']

  let bestBreak = -1
  for (const ending of sentenceEndings) {
    const position = text.lastIndexOf(ending, end)
    if (position > start && position > bestBreak) {
      bestBreak = position + ending.length
    }
  }

  return bestBreak
}

/**
 * Extract text from markdown content with better handling
 */
export function preprocessMarkdown(markdown: string): string {
  return markdown
    // Remove code blocks but keep content description
    .replace(/```[\s\S]*?```/g, '[code block]')
    // Remove inline code
    .replace(/`[^`]+`/g, (match) => match.slice(1, -1))
    // Convert headers to emphasized text
    .replace(/^#{1,6}\s+(.+)$/gm, '\n$1\n')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Convert bold/italic to plain text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove images but keep alt text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Normalize multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Detect if text contains Korean characters
 */
export function detectLanguage(text: string): 'en' | 'ko' {
  const koreanPattern = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/
  const koreanMatches = (text.match(koreanPattern) || []).length
  const totalChars = text.replace(/\s/g, '').length

  // If more than 20% Korean characters, classify as Korean
  return koreanMatches / totalChars > 0.2 ? 'ko' : 'en'
}

/**
 * Extract section from content based on headers or keywords
 */
export function detectSection(content: string): string {
  const sectionKeywords: Record<string, string[]> = {
    brand_guidelines: ['brand', 'logo', 'color', 'typography', '브랜드', '로고'],
    product_features: ['feature', 'specification', 'spec', '기능', '사양'],
    marketing_strategy: ['strategy', 'campaign', 'marketing', '전략', '마케팅', '캠페인'],
    content_creation: ['content', 'create', 'writing', '콘텐츠', '작성'],
    seo_guidelines: ['seo', 'search', 'optimization', 'keyword', '검색', '최적화'],
    social_media: ['social', 'instagram', 'youtube', 'tiktok', '소셜', '인스타'],
    geo_optimization: ['geo', 'generative', 'ai search', 'aeo', 'chatgpt', 'perplexity'],
    campaign_templates: ['template', 'example', 'sample', '템플릿', '예시'],
    visual_standards: ['visual', 'image', 'photo', 'video', '비주얼', '이미지'],
    tone_voice: ['tone', 'voice', 'style', 'writing style', '톤앤매너', '문체'],
    competitive_positioning: ['competitive', 'competitor', 'position', '경쟁', '포지셔닝'],
    target_audience: ['target', 'audience', 'persona', 'user', '타겟', '오디언스'],
  }

  const lowerContent = content.toLowerCase()

  for (const [section, keywords] of Object.entries(sectionKeywords)) {
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        return section
      }
    }
  }

  return 'other'
}
