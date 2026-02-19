import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────
// FLOW: AUTH — Authentication
// TESTS: sign-in via Clerk, protected-route redirect
// ─────────────────────────────────────────

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  test('AUTH-01: authenticated user can access the dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('AUTH-02: unauthenticated user is redirected to sign-in', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/sign-in/, { timeout: 10_000 })

    await context.close()
  })
})
