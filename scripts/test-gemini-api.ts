/**
 * Test script for Gemini API to debug generation issues
 * Run with: npx ts-node scripts/test-gemini-api.ts
 */

import { GoogleGenAI } from '@google/genai'

async function testGeminiAPI() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    console.error('❌ No API key found. Set GEMINI_API_KEY or GOOGLE_AI_API_KEY')
    process.exit(1)
  }

  console.log('🔑 API Key found:', apiKey.slice(0, 10) + '...')

  const ai = new GoogleGenAI({ apiKey })

  // Test 1: Simple text generation
  console.log('\n📝 Test 1: Simple text generation')
  try {
    const response1 = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: 'Say "Hello, I am working!" in one sentence.',
      config: {
        maxOutputTokens: 100,
      },
    })
    console.log('✅ Response text:', response1.text)
    console.log('   Response keys:', Object.keys(response1))
  } catch (error) {
    console.error('❌ Test 1 failed:', error)
  }

  // Test 2: JSON structured output (like description generation)
  console.log('\n📝 Test 2: JSON structured output')
  try {
    const response2 = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: 'Generate a product description for Galaxy S25 Ultra smartphone.',
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            preview: { type: 'string', description: 'First 130 characters' },
            full: { type: 'string', description: 'Full description 300-500 chars' },
          },
          required: ['preview', 'full'],
        },
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    })
    console.log('✅ Response text:', response2.text?.slice(0, 300))
    console.log('   Text length:', response2.text?.length)

    // Check raw response structure
    const raw = response2 as unknown as Record<string, unknown>
    if (raw.candidates) {
      console.log('   Candidates:', JSON.stringify(raw.candidates, null, 2).slice(0, 500))
    }
  } catch (error) {
    console.error('❌ Test 2 failed:', error)
  }

  // Test 3: Larger JSON output (simulating full description)
  console.log('\n📝 Test 3: Larger JSON output with system instruction')
  try {
    const systemInstruction = `You are a Samsung product description writer.
Generate engaging descriptions for YouTube videos.
Output valid JSON only.`

    const response3 = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `Generate a YouTube description for Galaxy S25 Ultra with these features:
- 200MP camera with AI enhancement
- Titanium frame for durability
- 5000mAh battery with fast charging
- Galaxy AI features

Output JSON with:
- preview: First 130 characters (110-130 chars)
- full: Complete description (500-800 chars)
- vanityLinks: Array of suggested vanity links`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            preview: { type: 'string' },
            full: { type: 'string' },
            vanityLinks: { type: 'array', items: { type: 'string' } },
          },
          required: ['preview', 'full', 'vanityLinks'],
        },
        maxOutputTokens: 4000,
        temperature: 0.7,
      },
    })

    console.log('✅ Response text length:', response3.text?.length)
    console.log('   Preview of response:', response3.text?.slice(0, 500))

    // Parse and show structured
    if (response3.text) {
      try {
        const parsed = JSON.parse(response3.text)
        console.log('\n   Parsed JSON:')
        console.log('   - preview length:', parsed.preview?.length)
        console.log('   - full length:', parsed.full?.length)
        console.log('   - vanityLinks:', parsed.vanityLinks)
      } catch (e) {
        console.log('   ⚠️ JSON parse failed:', e)
      }
    }

    // Check candidates for finish reason
    const raw = response3 as unknown as Record<string, unknown>
    if (raw.candidates) {
      const candidates = raw.candidates as Array<{ finishReason?: string }>
      console.log('   Finish reason:', candidates[0]?.finishReason)
    }
  } catch (error) {
    console.error('❌ Test 3 failed:', error)
  }

  // Test 4: Check model list
  console.log('\n📝 Test 4: List available models')
  try {
    // Try to get model info
    const response4 = await ai.models.generateContent({
      model: 'gemini-2.0-flash',  // Try specific version
      contents: 'Say "Working with gemini-2.0-flash"',
      config: { maxOutputTokens: 50 },
    })
    console.log('✅ gemini-2.0-flash works:', response4.text)
  } catch (error) {
    console.log('   gemini-2.0-flash not available:', (error as Error).message?.slice(0, 100))
  }

  try {
    const response5 = await ai.models.generateContent({
      model: 'gemini-1.5-flash',  // Try 1.5 version
      contents: 'Say "Working with gemini-1.5-flash"',
      config: { maxOutputTokens: 50 },
    })
    console.log('✅ gemini-1.5-flash works:', response5.text)
  } catch (error) {
    console.log('   gemini-1.5-flash not available:', (error as Error).message?.slice(0, 100))
  }

  console.log('\n✨ Tests complete!')
}

testGeminiAPI().catch(console.error)
