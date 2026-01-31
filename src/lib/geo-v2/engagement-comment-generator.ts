/**
 * Engagement Comment Generator
 * Based on GEO Solution Brief Slide 4
 * "소비자 인게이지를 높일 수 있는 댓글 생성 (인플루언서 콜랩)"
 * Platforms: Instagram, LinkedIn, X
 */

import { GoogleGenAI } from '@google/genai'
import type {
  EngagementComment,
  EngagementCommentResult,
  EngagementPlatform,
  CommentType,
  ContentType,
} from '@/types/geo-v2'
import { safeJsonParse } from '@/lib/utils'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Platform-specific characteristics
const PLATFORM_GUIDELINES: Record<EngagementPlatform, {
  maxLength: number
  tone: string
  emojiUsage: 'heavy' | 'moderate' | 'minimal'
  hashtagsAllowed: boolean
  mentionsStyle: string
}> = {
  instagram: {
    maxLength: 300,
    tone: 'casual, friendly, Gen-Z friendly, enthusiastic',
    emojiUsage: 'heavy',
    hashtagsAllowed: true,
    mentionsStyle: '@username',
  },
  linkedin: {
    maxLength: 500,
    tone: 'professional, insightful, thought-leadership oriented',
    emojiUsage: 'minimal',
    hashtagsAllowed: true,
    mentionsStyle: '@[Name]',
  },
  x: {
    maxLength: 280,
    tone: 'witty, concise, conversational, trendy',
    emojiUsage: 'moderate',
    hashtagsAllowed: true,
    mentionsStyle: '@handle',
  },
}

// Comment type templates
const COMMENT_TYPE_TEMPLATES: Record<CommentType, string[]> = {
  question: [
    'Which feature are you most excited about?',
    'What would you use this for?',
    'Have you tried this yet?',
  ],
  cta: [
    'Tag someone who needs this!',
    'Drop a 🔥 if you agree',
    'Save this for later',
  ],
  highlight: [
    'This changes everything',
    'Game changer alert',
    'The future is here',
  ],
  engagement: [
    'Thoughts?',
    'What do you think?',
    'Let us know below',
  ],
}

interface EngagementCommentInput {
  productName: string
  keywords: string[]
  contentType: ContentType
  srtContent?: string
  briefUsps?: string[]
  platforms?: EngagementPlatform[]
  isInfluencerCollab?: boolean
}

/**
 * Generate engagement comments for social platforms
 * Based on GEO Solution Brief: "영상/링크 입력 시 인게이지먼트 댓글 생성 가능 여부 (IG/LI/X)"
 */
export async function generateEngagementComments(
  input: EngagementCommentInput
): Promise<EngagementCommentResult> {
  const {
    productName,
    keywords,
    contentType,
    srtContent,
    briefUsps,
    platforms = ['instagram', 'linkedin', 'x'],
    isInfluencerCollab = false,
  } = input

  console.log(`[EngagementComment] Generating comments for: ${productName} on ${platforms.join(', ')}`)

  const prompt = buildEngagementPrompt(
    productName,
    keywords,
    contentType,
    srtContent,
    briefUsps,
    platforms,
    isInfluencerCollab
  )

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        temperature: 0.9, // Higher creativity for engagement
        topP: 0.95,
        responseMimeType: 'application/json',
      },
    })

    const text = response.text || ''
    const parsed = safeJsonParse<{ comments?: EngagementComment[] }>(
      text,
      { comments: [] },
      'EngagementCommentGenerator'
    )

    if (!parsed.comments || parsed.comments.length === 0) {
      console.warn('[EngagementComment] No comments generated, using fallback')
      return generateFallbackComments(productName, keywords, platforms, isInfluencerCollab)
    }

    // Organize by platform
    const byPlatform: Record<EngagementPlatform, EngagementComment[]> = {
      instagram: [],
      linkedin: [],
      x: [],
    }

    for (const comment of parsed.comments) {
      if (byPlatform[comment.platform]) {
        byPlatform[comment.platform].push(comment)
      }
    }

    return {
      comments: parsed.comments,
      byPlatform,
    }
  } catch (error) {
    console.error('[EngagementComment] Generation failed:', error)
    return generateFallbackComments(productName, keywords, platforms, isInfluencerCollab)
  }
}

/**
 * Build the prompt for engagement comment generation
 */
function buildEngagementPrompt(
  productName: string,
  keywords: string[],
  contentType: ContentType,
  srtContent?: string,
  briefUsps?: string[],
  platforms: EngagementPlatform[] = ['instagram', 'linkedin', 'x'],
  isInfluencerCollab: boolean = false
): string {
  const platformGuidelines = platforms
    .map(p => {
      const g = PLATFORM_GUIDELINES[p]
      return `
### ${p.toUpperCase()}
- Max Length: ${g.maxLength} characters
- Tone: ${g.tone}
- Emoji Usage: ${g.emojiUsage}
- Hashtags: ${g.hashtagsAllowed ? 'allowed' : 'not recommended'}
- Mentions: ${g.mentionsStyle}`
    })
    .join('\n')

  return `You are a social media engagement expert for Samsung.
Generate comments designed to maximize user engagement and interaction.

## PRODUCT CONTEXT
Product: ${productName}
Content Type: ${contentType}
Key Features: ${briefUsps?.join(', ') || keywords.join(', ')}
${srtContent ? `Content Context: ${srtContent.slice(0, 300)}...` : ''}
${isInfluencerCollab ? 'This is an INFLUENCER COLLABORATION post.' : ''}

## PLATFORM GUIDELINES
${platformGuidelines}

## COMMENT TYPES TO GENERATE
For EACH platform, generate:
1. **question** - A question to spark conversation
2. **cta** - A call-to-action to drive engagement
3. **highlight** - A comment highlighting a key feature
4. **engagement** - A general engagement prompt

${isInfluencerCollab ? `
## INFLUENCER COLLAB GUIDELINES
- Reference the collaboration naturally
- Encourage followers to engage with both accounts
- Use authentic, non-promotional language
- Focus on the shared experience/story
` : ''}

## OUTPUT FORMAT (JSON)
{
  "comments": [
    {
      "text": "Comment text here",
      "platform": "instagram" | "linkedin" | "x",
      "type": "question" | "cta" | "highlight" | "engagement",
      "isInfluencerCollab": ${isInfluencerCollab}
    }
  ]
}

Generate 3-4 comments PER PLATFORM. Be creative, authentic, and platform-appropriate.
Do NOT be overly promotional - focus on genuine engagement.`
}

/**
 * Generate fallback comments when AI fails
 */
function generateFallbackComments(
  productName: string,
  keywords: string[],
  platforms: EngagementPlatform[],
  isInfluencerCollab: boolean
): EngagementCommentResult {
  const feature = keywords[0] || 'Galaxy AI'
  const comments: EngagementComment[] = []

  const fallbackByPlatform: Record<EngagementPlatform, EngagementComment[]> = {
    instagram: [],
    linkedin: [],
    x: [],
  }

  for (const platform of platforms) {
    const platformComments: EngagementComment[] = [
      {
        text: platform === 'instagram'
          ? `Which ${productName} feature are you most excited about? 👇✨`
          : platform === 'linkedin'
          ? `Curious to hear your thoughts on the new ${productName}. Which innovation stands out most to you?`
          : `${productName} is here 🔥 What feature are you trying first?`,
        platform,
        type: 'question',
        isInfluencerCollab,
      },
      {
        text: platform === 'instagram'
          ? `Tag someone who needs to see this! 🏷️ #${productName.replace(/\s+/g, '')} #GalaxyAI`
          : platform === 'linkedin'
          ? `Share this with your network if you're excited about the future of mobile AI.`
          : `RT if you're ready for ${feature} 🚀`,
        platform,
        type: 'cta',
        isInfluencerCollab,
      },
      {
        text: platform === 'instagram'
          ? `${feature} changes EVERYTHING 🤯 The future is literally in your hands!`
          : platform === 'linkedin'
          ? `${feature} represents a significant leap forward in mobile technology. Here's why it matters.`
          : `${feature} on ${productName} is a game changer. Here's why 🧵`,
        platform,
        type: 'highlight',
        isInfluencerCollab,
      },
    ]

    comments.push(...platformComments)
    fallbackByPlatform[platform] = platformComments
  }

  return {
    comments,
    byPlatform: fallbackByPlatform,
  }
}

/**
 * Generate influencer-specific engagement comments
 */
export async function generateInfluencerCollabComments(
  input: EngagementCommentInput & { influencerName: string; influencerHandle: string }
): Promise<EngagementCommentResult> {
  return generateEngagementComments({
    ...input,
    isInfluencerCollab: true,
  })
}

export { PLATFORM_GUIDELINES, COMMENT_TYPE_TEMPLATES }
