import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────
// FLOW: EDGE — Edge cases & form validation
// TESTS: empty inputs, duplicate members, creator protection
// AUDIT COVERAGE: SEC-04 (no server-side validation),
//                 A11Y MEDIUM-02 (required fields)
// ─────────────────────────────────────────

test.describe.serial('Edge Cases & Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  let teamId: string
  const teamName = `Edge Test ${Date.now()}`

  // ── Setup ───────────────────────────────────────────────

  test('setup: create test team', async ({ page }) => {
    await page.goto('/teams/new')
    await page.getByLabel('Team Name').fill(teamName)
    await page.getByRole('button', { name: /Create Team/ }).click()
    await page.waitForURL(/\/teams\/[a-z0-9]+/i, { timeout: 10_000 })
    teamId = page.url().split('/teams/')[1].split(/[/?#]/)[0]
  })

  // ── Form validation ─────────────────────────────────────

  test('EDGE-01: empty team name is rejected', async ({ page }) => {
    await page.goto('/teams/new')

    const input = page.getByLabel('Team Name')
    await expect(input).toBeVisible()
    await input.fill('')

    const submitButton = page.getByRole('button', { name: /Create Team/ })

    const isDisabled = await submitButton.isDisabled()
    if (isDisabled) {
      // Button correctly disabled when input is empty
      expect(isDisabled).toBe(true)
    } else {
      // Button is enabled — click and verify it doesn't navigate away
      await submitButton.click()
      await page.waitForTimeout(2_000)
      await expect(page).toHaveURL(/\/teams\/new/)
    }
  })

  test('EDGE-02: empty document name is rejected', async ({ page }) => {
    await page.goto(`/teams/${teamId}`)
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible()

    await page.getByRole('button', { name: /New Document/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const nameInput = dialog.getByLabel('Document Name')
    await nameInput.fill('')

    const createButton = dialog.getByRole('button', { name: /^Create$/ })
    const isDisabled = await createButton.isDisabled()

    if (isDisabled) {
      expect(isDisabled).toBe(true)
    } else {
      await createButton.click()
      await page.waitForTimeout(2_000)
      // Dialog should remain open — creation should not succeed
      await expect(dialog).toBeVisible()
    }
  })

  // ── Duplicate member handling ───────────────────────────

  test('EDGE-03: adding the same member twice shows an error', async ({ page }) => {
    test.skip(!process.env.TEST_USER2_EMAIL, 'Set TEST_USER2_EMAIL in .env.test')

    await page.goto(`/teams/${teamId}/settings`)
    await expect(page.getByRole('heading', { name: 'Team Settings' })).toBeVisible()

    // First add
    await page.getByPlaceholder('user@example.com').fill(process.env.TEST_USER2_EMAIL!)
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText(/Member added|Invite sent/)).toBeVisible({ timeout: 10_000 })

    // Wait for the toast to dismiss so we don't match the old one
    await page.waitForTimeout(3_000)

    // Second add — same email
    await page.getByPlaceholder('user@example.com').fill(process.env.TEST_USER2_EMAIL!)
    await page.getByRole('button', { name: 'Add' }).click()

    // Should show an error about duplicate membership
    await expect(
      page.getByText(/already|duplicate|exists|member/i),
    ).toBeVisible({ timeout: 10_000 })
  })

  // ── Creator protection ──────────────────────────────────

  test('EDGE-04: team creator cannot be removed from the team', async ({ page }) => {
    await page.goto(`/teams/${teamId}/settings`)
    await expect(page.getByRole('heading', { name: 'Team Settings' })).toBeVisible()

    // The members table marks the creator — look for the "(creator)" label
    const membersHeading = page.getByRole('heading', { name: /^Members/ })
    await expect(membersHeading).toBeVisible()

    const membersSection = page.locator('section, div').filter({
      has: membersHeading,
    })

    const creatorRow = membersSection
      .locator('table tbody tr')
      .filter({ hasText: '(creator)' })

    await expect(creatorRow).toBeVisible()

    // Creator row should NOT have a remove/delete button
    const buttonsInRow = creatorRow.getByRole('button')
    const buttonCount = await buttonsInRow.count()

    if (buttonCount === 0) {
      // No buttons at all — correct, creator is protected
      expect(buttonCount).toBe(0)
    } else {
      // If buttons exist, verify none of them are remove/delete actions
      for (let i = 0; i < buttonCount; i++) {
        const btn = buttonsInRow.nth(i)
        const ariaLabel = (await btn.getAttribute('aria-label'))?.toLowerCase() ?? ''
        const title = (await btn.getAttribute('title'))?.toLowerCase() ?? ''
        expect(ariaLabel).not.toContain('remove')
        expect(ariaLabel).not.toContain('delete')
        expect(title).not.toContain('remove')
        expect(title).not.toContain('delete')
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
