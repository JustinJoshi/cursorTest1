import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect } from '@playwright/test'
import { signIn } from './helpers/auth'

// ─────────────────────────────────────────
// FLOW: TEAM — Team lifecycle
// TESTS: create, view, settings, members, invites, delete
// AUDIT COVERAGE: A11Y-L4 (native confirm on delete)
//
// SECOND USER REQUIREMENTS:
//   TEAM-04 uses TEST_USER2_EMAIL to add/invite a member.
//   TEAM-05, TEAM-06, TEAM-09 require that the second user has
//   already signed in at least once (so their Convex record exists
//   and addMember can add them directly, not as a pending invite).
//
//   To set this up:
//     1. Create a second user in the Clerk dashboard.
//     2. Sign in once as that user in the browser.
//     3. Set TEST_USER2_EMAIL and TEST_USER2_PASSWORD in .env.test.
// ─────────────────────────────────────────

test.describe.serial('Team Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  let teamId: string
  let secondUserIsMember = false
  const teamName = `E2E Team ${Date.now()}`

  // ── Core team operations ───────────────────────────────

  test('TEAM-01: user can create a new team', async ({ page }) => {
    await page.goto('/teams/new')
    await page.getByLabel('Team Name').fill(teamName)
    await page.getByRole('button', { name: /Create Team/ }).click()

    await page.waitForURL(/\/teams\/[a-z0-9]+/i, { timeout: 10_000 })
    teamId = page.url().split('/teams/')[1].split(/[/?#]/)[0]

    await expect(page.getByRole('heading', { name: teamName })).toBeVisible()
    await expect(page.getByText('Team created successfully')).toBeVisible()
  })

  test('TEAM-02: user can view the team page', async ({ page }) => {
    await page.goto(`/teams/${teamId}`)

    await expect(page.getByRole('heading', { name: teamName })).toBeVisible()
    // Shows either the document table or "No documents yet" empty state
    await expect(
      page.getByText(/No documents yet|Name/).first(),
    ).toBeVisible()
  })

  test('TEAM-03: admin can navigate to team settings', async ({ page }) => {
    await page.goto(`/teams/${teamId}`)
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible()

    await page.locator(`a[href="/teams/${teamId}/settings"]`).click()
    await page.waitForURL(/\/settings$/)

    await expect(page.getByRole('heading', { name: 'Team Settings' })).toBeVisible()
    await expect(page.getByText(teamName)).toBeVisible()
  })

  // ── Member management (requires TEST_USER2_EMAIL) ─────

  test('TEAM-04: admin can add a member by email', async ({ page }) => {
    test.skip(!process.env.TEST_USER2_EMAIL, 'Set TEST_USER2_EMAIL in .env.test')

    await page.goto(`/teams/${teamId}/settings`)
    await expect(page.getByText('Add Member')).toBeVisible()

    await page.getByPlaceholder('user@example.com').fill(process.env.TEST_USER2_EMAIL!)
    // Default role is "viewer" — leave as-is

    await page.getByRole('button', { name: 'Add' }).click()

    const toast = page.getByText(/Member added|Invite sent/)
    await expect(toast).toBeVisible({ timeout: 10_000 })

    const text = await toast.textContent()
    secondUserIsMember = text?.includes('Member added') ?? false

    if (!secondUserIsMember) {
      // eslint-disable-next-line no-console
      console.log(
        'TEAM-04: Second user was invited (pending), not directly added. ' +
        'Sign in as the second user once so their Convex record exists, ' +
        'then re-run to enable TEAM-05/06/09.',
      )
    }
  })

  test('TEAM-05: admin can change a member\'s role', async ({ page }) => {
    test.skip(!secondUserIsMember, 'Second user must be a direct member (sign in via Clerk first)')

    await page.goto(`/teams/${teamId}/settings`)

    // Find the members section and a row with a role combobox (non-creator rows)
    const membersSection = page.locator('div').filter({
      has: page.getByRole('heading', { name: /^Members/ }),
    })
    const editableRow = membersSection
      .locator('table tbody tr')
      .filter({ has: page.getByRole('combobox') })
      .first()

    await editableRow.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Editor' }).click()

    await expect(page.getByText('Role updated')).toBeVisible()
  })

  test('TEAM-09: non-admin user sees Access Denied on settings page', async ({ browser }) => {
    test.skip(
      !secondUserIsMember || !process.env.TEST_USER2_PASSWORD,
      'Requires second user as a team member with TEST_USER2_PASSWORD set',
    )

    const context = await browser.newContext()
    const page = await context.newPage()

    await signIn(page, process.env.TEST_USER2_EMAIL!, process.env.TEST_USER2_PASSWORD!)

    await page.goto(`/teams/${teamId}/settings`)

    await expect(page.getByText('Access Denied')).toBeVisible({ timeout: 10_000 })

    await context.close()
  })

  test('TEAM-06: admin can remove a team member', async ({ page }) => {
    test.skip(!secondUserIsMember, 'Second user must be a direct member')

    await page.goto(`/teams/${teamId}/settings`)

    const membersSection = page.locator('div').filter({
      has: page.getByRole('heading', { name: /^Members/ }),
    })

    // Non-creator members have a delete button (Trash2 icon)
    const removeButton = membersSection
      .locator('table tbody tr')
      .filter({ hasNot: page.getByText('(creator)') })
      .first()
      .getByRole('button')

    await removeButton.click()
    await expect(page.getByText('Member removed')).toBeVisible()
  })

  // ── Invite management ─────────────────────────────────

  test('TEAM-07: admin can cancel a pending invite', async ({ page }) => {
    await page.goto(`/teams/${teamId}/settings`)

    // Create a pending invite with a guaranteed-new email
    const randomEmail = `cancel-test-${Date.now()}@example.com`
    await page.getByPlaceholder('user@example.com').fill(randomEmail)
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText('Invite sent')).toBeVisible()

    // Wait for the pending invites section to render
    await expect(page.getByText(/Pending Invites/)).toBeVisible()

    // Cancel the invite we just created
    const inviteRow = page.locator('table').last().locator('tbody tr').filter({ hasText: randomEmail })
    await inviteRow.getByRole('button').click()

    await expect(page.getByText('Invite cancelled')).toBeVisible()
  })

  // ── Danger zone ───────────────────────────────────────

  test('TEAM-08: admin can delete a team', async ({ page }) => {
    await page.goto(`/teams/${teamId}/settings`)

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /Delete Team/ }).click()

    await expect(page.getByText('Team deleted')).toBeVisible({ timeout: 10_000 })
    await page.waitForURL(/\/dashboard/)
  })
})
