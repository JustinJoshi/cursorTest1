import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────
// FLOW: SEC — Security
// TESTS: auth redirects, download URL access control
// AUDIT COVERAGE: SEC-H2 (missing auth on getDownloadUrl)
//
// SEC-03 creates its own team + document, captures a download
// URL while authenticated, then attempts to fetch it from an
// unauthenticated context.
//
// IMPORTANT: SEC-03 is expected to FAIL until SEC-H2 is fixed.
// Convex storage URLs are currently publicly accessible. The
// test documents the *desired* behavior — once you add auth to
// the download path, it will pass.
// ─────────────────────────────────────────

test.describe('Security', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  test('SEC-01: /dashboard requires authentication', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/sign-in/, { timeout: 10_000 })

    await context.close()
  })

  test('SEC-02: /teams/new requires authentication', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/teams/new')
    await expect(page).toHaveURL(/sign-in/, { timeout: 10_000 })

    await context.close()
  })

  test('SEC-03: unauthenticated fetch to a download URL returns 401/403', async ({
    page,
    browser,
  }) => {
    // ── Setup: create team + document + upload a file ──
    const teamName = `SEC Test ${Date.now()}`
    await page.goto('/teams/new')
    await page.getByLabel('Team Name').fill(teamName)
    await page.getByRole('button', { name: /Create Team/ }).click()
    await page.waitForURL(/\/teams\/[a-z0-9]+/i, { timeout: 10_000 })
    const teamId = page.url().split('/teams/')[1].split(/[/?#]/)[0]

    await page.getByRole('button', { name: /New Document/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Document Name').fill('SEC Test Doc')
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'secret.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is a secret document.'),
    })
    await dialog.getByRole('button', { name: /Create & Upload/ }).click()
    await expect(page.getByText('Document created with file uploaded')).toBeVisible({
      timeout: 15_000,
    })

    // ── Navigate to doc detail and capture download URL ──
    await page.locator('table tbody tr').first().locator('a').first().click()
    await page.waitForURL(/\/documents\//)

    const downloadBtn = page.getByRole('button', { name: 'Download' }).first()
    await expect(downloadBtn).toBeEnabled({ timeout: 10_000 })

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ])
    const downloadUrl = download.url()
    await download.delete()

    expect(downloadUrl).toBeTruthy()

    // ── Fetch the URL from an unauthenticated context ──
    const unauthContext = await browser.newContext()
    const response = await unauthContext.request.get(downloadUrl)

    expect(
      [401, 403].includes(response.status()),
      `Expected 401 or 403 but got ${response.status()}. ` +
        'Convex storage URLs are currently public — see audit finding SEC-H2. ' +
        'This test will pass once the download path requires authentication.',
    ).toBe(true)

    await unauthContext.close()

    // ── Cleanup ──
    await page.goto(`/teams/${teamId}/settings`)
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: /Delete Team/ }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
  })
})
