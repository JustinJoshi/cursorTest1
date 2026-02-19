import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────
// FLOW: NAV — Navigation
// TESTS: landing page links, navbar, back buttons
// ─────────────────────────────────────────

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  test('NAV-01: landing page shows Get Started and Sign In links', async ({ browser }) => {
    // Use unauthenticated context to see the landing page as a visitor
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'DocVault' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible()

    await context.close()
  })

  test('NAV-02: navbar shows Dashboard link when signed in', async ({ page }) => {
    await page.goto('/dashboard')

    const nav = page.locator('header')
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'DocVault' })).toBeVisible()
  })

  test('NAV-03: back button on team page navigates to dashboard', async ({ page }) => {
    await page.goto('/dashboard')

    // Navigate into a team (create one if none exist)
    let teamLink = page.locator('a[href^="/teams/"]').first()
    if (!(await teamLink.isVisible().catch(() => false))) {
      await page.goto('/teams/new')
      await page.getByLabel('Team Name').fill(`Nav Test ${Date.now()}`)
      await page.getByRole('button', { name: /Create Team/ }).click()
      await page.waitForURL(/\/teams\//)
    } else {
      await teamLink.click()
      await page.waitForURL(/\/teams\//)
    }

    // Click the back-to-dashboard link
    await page.locator('a[href="/dashboard"]').first().click()
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
