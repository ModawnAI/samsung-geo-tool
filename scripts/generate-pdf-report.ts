import PDFDocument from 'pdfkit'
import * as fs from 'fs'

interface PatternResult {
  name: string
  score: number
  maxScore: number
  passed: boolean
  details: string
  suggestions?: string[]
}

interface TestResult {
  product: string
  category: string
  youtubeTitle: string
  youtubeUrl: string
  patterns: PatternResult[]
  totalScore: number
  maxScore: number
  percentage: number
  matchQuality: string
  groundTruth: string
  generated: string
  apiError?: string
}

interface ReportData {
  timestamp: string
  totalProducts: number
  averageScore: number
  categoryBreakdown: Record<string, { avgScore: number; count: number }>
  patternBreakdown: Record<string, { avgScore: number; passRate: number }>
  results: TestResult[]
  suggestions?: string[]
}

// Design constants matching HTML report style
const COLORS = {
  text: '#171717',
  textSecondary: '#525252',
  textMuted: '#a3a3a3',
  border: '#e5e5e5',
  surface: '#fafafa',
  excellent: '#171717',
  good: '#525252',
  warning: '#737373',
  poor: '#a3a3a3',
}

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 40,
}

const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

function getScoreClass(score: number): string {
  if (score >= 95) return 'excellent'
  if (score >= 85) return 'good'
  if (score >= 70) return 'warning'
  return 'poor'
}

function getScoreColor(score: number): string {
  const cls = getScoreClass(score)
  return COLORS[cls as keyof typeof COLORS]
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) + ' at ' + date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getBestCategory(categoryBreakdown: Record<string, { avgScore: number; count: number }>): string {
  let best = ''
  let bestScore = 0
  for (const [cat, data] of Object.entries(categoryBreakdown)) {
    if (data.avgScore > bestScore) {
      bestScore = data.avgScore
      best = cat
    }
  }
  return best
}

async function generatePDFReport() {
  const reportPath = './geo_test_report.json'
  if (!fs.existsSync(reportPath)) {
    console.error('Error: geo_test_report.json not found. Run the test first.')
    process.exit(1)
  }

  const reportData: ReportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin },
    bufferPages: true,
  })

  const outputPath = './geo_comparison_report.pdf'
  const stream = fs.createWriteStream(outputPath)
  doc.pipe(stream)

  // ============ PAGE 1: COVER & SUMMARY ============

  // Header
  doc.fillColor(COLORS.textMuted)
  doc.fontSize(10).font('Helvetica')
  doc.text(formatDate(reportData.timestamp), PAGE.margin, PAGE.margin)

  doc.moveDown(1.5)
  doc.fillColor(COLORS.text)
  doc.fontSize(24).font('Helvetica-Bold')
  doc.text('Samsung GEO Pipeline Comparison Report')

  doc.moveDown(0.3)
  doc.fillColor(COLORS.textSecondary)
  doc.fontSize(12).font('Helvetica')
  doc.text('Comparing generated content against Samsung\'s ground truth from Excel')

  // Divider
  doc.moveDown(1.5)
  doc.moveTo(PAGE.margin, doc.y).lineTo(PAGE.width - PAGE.margin, doc.y).strokeColor(COLORS.border).stroke()
  doc.moveDown(1.5)

  // Summary Cards (4 in a row)
  const cardWidth = (CONTENT_WIDTH - 30) / 4
  const cardHeight = 80
  const cardY = doc.y

  const summaryCards = [
    { label: 'AVERAGE SCORE', value: `${reportData.averageScore}%`, sub: getScoreClass(reportData.averageScore).charAt(0).toUpperCase() + getScoreClass(reportData.averageScore).slice(1) },
    { label: 'PRODUCTS TESTED', value: String(reportData.totalProducts), sub: `Across ${Object.keys(reportData.categoryBreakdown).length} categories` },
    { label: 'PATTERNS CHECKED', value: String(Object.keys(reportData.patternBreakdown).length), sub: 'GEO optimization patterns' },
    { label: 'BEST CATEGORY', value: getBestCategory(reportData.categoryBreakdown), sub: `${reportData.categoryBreakdown[getBestCategory(reportData.categoryBreakdown)]?.avgScore || 0}% average` },
  ]

  summaryCards.forEach((card, i) => {
    const x = PAGE.margin + i * (cardWidth + 10)

    // Card background
    doc.rect(x, cardY, cardWidth, cardHeight).fillColor(COLORS.surface).fill()
    doc.rect(x, cardY, cardWidth, cardHeight).strokeColor(COLORS.border).stroke()

    // Label
    doc.fillColor(COLORS.textMuted)
    doc.fontSize(8).font('Helvetica')
    doc.text(card.label, x + 10, cardY + 12, { width: cardWidth - 20 })

    // Value
    doc.fillColor(COLORS.text)
    doc.fontSize(20).font('Helvetica-Bold')
    doc.text(card.value, x + 10, cardY + 28, { width: cardWidth - 20 })

    // Sub
    doc.fillColor(COLORS.textSecondary)
    doc.fontSize(9).font('Helvetica')
    doc.text(card.sub, x + 10, cardY + 55, { width: cardWidth - 20 })
  })

  doc.y = cardY + cardHeight + 30

  // Stats Section Header
  doc.fillColor(COLORS.text)
  doc.fontSize(14).font('Helvetica-Bold')
  doc.text('Performance Breakdown')
  doc.moveDown(1)

  // Two-column stats layout
  const statsY = doc.y
  const statsWidth = (CONTENT_WIDTH - 20) / 2

  // By Category (Left)
  let currentY = statsY
  doc.fillColor(COLORS.text)
  doc.fontSize(11).font('Helvetica-Bold')
  doc.text('By Category', PAGE.margin, currentY)
  currentY += 20

  for (const [category, data] of Object.entries(reportData.categoryBreakdown)) {
    // Label
    doc.fillColor(COLORS.textSecondary)
    doc.fontSize(9).font('Helvetica')
    doc.text(category, PAGE.margin, currentY, { width: 70 })

    // Bar background
    const barX = PAGE.margin + 75
    const barWidth = 100
    doc.rect(barX, currentY + 2, barWidth, 6).fillColor(COLORS.border).fill()

    // Bar fill
    const fillWidth = (data.avgScore / 100) * barWidth
    doc.rect(barX, currentY + 2, fillWidth, 6).fillColor(getScoreColor(data.avgScore)).fill()

    // Value
    doc.fillColor(COLORS.text)
    doc.fontSize(9).font('Helvetica')
    doc.text(`${data.avgScore}%`, barX + barWidth + 10, currentY)

    // Count
    doc.fillColor(COLORS.textMuted)
    doc.text(`(${data.count})`, barX + barWidth + 45, currentY)

    currentY += 18
  }

  // By Pattern (Right)
  currentY = statsY
  const rightX = PAGE.margin + statsWidth + 20
  doc.fillColor(COLORS.text)
  doc.fontSize(11).font('Helvetica-Bold')
  doc.text('By Pattern', rightX, currentY)
  currentY += 20

  for (const [pattern, data] of Object.entries(reportData.patternBreakdown)) {
    const status = data.passRate >= 90 ? '✓' : data.passRate >= 70 ? '~' : '✗'

    // Status icon
    doc.fillColor(data.passRate >= 90 ? COLORS.text : data.passRate >= 70 ? COLORS.textSecondary : COLORS.textMuted)
    doc.fontSize(9).font('Helvetica')
    doc.text(status, rightX, currentY, { width: 15 })

    // Pattern name
    doc.fillColor(COLORS.textSecondary)
    doc.text(pattern, rightX + 15, currentY, { width: 85 })

    // Bar
    const barX = rightX + 100
    const barWidth = 80
    doc.rect(barX, currentY + 2, barWidth, 6).fillColor(COLORS.border).fill()
    doc.rect(barX, currentY + 2, (data.passRate / 100) * barWidth, 6).fillColor(getScoreColor(data.passRate)).fill()

    // Values
    doc.fillColor(COLORS.text)
    doc.text(`${data.passRate}%`, barX + barWidth + 10, currentY)

    currentY += 18
  }

  doc.y = Math.max(currentY, doc.y) + 20

  // Suggestions/Feedback Section
  if (reportData.suggestions && reportData.suggestions.length > 0) {
    doc.moveTo(PAGE.margin, doc.y).lineTo(PAGE.width - PAGE.margin, doc.y).strokeColor(COLORS.border).stroke()
    doc.moveDown(1)

    doc.fillColor(COLORS.text)
    doc.fontSize(11).font('Helvetica-Bold')
    doc.text('Suggestions')
    doc.moveDown(0.5)

    doc.fillColor(COLORS.textSecondary)
    doc.fontSize(9).font('Courier')
    reportData.suggestions.slice(0, 8).forEach(suggestion => {
      doc.text(`• ${suggestion}`)
    })
  }

  // ============ DETAILED RESULT PAGES ============
  for (let idx = 0; idx < reportData.results.length; idx++) {
    const result = reportData.results[idx]
    doc.addPage()

    // Result Header
    const headerY = PAGE.margin

    // Index badge
    doc.fillColor(COLORS.textMuted)
    doc.fontSize(10).font('Courier')
    doc.text(`${String(idx + 1).padStart(2, '0')}`, PAGE.margin, headerY)

    // Category badge
    const catBadgeX = PAGE.margin + 30
    doc.rect(catBadgeX, headerY - 2, 70, 16).fillColor(COLORS.border).fill()
    doc.fillColor(COLORS.text)
    doc.fontSize(8).font('Helvetica')
    doc.text(result.category.toUpperCase(), catBadgeX + 5, headerY + 2, { width: 60 })

    // Product name
    doc.fillColor(COLORS.text)
    doc.fontSize(13).font('Helvetica-Bold')
    doc.text(result.product, catBadgeX + 80, headerY)

    // Score badge (right side)
    const scoreText = `${result.percentage}%`
    const scoreBadgeWidth = 70
    const scoreBadgeX = PAGE.width - PAGE.margin - scoreBadgeWidth
    doc.rect(scoreBadgeX, headerY - 4, scoreBadgeWidth, 22).fillColor(COLORS.surface).fill()
    doc.fillColor(getScoreColor(result.percentage))
    doc.fontSize(14).font('Helvetica-Bold')
    doc.text(scoreText, scoreBadgeX, headerY, { width: scoreBadgeWidth, align: 'center' })

    // YouTube title
    doc.y = headerY + 25
    doc.fillColor(COLORS.text)
    doc.fontSize(11).font('Helvetica')
    doc.text(truncateText(result.youtubeTitle, 90), PAGE.margin)

    doc.moveDown(0.3)
    doc.fillColor(COLORS.textMuted)
    doc.fontSize(9).font('Helvetica')
    doc.text(result.youtubeUrl, { link: result.youtubeUrl })

    // Patterns Grid
    doc.moveDown(1)
    doc.rect(PAGE.margin, doc.y, CONTENT_WIDTH, 1).fillColor(COLORS.border).fill()
    doc.y += 10

    const patternsY = doc.y
    const patternWidth = (CONTENT_WIDTH - 20) / 4
    const patternHeight = 50

    result.patterns.forEach((pattern, i) => {
      const row = Math.floor(i / 4)
      const col = i % 4
      const x = PAGE.margin + col * (patternWidth + 5)
      const y = patternsY + row * (patternHeight + 5)

      // Pattern card
      const borderColor = pattern.passed ? COLORS.text : COLORS.border
      doc.rect(x, y, patternWidth, patternHeight).strokeColor(borderColor).stroke()
      if (!pattern.passed) {
        doc.rect(x, y, patternWidth, patternHeight).fillColor(COLORS.surface).fill()
        doc.rect(x, y, patternWidth, patternHeight).strokeColor(borderColor).stroke()
      }

      // Pattern name
      doc.fillColor(COLORS.text)
      doc.fontSize(9).font('Helvetica-Bold')
      doc.text(pattern.name, x + 8, y + 8, { width: patternWidth - 16 })

      // Score
      doc.fillColor(COLORS.textSecondary)
      doc.fontSize(8).font('Courier')
      doc.text(`${pattern.score}/${pattern.maxScore}`, x + patternWidth - 35, y + 8)

      // Details
      doc.fillColor(COLORS.textSecondary)
      doc.fontSize(7).font('Helvetica')
      doc.text(truncateText(pattern.details, 40), x + 8, y + 25, { width: patternWidth - 16 })
    })

    const patternsEndY = patternsY + Math.ceil(result.patterns.length / 4) * (patternHeight + 5) + 10
    doc.y = patternsEndY

    doc.rect(PAGE.margin, doc.y, CONTENT_WIDTH, 1).fillColor(COLORS.border).fill()
    doc.y += 15

    // Comparison Section (side by side)
    const comparisonY = doc.y
    const panelWidth = (CONTENT_WIDTH - 5) / 2
    const availableHeight = PAGE.height - PAGE.margin - comparisonY - 30

    // Ground Truth Panel (Left)
    doc.fillColor(COLORS.textSecondary)
    doc.fontSize(9).font('Helvetica-Bold')
    doc.text('GROUND TRUTH', PAGE.margin, comparisonY)

    doc.y = comparisonY + 18
    doc.rect(PAGE.margin, doc.y, panelWidth, availableHeight - 18).fillColor('#f0f9ff').fill()

    doc.fillColor(COLORS.textSecondary)
    doc.fontSize(8).font('Courier')
    const gtText = result.groundTruth || '(No ground truth available)'
    doc.text(gtText, PAGE.margin + 8, doc.y + 8, {
      width: panelWidth - 16,
      height: availableHeight - 34,
      ellipsis: true,
    })

    // Generated Panel (Right)
    doc.fillColor(COLORS.textSecondary)
    doc.fontSize(9).font('Helvetica-Bold')
    doc.text('GENERATED OUTPUT', PAGE.margin + panelWidth + 5, comparisonY)

    const genPanelY = comparisonY + 18
    const genBgColor = result.apiError ? '#fef2f2' : '#f0fdf4'
    doc.rect(PAGE.margin + panelWidth + 5, genPanelY, panelWidth, availableHeight - 18).fillColor(genBgColor).fill()

    doc.fillColor(result.apiError ? COLORS.warning : COLORS.textSecondary)
    doc.fontSize(8).font('Courier')
    let genText = result.generated || '(API not called)'
    if (result.apiError) {
      genText = `API Error: ${result.apiError}\n\n(Using ground truth for scoring)`
    }
    doc.text(genText, PAGE.margin + panelWidth + 13, genPanelY + 8, {
      width: panelWidth - 16,
      height: availableHeight - 34,
      ellipsis: true,
    })
  }

  // ============ RECOMMENDATIONS PAGE ============
  doc.addPage()

  doc.fillColor(COLORS.text)
  doc.fontSize(18).font('Helvetica-Bold')
  doc.text('Recommendations')
  doc.moveDown(0.5)
  doc.moveTo(PAGE.margin, doc.y).lineTo(PAGE.width - PAGE.margin, doc.y).strokeColor(COLORS.border).stroke()
  doc.moveDown(1)

  const failingPatterns = Object.entries(reportData.patternBreakdown)
    .filter(([_, data]) => data.passRate < 90)
    .sort((a, b) => a[1].passRate - b[1].passRate)

  if (failingPatterns.length === 0) {
    doc.fillColor(COLORS.text)
    doc.fontSize(12).font('Helvetica')
    doc.text('All patterns are performing well (90%+ pass rate).')
  } else {
    doc.fillColor(COLORS.textSecondary)
    doc.fontSize(11).font('Helvetica')
    doc.text('Priority improvements needed:')
    doc.moveDown(1)

    for (const [pattern, data] of failingPatterns) {
      doc.fillColor(COLORS.text)
      doc.fontSize(11).font('Helvetica-Bold')
      doc.text(`${pattern}: ${data.passRate}% pass rate`)
      doc.moveDown(0.3)

      doc.fillColor(COLORS.textSecondary)
      doc.fontSize(10).font('Helvetica')

      switch (pattern) {
        case 'Timestamps':
          doc.text('  • Add action verbs (search, use, set, apply, create, etc.)')
          doc.text('  • Remove numbering (no "1.", "2.", "3.")')
          break
        case 'Q&A Format':
          doc.text('  • Ensure 2-4 Q&A pairs (minimum 2, maximum 4)')
          doc.text('  • Use Q: and A: format with colon')
          break
        case "What's New":
          doc.text('  • Add "What\'s new in [Product]?" header')
          doc.text('  • Use numbered list format (1., 2., 3.)')
          break
        case 'Hashtags':
          doc.text('  • Start with #GalaxyAI')
          doc.text('  • End with #Samsung')
          doc.text('  • Use 3-5 hashtags total')
          break
        case 'Opening Statement':
          doc.text('  • Start with "This is the official [type] video for..."')
          doc.text('  • Include product name in opening')
          break
        case 'Step-by-Step':
          doc.text('  • Add "Follow these simple steps to use [Feature]:" header')
          doc.text('  • Include 3-5 numbered steps')
          break
        default:
          doc.text('  • Review pattern requirements in prompt')
      }
      doc.moveDown(0.8)
    }
  }

  // Footer on last page
  doc.moveDown(2)
  doc.moveTo(PAGE.margin, doc.y).lineTo(PAGE.width - PAGE.margin, doc.y).strokeColor(COLORS.border).stroke()
  doc.moveDown(0.5)
  doc.fillColor(COLORS.textMuted)
  doc.fontSize(9).font('Helvetica')
  doc.text('Generated by Samsung GEO Pipeline Test Suite', { align: 'center' })

  doc.end()

  return new Promise<void>((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`PDF report saved to: ${outputPath}`)
      resolve()
    })
    stream.on('error', reject)
  })
}

generatePDFReport().catch(console.error)
