import { VIDEO_ANALYSIS_PROMPT } from '@/types/video-analysis'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export interface GeminiVideoAnalysisResult {
  seo_title: string
  meta_description: string
  primary_keywords: string[]
  secondary_keywords: string[]
  long_tail_keywords: string[]
  search_intent: string
  scene_breakdown: Array<{
    timestamp: string
    visual_description: string
    text_narration: string
  }>
  technical_specs: Array<{
    component: string
    specification: string
  }>
  topic_hierarchy: {
    core_theme: string
    subtopics: Array<{
      name: string
      description: string
    }>
  }
  named_entities: Array<{
    type: string
    name: string
    context?: string
  }>
  key_claims: string[]
  target_audience: string
  tone_sentiment: string
  color_palette: string[]
  visual_style: string
  production_quality: string
  thumbnail_recommendations: Array<{
    timestamp: string
    description: string
    recommendation: string
  }>
  schema_video_object: Record<string, unknown>
  schema_faq: Record<string, unknown>
  content_gaps: string[]
  follow_up_suggestions: string[]
}

export interface GeminiUsageMetadata {
  promptTokenCount: number
  candidatesTokenCount: number
  totalTokenCount: number
  promptTokensDetails?: Array<{
    modality: string
    tokenCount: number
  }>
  thoughtsTokenCount?: number
}

export interface GeminiAnalysisResponse {
  analysis: GeminiVideoAnalysisResult
  usage: GeminiUsageMetadata
  rawText: string
}

/**
 * Analyze a video using Gemini 3 Flash Preview
 * Supports both uploaded files (via file_uri) and base64 inline data
 */
export async function analyzeVideoWithGemini(
  videoSource: { type: 'uri'; uri: string; mimeType: string } | { type: 'base64'; data: string; mimeType: string }
): Promise<GeminiAnalysisResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const parts: Array<Record<string, unknown>> = []

  // Add video source
  if (videoSource.type === 'uri') {
    parts.push({
      file_data: {
        file_uri: videoSource.uri,
        mime_type: videoSource.mimeType,
      },
    })
  } else {
    parts.push({
      inline_data: {
        mime_type: videoSource.mimeType,
        data: videoSource.data,
      },
    })
  }

  // Add analysis prompt
  parts.push({
    text: VIDEO_ANALYSIS_PROMPT,
  })

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts,
          },
        ],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.2,
        },
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('No response from Gemini API')
  }

  const rawText = data.candidates[0].content.parts[0].text
  const usage: GeminiUsageMetadata = data.usageMetadata || {}

  // Parse the JSON response
  // Find JSON in the response (it might be wrapped in markdown code blocks)
  let jsonText = rawText
  const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/) || rawText.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    jsonText = jsonMatch[1] || jsonMatch[0]
  }

  try {
    const analysis = JSON.parse(jsonText) as GeminiVideoAnalysisResult
    return { analysis, usage, rawText }
  } catch {
    // If JSON parsing fails, return the raw text with empty analysis
    console.error('Failed to parse Gemini response as JSON:', jsonText.substring(0, 500))
    throw new Error('Failed to parse video analysis response')
  }
}

/**
 * Upload a video file to Gemini Files API for analysis
 * Use this for videos > 20MB
 */
export async function uploadVideoToGemini(
  videoBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ uri: string; mimeType: string }> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const numBytes = videoBuffer.length

  // Step 1: Start resumable upload
  const startResponse = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': numBytes.toString(),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: {
          display_name: fileName,
        },
      }),
    }
  )

  if (!startResponse.ok) {
    throw new Error(`Failed to start upload: ${await startResponse.text()}`)
  }

  const uploadUrl = startResponse.headers.get('x-goog-upload-url')
  if (!uploadUrl) {
    throw new Error('No upload URL returned')
  }

  // Step 2: Upload the video data
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': numBytes.toString(),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: new Uint8Array(videoBuffer),
  })

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload video: ${await uploadResponse.text()}`)
  }

  const fileInfo = await uploadResponse.json()

  if (!fileInfo.file?.uri) {
    throw new Error('No file URI returned after upload')
  }

  return {
    uri: fileInfo.file.uri,
    mimeType: fileInfo.file.mimeType || mimeType,
  }
}

/**
 * Check the processing status of an uploaded file
 */
export async function checkFileStatus(fileUri: string): Promise<{
  state: 'PROCESSING' | 'ACTIVE' | 'FAILED'
  error?: string
}> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  // Extract file name from URI
  const fileName = fileUri.split('/').pop()

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${GEMINI_API_KEY}`
  )

  if (!response.ok) {
    throw new Error(`Failed to check file status: ${await response.text()}`)
  }

  const data = await response.json()

  return {
    state: data.state,
    error: data.error?.message,
  }
}

/**
 * Wait for a file to finish processing
 */
export async function waitForFileProcessing(
  fileUri: string,
  maxWaitMs = 300000, // 5 minutes
  pollIntervalMs = 5000
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkFileStatus(fileUri)

    if (status.state === 'ACTIVE') {
      return
    }

    if (status.state === 'FAILED') {
      throw new Error(`File processing failed: ${status.error || 'Unknown error'}`)
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error('File processing timed out')
}
