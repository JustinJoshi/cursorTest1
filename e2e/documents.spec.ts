import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────
// FLOW: DOC — Document lifecycle
// TESTS: create, upload, rename, delete, version history, download
// AUDIT COVERAGE: SEC-M1 (no size limit — test observes current behavior),
//                 DRY-M2 (duplicate upload flow — both paths exercised)
// ─────────────────────────────────────────

test.describe.serial('Document Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
  })

  let teamId: string
  let docIdWithFile: string
  const teamName = `Doc Tests ${Date.now()}`
  const docNameA = `Doc A ${Date.now()}`
  const docNameB = `Upload Doc B ${Date.now()}`
  let renamedName: string

  // ── Setup ──────────────────────────────────────────────

  test('setup: create a team for document tests', async ({ page }) => {
    await page.goto('/teams/new')
    await page.getByLabel('Team Name').fill(teamName)
    await page.getByRole('button', { name: /Create Team/ }).click()
    await page.waitForURL(/\/teams\/[a-z0-9]+/i, { timeout: 10_000 })
    teamId = page.url().split('/teams/')[1].split(/[/?#]/)[0]
  })

  // ── Create ─────────────────────────────────────────────

  test('DOC-01: create a document without a file', async ({ page }) => {
    await page.goto(`/teams/${teamId}`)
    await page.getByRole('button', { name: /New Document/ }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Document Name').fill(docNameA)
    await dialog.getByRole('button', { name: /^Create$/ }).click()

    await expect(page.getByText('Document created')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(docNameA)).toBeVisible()
  })

  test('DOC-02: create a document with file upload', async ({ page }) => {
    await page.goto(`/teams/${teamId}`)
    await page.getByRole('button', { name: /New Document/ }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Document Name').fill(docNameB)

    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'test-file.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Hello from Playwright E2E tests.'),
    })

    await dialog.getByRole('button', { name: /Create & Upload/ }).click()

    await expect(page.getByText('Document created with file uploaded')).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(docNameB)).toBeVisible()
  })

  // ── Read ───────────────────────────────────────────────

  test('DOC-03: view a document detail page', async ({ page }) => {
    await page.goto(`/teams/${teamId}`)

    // Click the document that has a file (DOC-02)
    const row = page.locator('table tbody tr').filter({ hasText: docNameB })
    await row.locator('a').first().click()

    await page.waitForURL(/\/documents\//)
    docIdWithFile = page.url().split('/documents/')[1].split(/[/?#]/)[0]

    await expect(page.getByText('Document Details')).toBeVisible()
    await expect(page.getByText(docNameB)).toBeVisible()
    await expect(page.getByText('Version History')).toBeVisible()
  })

  // ── Update ─────────────────────────────────────────────

  test('DOC-04: rename a document', async ({ page }) => {
    renamedName = `Renamed ${Date.now()}`
    await page.goto(`/teams/${teamId}`)

    const row = page.locator('table tbody tr').filter({ hasText: docNameA })
    await row.getByRole('button').click()
    await page.getByRole('menuitem', { name: 'Rename' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox').clear()
    await dialog.getByRole('textbox').fill(renamedName)
    await dialog.getByRole('button', { name: 'Rename' }).click()

    await expect(page.getByText('Document renamed')).toBeVisible()
    await expect(page.getByText(renamedName)).toBeVisible()
  })

  // ── Version management ─────────────────────────────────

  test('DOC-06: upload a new version from the document detail page', async ({ page }) => {
    await page.goto(`/documents/${docIdWithFile}`)
    await expect(page.getByText(docNameB)).toBeVisible()

    await page.getByRole('button', { name: /Upload New Version/ }).click()

    const dialog = page.getByRole('dialog')
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'updated-file.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Updated content — version 2.'),
    })
    await dialog.getByLabel('Comment').fill('Version 2 from E2E test')
    await dialog.getByRole('button', { name: 'Upload' }).click()

    await expect(page.getByText('New version uploaded')).toBeVisible({ timeout: 15_000 })
  })

  test('DOC-07: version history shows all versions', async ({ page }) => {
    await page.goto(`/documents/${docIdWithFile}`)

    await expect(page.getByText('Version History')).toBeVisible()
    // After DOC-02 + DOC-06 there should be v1 and v2
    await expect(page.getByText('v2')).toBeVisible()
    await expect(page.getByText('v1')).toBeVisible()
  })

  test('DOC-08: user can download a document version', async ({ page }) => {
    await page.goto(`/documents/${docIdWithFile}`)

    const downloadButton = page.getByRole('button', { name: 'Download' }).first()
    await expect(downloadButton).toBeEnabled({ timeout: 10_000 })

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadButton.click(),
    ])

    expect(download.suggestedFilename()).toBeTruthy()
    await download.delete()
  })

  // ── Delete ─────────────────────────────────────────────

  test('DOC-05: delete a document via confirm dialog', async ({ page }) => {
    await page.goto(`/teams/${teamId}`)

    // Delete the renamed document (from DOC-04), keeping the uploaded doc intact
    const row = page.locator('table tbody tr').filter({ hasText: renamedName })
    await row.getByRole('button').click()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('menuitem', { name: 'Delete' }).click()

    await expect(page.getByText('Document deleted')).toBeVisible({ timeout: 10_000 })
  })

  // ── Cleanup ────────────────────────────────────────────

  test('cleanup: delete the test team', async ({ page }) => {
    await page.goto(`/teams/${teamId}/settings`)

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /Delete Team/ }).click()

    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
  })
})
