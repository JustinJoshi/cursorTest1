import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────
// FLOW: DASH — Dashboard
// TESTS: team list rendering, New Team link
// ─────────────────────────────────────────

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  test('DASH-01: dashboard loads and shows teams or empty state', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    const hasTeams = await page.locator('a[href^="/teams/"]').first().isVisible().catch(() => false)
    const hasEmptyState = await page.getByText('No teams yet').isVisible().catch(() => false)

    expect(hasTeams || hasEmptyState).toBe(true)
  })

  test('DASH-02: New Team button links to /teams/new', async ({ page }) => {
    await page.goto('/dashboard')

    const link = page.getByRole('link', { name: /New Team/ })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/teams/new')
  })
})
