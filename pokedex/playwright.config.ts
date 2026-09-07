import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

const systemChrome = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  || (process.platform === 'win32' && existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : undefined)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(systemChrome ? {
      launchOptions: { executablePath: systemChrome }
    } : {})
  },
  webServer: {
    command: 'npm run generate && npm run preview -- --host=127.0.0.1',
    url: 'http://127.0.0.1:3000/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
