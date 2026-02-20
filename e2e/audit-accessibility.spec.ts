import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────
// FLOW: A11Y-AUDIT — Accessibility audit coverage
// TESTS: icon-only buttons, form labels, skip nav, page titles,
//        dialog descriptions, required fields, loading announcements
// AUDIT COVERAGE: HIGH-01 through HIGH-05, MEDIUM-02 through MEDIUM-04
//
// Many of these tests verify the DESIRED behavior from the audit.
// They will FAIL until the corresponding audit findings are fixed.
// Each test comment references the specific audit finding ID.
// ─────────────────────────────────────────

test.describe.serial('Accessibility — Audit Findings', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  let teamId: string
  const teamName = `A11Y Test ${Date.now()}`
  const docName = `A11Y Doc ${Date.now()}`

  // ── Setup ───────────────────────────────────────────────

  test('setup: create team and document', async ({ page }) => {
    await page.goto('/teams/new')
    await page.getByLabel('Team Name').fill(teamName)
    await page.getByRole('button', { name: /Create Team/ }).click()
    await page.waitForURL(/\/teams\/[a-z0-9]+/i, { timeout: 10_000 })
    teamId = page.url().split('/teams/')[1].split(/[/?#]/)[0]

    await page.getByRole('button', { name: /New Document/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Document Name').fill(docName)
    await dialog.getByRole('button', { name: /^Create$/ }).click()
    await expect(page.getByText('Document created')).toBeVisible({ timeout: 10_000 })
  })

  // ── HIGH-01: Icon-only buttons (9 instances) ───────────

  test('A11Y-04: team page icon-only buttons have accessible names', async ({ page }) => {
    await page.goto(`/teams/${teamId}`)
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible()

    // Back-to-dashboard link (ArrowLeft icon)
    const backLink = page.locator('a[href="/dashboard"]').first()
    await expect(backLink).toHaveAttribute('aria-label', /.+/)

    // Settings link (Settings icon) — admin only
    const settingsLink = page.locator(`a[href="/teams/${teamId}/settings"]`)
    if (await settingsLink.isVisible()) {
      await expect(settingsLink).toHaveAttribute('aria-label', /.+/)
    }

    // Document row action buttons (MoreHorizontal icon)
    const actionButtons = page.locator('table tbody tr button')
    const count = await actionButtons.count()
    for (let i = 0; i < count; i++) {
      const btn = actionButtons.nth(i)
      const ariaLabel = await btn.getAttribute('aria-label')
      const innerText = (await btn.textContent())?.trim()
      const srOnly = await btn.locator('.sr-only').textContent().catch(() => null)
      expect(
        ariaLabel || innerText || srOnly,
        `Action button ${i} in document table must have an accessible name (audit HIGH-01)`,
      ).toBeTruthy()
    }
  })

  test('A11Y-04b: settings page icon-only buttons have accessible names', async ({ page }) => {
    await page.goto(`/teams/${teamId}/settings`)
    await expect(page.getByRole('heading', { name: 'Team Settings' })).toBeVisible()

    // Back link (ArrowLeft icon)
    const backLink = page.locator(`a[href="/teams/${teamId}"]`).first()
    await expect(backLink).toHaveAttribute('aria-label', /.+/)
  })

  // ── HIGH-02: Rename dialog input label ──────────────────

  test('A11Y-05: rename dialog input has an associated label', async ({ page }) => {
    await page.goto(`/teams/${teamId}`)
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible()

    const row = page.locator('table tbody tr').filter({ hasText: docName })
    await row.getByRole('button').click()
    await page.getByRole('menuitem', { name: 'Rename' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const input = dialog.getByRole('textbox')
    const ariaLabel = await input.getAttribute('aria-label')
    const ariaLabelledBy = await input.getAttribute('aria-labelledby')
    const id = await input.getAttribute('id')

    let hasLabel = !!ariaLabel || !!ariaLabelledBy
    if (!hasLabel && id) {
      hasLabel = (await page.locator(`label[for="${id}"]`).count()) > 0
    }

    expect(hasLabel, 'Rename input must have an accessible label (audit HIGH-02)').toBe(true)
  })

  // ── HIGH-03: File inputs ────────────────────────────────

  test('A11Y-06: hidden file inputs have aria-label', async ({ page }) => {
    await page.goto(`/teams/${teamId}`)
    await page.getByRole('button', { name: /New Document/ }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const fileInput = dialog.locator('input[type="file"]')
    await expect(fileInput).toHaveCount(1)

    const ariaLabel = await fileInput.getAttribute('aria-label')
    expect(ariaLabel, 'File input must have aria-label (audit HIGH-03)').toBeTruthy()
  })

  // ── HIGH-04: Skip navigation ────────────────────────────

  test('A11Y-07: skip navigation link exists and is focusable', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    const skipLink = page.locator('a[href="#main-content"]')
    const exists = (await skipLink.count()) > 0

    expect(exists, 'Skip-to-main-content link must exist (audit HIGH-04)').toBe(true)

    if (exists) {
      await skipLink.focus()
      await expect(skipLink).toBeFocused()
      await expect(skipLink).toBeVisible()
    }

    const mainContent = page.locator('#main-content')
    expect(
      await mainContent.count(),
      'Target #main-content element must exist',
    ).toBeGreaterThan(0)
  })

  // ── HIGH-05: Unique page titles ─────────────────────────

  test('A11Y-08: pages have unique titles (not just "DocVault")', async ({ page }) => {
    const routes = [
      { path: '/dashboard', expected: /dashboard/i },
      { path: '/teams/new', expected: /create|new/i },
    ]

    for (const { path, expected } of routes) {
      await page.goto(path)
      await page.waitForLoadState('domcontentloaded')
      const title = await page.title()
      expect(
        expected.test(title),
        `Page ${path} title "${title}" should contain page-specific text (audit HIGH-05)`,
      ).toBe(true)
    }
  })

  // ── MEDIUM-02: Required form fields ─────────────────────

  test('A11Y-10: required form fields are marked required', async ({ page }) => {
    await page.goto('/teams/new')

    const teamNameInput = page.getByLabel('Team Name')
    await expect(teamNameInput).toBeVisible()

    const required = await teamNameInput.getAttribute('required')
    const ariaRequired = await teamNameInput.getAttribute('aria-required')

    expect(
      required !== null || ariaRequired === 'true',
      'Team Name input must be marked required or aria-required (audit MEDIUM-02)',
    ).toBe(true)
  })

  test('A11Y-10b: document name input is marked required', async ({ page }) => {
    await page.goto(`/teams/${teamId}`)
    await page.getByRole('button', { name: /New Document/ }).click()

    const dialog = page.getByRole('dialog')
    const nameInput = dialog.getByLabel('Document Name')
    await expect(nameInput).toBeVisible()

    const required = await nameInput.getAttribute('required')
    const ariaRequired = await nameInput.getAttribute('aria-required')

    expect(
      required !== null || ariaRequired === 'true',
      'Document Name input must be marked required or aria-required (audit MEDIUM-02)',
    ).toBe(true)
  })

  // ── MEDIUM-03: Loading state announcements ──────────────

  test('A11Y-11: loading states have screen reader announcements', async ({ page }) => {
    await page.goto('/dashboard')

    // Check for role="status" or aria-live regions on the page
    const statusRegions = page.locator('[role="status"]')
    const liveRegions = page.locator('[aria-live]')

    const statusCount = await statusRegions.count()
    const liveCount = await liveRegions.count()

    expect(
      statusCount + liveCount,
      'Page should have at least one role="status" or aria-live region for loading states (audit MEDIUM-03)',
    ).toBeGreaterThan(0)
  })

  // ── MEDIUM-04: Dialog descriptions ──────────────────────

  test('A11Y-09: create document dialog has accessible description', async ({ page }) => {
    await page.goto(`/teams/${teamId}`)
    await page.getByRole('button', { name: /New Document/ }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const describedBy = await dialog.getAttribute('aria-describedby')
    expect(
      describedBy,
      'Create document dialog must have aria-describedby (audit MEDIUM-04)',
    ).toBeTruthy()

    if (describedBy) {
      const descIds = describedBy.split(/\s+/)
      for (const id of descIds) {
        const el = page.locator(`#${CSS.escape(id)}`)
        const text = await el.textContent().catch(() => null)
        expect(text?.trim().length, `Description element #${id} must have content`).toBeGreaterThan(0)
      }
    }
  })

  // ── Cleanup ─────────────────────────────────────────────

  test('cleanup: delete test team', async ({ page }) => {
    await page.goto(`/teams/${teamId}/settings`)
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: /Delete Team/ }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
  })
})
