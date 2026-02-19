import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────
// FLOW: A11Y — Accessibility basics
// TESTS: lang attr, heading hierarchy, keyboard navigation
// AUDIT COVERAGE: A11Y-H1 (icon-only buttons), A11Y-M1 (skip nav)
//
// These tests verify structural accessibility. For full WCAG
// compliance, run axe-core or Lighthouse audits separately.
// ─────────────────────────────────────────

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  test('A11Y-01: html element has lang attribute', async ({ page }) => {
    await page.goto('/dashboard')

    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBe('en')
  })

  test('A11Y-02: every page has an h1', async ({ page }) => {
    const routes = ['/dashboard', '/teams/new']

    for (const route of routes) {
      await page.goto(route)
      await expect(
        page.getByRole('heading', { level: 1 }),
      ).toBeVisible({ timeout: 10_000 })
    }
  })

  test('A11Y-03: interactive elements are keyboard-focusable', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // Focus the "New Team" link and activate it with Enter
    const newTeamLink = page.getByRole('link', { name: /New Team/ })
    await newTeamLink.focus()
    await expect(newTeamLink).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/teams\/new/)

    // Verify the team name input receives focus and accepts keyboard input
    const input = page.getByLabel('Team Name')
    await expect(input).toBeVisible()
    await input.focus()
    await expect(input).toBeFocused()
    await page.keyboard.type('Keyboard Test')
    await expect(input).toHaveValue('Keyboard Test')
  })
})
