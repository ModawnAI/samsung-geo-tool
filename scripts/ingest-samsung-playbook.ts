/**
 * Samsung Marketing Strategy Playbook Ingestion Script
 *
 * This script reads the Samsung Marketing Strategy Playbook 2025 markdown file
 * and ingests it into Pinecone with extensive metadata extraction.
 *
 * Usage (via API - requires dev server running):
 *   npm run dev  # in another terminal
 *   npx tsx scripts/ingest-samsung-playbook.ts [path-to-playbook.md]
 *
 * The script will call the API endpoint to trigger ingestion.
 */

import * as fs from 'fs'

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000'

async function main() {
  // Default path to the playbook
  const defaultPlaybookPath = '/Users/kjyoo/Downloads/Archive 2 (1)/Samsung_Marketing_Strategy_Playbook_2025.md'
  const playbookPath = process.argv[2] || defaultPlaybookPath

  console.log('='.repeat(60))
  console.log('Samsung Marketing Strategy Playbook Ingestion')
  console.log('='.repeat(60))
  console.log()

  // Check if file exists
  if (!fs.existsSync(playbookPath)) {
    console.error(`❌ Playbook file not found: ${playbookPath}`)
    process.exit(1)
  }

  // Read the playbook
  console.log(`📂 Reading playbook from: ${playbookPath}`)
  const markdownContent = fs.readFileSync(playbookPath, 'utf-8')
  console.log(`   - File size: ${(markdownContent.length / 1024).toFixed(2)} KB`)
  console.log(`   - Line count: ${markdownContent.split('\n').length}`)
  console.log()

  // Check API configuration
  console.log(`🔗 API URL: ${API_BASE_URL}`)
  console.log()

  // First check API health
  try {
    const healthCheck = await fetch(`${API_BASE_URL}/api/playbook/ingest-samsung`)
    if (!healthCheck.ok) {
      throw new Error(`Health check failed: ${healthCheck.status}`)
    }
    const config = await healthCheck.json()
    console.log('✅ API server is running')
    console.log(`   - Pinecone: ${config.configuration?.pinecone ? '✓' : '✗'}`)
    console.log(`   - OpenAI: ${config.configuration?.openai ? '✓' : '✗'}`)
    console.log(`   - Cohere: ${config.configuration?.cohere ? '✓' : '⚠️ (optional)'}`)

    if (!config.configuration?.allRequired) {
      console.error('❌ Required services not configured')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Cannot connect to API server')
    console.error('   Make sure the dev server is running: npm run dev')
    console.error(`   Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }

  console.log()
  console.log('🚀 Starting ingestion process...')
  console.log('   This may take several minutes depending on document size.')
  console.log()

  const startTime = Date.now()

  try {
    const response = await fetch(`${API_BASE_URL}/api/playbook/ingest-samsung`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-bypass': 'true', // Bypass auth in development
      },
      body: JSON.stringify({
        content: markdownContent,
        version: '2025.1',
        uploadedBy: 'ingestion-script',
      }),
    })

    const result = await response.json()
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log()
    console.log('='.repeat(60))
    console.log('Ingestion Complete')
    console.log('='.repeat(60))
    console.log()

    if (!response.ok || !result.success) {
      console.log(`Status: ❌ FAILED`)
      console.log(`Error: ${result.error}`)
      if (result.documentId) {
        console.log(`Document ID: ${result.documentId}`)
      }
      process.exit(1)
    }

    console.log(`Status: ✅ SUCCESS`)
    console.log(`Document ID: ${result.documentId}`)
    console.log(`Total Chunks: ${result.totalChunks}`)
    console.log(`Duration: ${duration} seconds (script) / ${result.processingTimeMs}ms (API)`)

    console.log()
    console.log('📊 Next steps:')
    console.log('   1. Test retrieval with sample queries using the search API')
    console.log('   2. Verify metadata extraction in Pinecone console')
    console.log('   3. Use in content generation for Samsung GEO Tool')
    console.log()
    console.log(`💡 Test command:`)
    console.log(`   curl -X POST ${API_BASE_URL}/api/playbook/search \\`)
    console.log(`     -H "Content-Type: application/json" \\`)
    console.log(`     -H "x-dev-bypass: true" \\`)
    console.log(`     -d '{"query": "Galaxy S25 톤앤매너"}'`)
    console.log()

  } catch (error) {
    console.error()
    console.error('❌ Ingestion failed with error:')
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
