import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect } from '@playwright/test'
import { signIn } from './helpers/auth'

// ─────────────────────────────────────────
// FLOW: SEC-ROLE — Role enforcement & input sanitization
// TESTS: auth gates on dynamic routes, viewer restrictions, XSS prevention
// AUDIT COVERAGE: SEC-01 (access control), SEC-09 (unsafe casting),
//                 A11Y-L4 (native confirm), Principal H2 (null handling)
//
// SECOND USER REQUIREMENTS (SEC-06, SEC-07):
//   The second test user must have signed in at least once so their
//   Convex record exists and addMember resolves to "Member added"
//   rather than a pending invite. Set TEST_USER2_EMAIL and
//   TEST_USER2_PASSWORD in .env.test.
// ─────────────────────────────────────────

test.describe.serial('Security — Role Enforcement & Input Sanitization', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  let teamId: string
  let secondUserIsMember = false
  const teamName = `SEC Role ${Date.now()}`
  const docName = `SEC Doc ${Date.now()}`

  // ── Setup ───────────────────────────────────────────────

  test('setup: create team with a document', async ({ page }) => {
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

  test('setup: add second user as viewer', async ({ page }) => {
    test.skip(!process.env.TEST_USER2_EMAIL, 'Set TEST_USER2_EMAIL in .env.test')

    await page.goto(`/teams/${teamId}/settings`)
    await page.getByPlaceholder('user@example.com').fill(process.env.TEST_USER2_EMAIL!)
    await page.getByRole('button', { name: 'Add' }).click()

    const toast = page.getByText(/Member added|Invite sent/)
    await expect(toast).toBeVisible({ timeout: 10_000 })

    const text = await toast.textContent()
    secondUserIsMember = text?.includes('Member added') ?? false

    if (!secondUserIsMember) {
      // eslint-disable-next-line no-console
      console.log(
        'SEC setup: Second user was invited (pending). ' +
          'Sign in as the second user once so their Convex record exists, ' +
          'then re-run to enable SEC-06/07.',
      )
    }
  })

  // ── Auth gate tests ─────────────────────────────────────

  test('SEC-04: unauthenticated user cannot access /teams/:id', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(`/teams/${teamId}`)
    await expect(page).toHaveURL(/sign-in/, { timeout: 10_000 })

    await context.close()
  })

  test('SEC-05: unauthenticated user cannot access /teams/:id/settings', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(`/teams/${teamId}/settings`)
    await expect(page).toHaveURL(/sign-in/, { timeout: 10_000 })

    await context.close()
  })

  // ── Viewer role restrictions (requires second user) ─────

  test('SEC-06: viewer cannot create documents or access settings', async ({ browser }) => {
    test.skip(
      !secondUserIsMember || !process.env.TEST_USER2_PASSWORD,
      'Requires second user as a direct team member with TEST_USER2_PASSWORD set',
    )

    const context = await browser.newContext()
    const page = await context.newPage()
    await signIn(page, process.env.TEST_USER2_EMAIL!, process.env.TEST_USER2_PASSWORD!)

    await page.goto(`/teams/${teamId}`)
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible({ timeout: 10_000 })

    // Viewer should NOT see the "New Document" button
    await expect(page.getByRole('button', { name: /New Document/ })).not.toBeVisible()

    // Viewer should NOT see the Settings link
    await expect(page.locator(`a[href="/teams/${teamId}/settings"]`)).not.toBeVisible()

    // Document row should exist but actions menu should be absent or empty
    const docRow = page.locator('table tbody tr').filter({ hasText: docName })
    if (await docRow.isVisible()) {
      const menuTrigger = docRow.getByRole('button')
      const hasTrigger = (await menuTrigger.count()) > 0
      if (hasTrigger) {
        await menuTrigger.first().click()
        await expect(page.getByRole('menuitem', { name: 'Rename' })).not.toBeVisible()
        await expect(page.getByRole('menuitem', { name: 'Delete' })).not.toBeVisible()
      }
    }

    await context.close()
  })

  test('SEC-07: viewer sees Access Denied on settings page', async ({ browser }) => {
    test.skip(
      !secondUserIsMember || !process.env.TEST_USER2_PASSWORD,
      'Requires second user as a direct team member with TEST_USER2_PASSWORD set',
    )

    const context = await browser.newContext()
    const page = await context.newPage()
    await signIn(page, process.env.TEST_USER2_EMAIL!, process.env.TEST_USER2_PASSWORD!)

    await page.goto(`/teams/${teamId}/settings`)
    await expect(page.getByText('Access Denied')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /Delete Team/ })).not.toBeVisible()

    await context.close()
  })

  // ── XSS sanitization ───────────────────────────────────

  test('SEC-08: HTML in team name is rendered as text, not executed', async ({ page }) => {
    const xssPayload = `<img src=x onerror=alert(1)> Team ${Date.now()}`

    await page.goto('/teams/new')
    await page.getByLabel('Team Name').fill(xssPayload)
    await page.getByRole('button', { name: /Create Team/ }).click()
    await page.waitForURL(/\/teams\/[a-z0-9]+/i, { timeout: 10_000 })
    const xssTeamId = page.url().split('/teams/')[1].split(/[/?#]/)[0]

    await expect(page.getByText(xssPayload)).toBeVisible()
    await expect(page.locator('img[src="x"]')).toHaveCount(0)

    // Cleanup
    await page.goto(`/teams/${xssTeamId}/settings`)
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: /Delete Team/ }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
  })

  // ── Cleanup ─────────────────────────────────────────────

  test('cleanup: delete the test team', async ({ page }) => {
    await page.goto(`/teams/${teamId}/settings`)
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: /Delete Team/ }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
  })
})
