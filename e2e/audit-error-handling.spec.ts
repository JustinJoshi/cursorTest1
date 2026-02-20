import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────
// FLOW: ERR — Error handling & not-found states
// TESTS: invalid IDs, missing entities, error boundaries
// AUDIT COVERAGE: Principal H2 (no null/not-found handling),
//                 Principal H4 (no error boundaries),
//                 SEC-09 (unsafe type casting of URL params)
//
// These tests navigate to routes with invalid or non-existent IDs.
// The DESIRED behavior is a meaningful error/not-found UI.
// If the app renders a white screen or crashes, these tests fail,
// documenting the audit finding.
// ─────────────────────────────────────────

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  test('ERR-01: invalid team ID shows a meaningful error, not a white screen', async ({
    page,
  }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await page.goto('/teams/not-a-valid-convex-id')

    // Wait for the page to settle (loading state resolves or error renders)
    await page.waitForTimeout(5_000)

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length, 'Page must not be a blank white screen').toBeGreaterThan(0)

    const hasErrorUI = await page
      .getByText(/not found|error|doesn.t exist|invalid|something went wrong/i)
      .first()
      .isVisible()
      .catch(() => false)

    expect(
      hasErrorUI,
      'App should render a meaningful error UI for invalid team ID (audit H2/H4). ' +
        `JS errors captured: [${jsErrors.join('; ')}]`,
    ).toBe(true)
  })

  test('ERR-02: invalid document ID shows a meaningful error, not a white screen', async ({
    page,
  }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await page.goto('/documents/not-a-valid-convex-id')

    await page.waitForTimeout(5_000)

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length, 'Page must not be a blank white screen').toBeGreaterThan(0)

    const hasErrorUI = await page
      .getByText(/not found|error|doesn.t exist|invalid|something went wrong/i)
      .first()
      .isVisible()
      .catch(() => false)

    expect(
      hasErrorUI,
      'App should render a meaningful error UI for invalid document ID (audit H2/H4). ' +
        `JS errors captured: [${jsErrors.join('; ')}]`,
    ).toBe(true)
  })

  test('ERR-03: app recovers from error without full-page crash', async ({ page }) => {
    // Navigate to a valid page first
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // Navigate to an invalid route that will trigger an error
    await page.goto('/teams/zzz-invalid')
    await page.waitForTimeout(5_000)

    // Navigate back to dashboard — the app should still work
    await page.goto('/dashboard')

    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible({ timeout: 10_000 })
  })
})
