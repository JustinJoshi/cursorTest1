import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { Page } from '@playwright/test'

export async function signIn(
  page: Page,
  email?: string,
  password?: string,
) {
  await setupClerkTestingToken({ page })
  await page.goto('/sign-in')
  await page.getByLabel('Email address').fill(email ?? process.env.TEST_USER_EMAIL!)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.locator('input[type="password"]').waitFor({ state: 'visible' })
  await page.locator('input[type="password"]').fill(password ?? process.env.TEST_USER_PASSWORD!)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 15_000 })
}
