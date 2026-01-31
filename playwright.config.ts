import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 120000,

  /* Snapshot/Visual Regression Configuration */
  snapshotDir: './tests/__snapshots__',
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',

  expect: {
    /* Visual comparison settings */
    toHaveScreenshot: {
      /* Max pixel difference allowed */
      maxDiffPixels: 100,
      /* Max percentage difference allowed */
      maxDiffPixelRatio: 0.05,
      /* Animation handling */
      animations: 'disabled',
      /* Caret blinking */
      caret: 'hide',
    },
    toMatchSnapshot: {
      maxDiffPixels: 100,
      maxDiffPixelRatio: 0.05,
    },
  },

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    /* Viewport for consistent snapshots */
    viewport: { width: 1280, height: 720 },
    /* Disable animations for stable screenshots */
    launchOptions: {
      slowMo: process.env.CI ? 0 : 50,
    },
  },

  /* Output directory for test artifacts */
  outputDir: 'test-results',

  projects: [
    /* Setup project for authentication */
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },

    /* Main test suite with pre-authenticated state */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    /* Mobile testing */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },

    /* Tablet testing */
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro 11'],
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
