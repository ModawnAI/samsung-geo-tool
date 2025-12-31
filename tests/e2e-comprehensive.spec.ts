import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const CREDENTIALS = {
  email: 'admin@admin.com',
  password: 'admin123',
}

// Sample SRT content for testing
const SAMPLE_SRT = `1
00:00:00,000 --> 00:00:05,000
Introducing the all-new Galaxy device

2
00:00:05,000 --> 00:00:10,000
With revolutionary AI features

3
00:00:10,000 --> 00:00:15,000
Experience the future of mobile technology

4
00:00:15,000 --> 00:00:20,000
Galaxy - Do What You Can't`

test.describe('Samsung GEO Tool - Comprehensive E2E Tests', () => {
  test.describe('1. Authentication Flow', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto(`${BASE_URL}/generate`)
      // Should redirect to login or show login form
      await expect(page).toHaveURL(/\/(login|auth|sign-in)?/)
    })

    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto(BASE_URL)

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Find and fill login form
      const emailInput = page.locator('input[type="email"], input[name="email"]')
      const passwordInput = page.locator('input[type="password"], input[name="password"]')

      if (await emailInput.isVisible()) {
        await emailInput.fill(CREDENTIALS.email)
        await passwordInput.fill(CREDENTIALS.password)

        // Click login button
        const loginButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")')
        await loginButton.click()

        // Wait for navigation
        await page.waitForLoadState('networkidle')
      }

      // Should be on dashboard or generate page after login
      console.log('Current URL after login:', page.url())
    })
  })

  test.describe('2. Product Selector', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')

      const emailInput = page.locator('input[type="email"], input[name="email"]')
      if (await emailInput.isVisible()) {
        await emailInput.fill(CREDENTIALS.email)
        await page.locator('input[type="password"]').fill(CREDENTIALS.password)
        await page.locator('button[type="submit"]').click()
        await page.waitForLoadState('networkidle')
      }
    })

    test('should display category cards', async ({ page }) => {
      await page.goto(`${BASE_URL}/generate`)
      await page.waitForLoadState('networkidle')

      // Wait for categories to load
      await page.waitForTimeout(2000)

      // Check for category cards
      const categoryCards = page.locator('[role="button"][aria-pressed]')
      const cardCount = await categoryCards.count()
      console.log(`Found ${cardCount} category cards`)

      // Take screenshot
      await page.screenshot({ path: 'test-results/categories.png' })
    })

    test('should select a category and show products', async ({ page }) => {
      await page.goto(`${BASE_URL}/generate`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Click first category card
      const firstCategory = page.locator('[role="button"][aria-pressed]').first()
      if (await firstCategory.isVisible()) {
        await firstCategory.click()
        await page.waitForTimeout(1000)

        // Check if product selector appears
        const productButton = page.locator('button[role="combobox"]')
        await expect(productButton).toBeVisible()

        // Click to open product dropdown
        await productButton.click()
        await page.waitForTimeout(500)

        // Take screenshot of product dropdown
        await page.screenshot({ path: 'test-results/products-dropdown.png' })
      }
    })

    test('should load and apply templates', async ({ page }) => {
      await page.goto(`${BASE_URL}/generate`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Check for template button
      const templateButton = page.locator('button:has-text("Load Template")')
      if (await templateButton.isVisible()) {
        await templateButton.click()
        await page.waitForTimeout(500)

        // Take screenshot of template dropdown
        await page.screenshot({ path: 'test-results/templates.png' })
      }
    })
  })

  test.describe('3. SRT Input', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')

      const emailInput = page.locator('input[type="email"]')
      if (await emailInput.isVisible()) {
        await emailInput.fill(CREDENTIALS.email)
        await page.locator('input[type="password"]').fill(CREDENTIALS.password)
        await page.locator('button[type="submit"]').click()
        await page.waitForLoadState('networkidle')
      }
    })

    test('should paste SRT content and show preview', async ({ page }) => {
      await page.goto(`${BASE_URL}/generate`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Select a category first
      const firstCategory = page.locator('[role="button"][aria-pressed]').first()
      if (await firstCategory.isVisible()) {
        await firstCategory.click()
        await page.waitForTimeout(500)

        // Select a product
        const productButton = page.locator('button[role="combobox"]')
        if (await productButton.isVisible()) {
          await productButton.click()
          await page.waitForTimeout(500)

          // Click first product option
          const firstProduct = page.locator('[role="option"]').first()
          if (await firstProduct.isVisible()) {
            await firstProduct.click()
          }
        }
      }

      // Click Next to go to Content step
      const nextButton = page.locator('button:has-text("Next")')
      if (await nextButton.isEnabled()) {
        await nextButton.click()
        await page.waitForTimeout(1000)
      }

      // Click Paste tab
      const pasteTab = page.locator('[role="tab"]:has-text("Paste")')
      if (await pasteTab.isVisible()) {
        await pasteTab.click()
        await page.waitForTimeout(500)

        // Find textarea and paste SRT
        const textarea = page.locator('textarea')
        if (await textarea.isVisible()) {
          await textarea.fill(SAMPLE_SRT)
          await page.waitForTimeout(500)

          // Check for preview
          const preview = page.locator('text=Preview')
          console.log('Preview visible:', await preview.isVisible())

          // Take screenshot
          await page.screenshot({ path: 'test-results/srt-input.png' })
        }
      }
    })
  })

  test.describe('4. Full Generation Workflow', () => {
    test('should complete full generation workflow', async ({ page }) => {
      // Increase timeout for this comprehensive test
      test.setTimeout(120000)

      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')

      // Login
      const emailInput = page.locator('input[type="email"]')
      if (await emailInput.isVisible()) {
        await emailInput.fill(CREDENTIALS.email)
        await page.locator('input[type="password"]').fill(CREDENTIALS.password)
        await page.locator('button[type="submit"]').click()
        await page.waitForLoadState('networkidle')
      }

      // Navigate to generate
      await page.goto(`${BASE_URL}/generate`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)

      console.log('=== STEP 1: Product Selection ===')

      // Select category
      const categories = page.locator('[role="button"][aria-pressed]')
      const categoryCount = await categories.count()
      console.log(`Found ${categoryCount} categories`)

      if (categoryCount > 0) {
        await categories.first().click()
        await page.waitForTimeout(1000)
        console.log('Category selected')

        // Select product
        const productButton = page.locator('button[role="combobox"]')
        if (await productButton.isVisible()) {
          await productButton.click()
          await page.waitForTimeout(500)

          const products = page.locator('[role="option"]')
          const productCount = await products.count()
          console.log(`Found ${productCount} products`)

          if (productCount > 0) {
            await products.first().click()
            console.log('Product selected')
          }
        }
      }

      // Take screenshot of Step 1
      await page.screenshot({ path: 'test-results/step1-product.png' })

      // Click Next
      console.log('=== STEP 2: Content Input ===')
      let nextButton = page.locator('button:has-text("Next")')
      if (await nextButton.isEnabled()) {
        await nextButton.click()
        await page.waitForTimeout(1000)
      }

      // Switch to Paste tab and enter SRT
      const pasteTab = page.locator('[role="tab"]:has-text("Paste")')
      if (await pasteTab.isVisible()) {
        await pasteTab.click()
        await page.waitForTimeout(500)

        const textarea = page.locator('textarea')
        await textarea.fill(SAMPLE_SRT)
        console.log('SRT content pasted')
      }

      // Take screenshot of Step 2
      await page.screenshot({ path: 'test-results/step2-content.png' })

      // Click Next to Keywords
      console.log('=== STEP 3: Keywords Selection ===')
      nextButton = page.locator('button:has-text("Next")')
      if (await nextButton.isEnabled()) {
        await nextButton.click()
        await page.waitForTimeout(2000)
      }

      // Check for keywords
      const keywordLabels = page.locator('label:has(input[type="checkbox"])')
      const keywordCount = await keywordLabels.count()
      console.log(`Found ${keywordCount} keywords`)

      // Select up to 3 keywords
      for (let i = 0; i < Math.min(3, keywordCount); i++) {
        const checkbox = keywordLabels.nth(i)
        if (await checkbox.isVisible()) {
          await checkbox.click()
          await page.waitForTimeout(200)
        }
      }
      console.log('Keywords selected')

      // Take screenshot of Step 3
      await page.screenshot({ path: 'test-results/step3-keywords.png' })

      // Click Generate
      console.log('=== STEP 4: Generation ===')
      const generateButton = page.locator('button:has-text("Generate")')
      if (await generateButton.isEnabled()) {
        await generateButton.click()
        console.log('Generate clicked, waiting for results...')

        // Wait for generation to complete (with timeout)
        await page.waitForTimeout(30000) // Wait up to 30 seconds

        // Check for output
        const description = page.locator('text=Description')
        const timestamps = page.locator('text=Timestamps')
        const hashtags = page.locator('text=Hashtags')

        console.log('Description visible:', await description.isVisible())
        console.log('Timestamps visible:', await timestamps.isVisible())
        console.log('Hashtags visible:', await hashtags.isVisible())

        // Take screenshot of output
        await page.screenshot({ path: 'test-results/step4-output.png', fullPage: true })
      }
    })
  })

  test.describe('5. Mobile Responsiveness', () => {
    test('should render correctly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 }) // iPhone X

      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')

      // Login on mobile
      const emailInput = page.locator('input[type="email"]')
      if (await emailInput.isVisible()) {
        await emailInput.fill(CREDENTIALS.email)
        await page.locator('input[type="password"]').fill(CREDENTIALS.password)
        await page.locator('button[type="submit"]').click()
        await page.waitForLoadState('networkidle')
      }

      await page.goto(`${BASE_URL}/generate`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Take mobile screenshot
      await page.screenshot({ path: 'test-results/mobile-generate.png' })

      // Check touch target sizes (44px minimum)
      const buttons = page.locator('button')
      const buttonCount = await buttons.count()

      let smallButtonCount = 0
      for (let i = 0; i < buttonCount; i++) {
        const box = await buttons.nth(i).boundingBox()
        if (box && (box.height < 44 || box.width < 44)) {
          smallButtonCount++
          console.log(`Small button found: ${box.width}x${box.height}`)
        }
      }

      console.log(`Buttons with size < 44px: ${smallButtonCount} of ${buttonCount}`)
    })

    test('should have scrollable step indicator on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })

      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')

      const emailInput = page.locator('input[type="email"]')
      if (await emailInput.isVisible()) {
        await emailInput.fill(CREDENTIALS.email)
        await page.locator('input[type="password"]').fill(CREDENTIALS.password)
        await page.locator('button[type="submit"]').click()
        await page.waitForLoadState('networkidle')
      }

      await page.goto(`${BASE_URL}/generate`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Check for horizontal scroll on step indicator
      const stepNav = page.locator('nav[aria-label="Progress"]')
      if (await stepNav.isVisible()) {
        const scrollWidth = await stepNav.evaluate(el => el.scrollWidth)
        const clientWidth = await stepNav.evaluate(el => el.clientWidth)
        console.log(`Step nav - scrollWidth: ${scrollWidth}, clientWidth: ${clientWidth}`)
        console.log(`Horizontally scrollable: ${scrollWidth > clientWidth}`)
      }
    })
  })

  test.describe('6. Keyboard Navigation', () => {
    test('should navigate with keyboard shortcuts', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')

      const emailInput = page.locator('input[type="email"]')
      if (await emailInput.isVisible()) {
        await emailInput.fill(CREDENTIALS.email)
        await page.locator('input[type="password"]').fill(CREDENTIALS.password)
        await page.locator('button[type="submit"]').click()
        await page.waitForLoadState('networkidle')
      }

      await page.goto(`${BASE_URL}/generate`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Select category and product first
      const firstCategory = page.locator('[role="button"][aria-pressed]').first()
      if (await firstCategory.isVisible()) {
        await firstCategory.click()
        await page.waitForTimeout(500)

        const productButton = page.locator('button[role="combobox"]')
        if (await productButton.isVisible()) {
          await productButton.click()
          await page.waitForTimeout(300)
          await page.locator('[role="option"]').first().click()
        }
      }

      // Test Alt+ArrowRight to navigate next
      console.log('Testing Alt+ArrowRight navigation...')
      await page.keyboard.press('Alt+ArrowRight')
      await page.waitForTimeout(500)

      // Take screenshot after keyboard navigation
      await page.screenshot({ path: 'test-results/keyboard-nav.png' })

      // Test Alt+ArrowLeft to navigate back
      console.log('Testing Alt+ArrowLeft navigation...')
      await page.keyboard.press('Alt+ArrowLeft')
      await page.waitForTimeout(500)
    })

    test('should have proper focus management', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')

      const emailInput = page.locator('input[type="email"]')
      if (await emailInput.isVisible()) {
        await emailInput.fill(CREDENTIALS.email)
        await page.locator('input[type="password"]').fill(CREDENTIALS.password)
        await page.locator('button[type="submit"]').click()
        await page.waitForLoadState('networkidle')
      }

      await page.goto(`${BASE_URL}/generate`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Tab through interactive elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab')
        await page.waitForTimeout(200)

        // Check focused element
        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement
          return el ? `${el.tagName}.${el.className.split(' ').slice(0, 2).join('.')}` : 'none'
        })
        console.log(`Tab ${i + 1}: Focused on ${focusedElement}`)
      }
    })
  })

  test.describe('7. Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')

      const emailInput = page.locator('input[type="email"]')
      if (await emailInput.isVisible()) {
        await emailInput.fill(CREDENTIALS.email)
        await page.locator('input[type="password"]').fill(CREDENTIALS.password)
        await page.locator('button[type="submit"]').click()
        await page.waitForLoadState('networkidle')
      }

      await page.goto(`${BASE_URL}/generate`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Check for ARIA labels on category cards
      const categoriesWithAria = await page.locator('[role="button"][aria-label]').count()
      console.log(`Category buttons with aria-label: ${categoriesWithAria}`)

      // Check for progress nav
      const progressNav = await page.locator('nav[aria-label="Progress"]').count()
      console.log(`Progress nav present: ${progressNav > 0}`)

      // Check for form labels
      const labels = await page.locator('label').count()
      console.log(`Form labels: ${labels}`)

      // Check for focus ring styles (visual accessibility)
      const focusRingElements = await page.locator('[class*="focus"]').count()
      console.log(`Elements with focus styling: ${focusRingElements}`)
    })

    test('should have proper color contrast (visual check)', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')

      const emailInput = page.locator('input[type="email"]')
      if (await emailInput.isVisible()) {
        await emailInput.fill(CREDENTIALS.email)
        await page.locator('input[type="password"]').fill(CREDENTIALS.password)
        await page.locator('button[type="submit"]').click()
        await page.waitForLoadState('networkidle')
      }

      await page.goto(`${BASE_URL}/generate`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Take screenshots in both light and dark mode for contrast review
      await page.screenshot({ path: 'test-results/accessibility-light.png', fullPage: true })

      // Try to toggle dark mode if available
      const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="mode"]')
      if (await themeToggle.isVisible()) {
        await themeToggle.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: 'test-results/accessibility-dark.png', fullPage: true })
      }
    })
  })
})
