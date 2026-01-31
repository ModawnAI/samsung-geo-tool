/**
 * Browser Manager - Singleton Playwright wrapper for server-side search verification
 *
 * Uses existing @playwright/test dependency for browser automation
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright'

let browserInstance: Browser | null = null
let contextInstance: BrowserContext | null = null

/**
 * Browser manager singleton for GEO verification searches
 */
export const browserManager = {
  /**
   * Launch browser if not already running
   */
  async launch(): Promise<Browser> {
    if (browserInstance && browserInstance.isConnected()) {
      return browserInstance
    }

    console.log('[BrowserManager] Launching Chromium...')
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    })

    return browserInstance
  },

  /**
   * Get or create a browser context
   */
  async getContext(): Promise<BrowserContext> {
    if (contextInstance) {
      return contextInstance
    }

    const browser = await this.launch()
    contextInstance = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'ko-KR',
    })

    return contextInstance
  },

  /**
   * Create a new page in the browser context
   */
  async newPage(): Promise<Page> {
    const context = await this.getContext()
    return context.newPage()
  },

  /**
   * Execute a search and return results
   */
  async search(
    url: string,
    options?: { waitForSelector?: string; timeout?: number }
  ): Promise<{ html: string; screenshot?: Buffer }> {
    const page = await this.newPage()
    const timeout = options?.timeout || 15000

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout,
      })

      if (options?.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 5000 }).catch(() => {
          // Continue even if selector not found
        })
      }

      // Small delay to ensure dynamic content loads
      await page.waitForTimeout(1000)

      const html = await page.content()

      return { html }
    } finally {
      await page.close()
    }
  },

  /**
   * Take a screenshot of a page
   */
  async screenshot(url: string): Promise<Buffer> {
    const page = await this.newPage()

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 15000,
      })

      return await page.screenshot({ fullPage: false })
    } finally {
      await page.close()
    }
  },

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (contextInstance) {
      await contextInstance.close()
      contextInstance = null
    }

    if (browserInstance) {
      await browserInstance.close()
      browserInstance = null
    }

    console.log('[BrowserManager] Browser closed')
  },

  /**
   * Check if browser is currently running
   */
  isRunning(): boolean {
    return browserInstance !== null && browserInstance.isConnected()
  },
}

/**
 * Cleanup on process exit
 */
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    browserManager.close()
  })

  process.on('SIGINT', () => {
    browserManager.close()
    process.exit()
  })

  process.on('SIGTERM', () => {
    browserManager.close()
    process.exit()
  })
}
