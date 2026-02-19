import { clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authDir = path.join(__dirname, '.auth')
const authFile = path.join(authDir, 'user.json')

setup('configure clerk', async ({}) => {
  await clerkSetup()
})

setup('authenticate', async ({ page }) => {
  await setupClerkTestingToken({ page })
  fs.mkdirSync(authDir, { recursive: true })

  // Look up the test user's Clerk ID by email
  const usersRes = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(process.env.TEST_USER_EMAIL!)}`,
    { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } },
  )
  const [user] = await usersRes.json()
  if (!user) throw new Error(`Could not find Clerk user for ${process.env.TEST_USER_EMAIL}`)

  // Create a short-lived sign-in token via the Clerk Backend API.
  // This bypasses both password entry and the "new device" email verification
  // that Clerk sends when it sees an unrecognised browser (the headless Playwright context).
  const tokenRes = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: user.id, expires_in_seconds: 60 }),
  })
  const { token } = await tokenRes.json()
  if (!token) throw new Error('Clerk did not return a sign-in token')

  // Navigate to the sign-in page so Clerk JS is initialised in the browser context
  await page.goto('/sign-in')
  await page.waitForFunction(() => !!(window as any).Clerk?.loaded, { timeout: 15_000 })

  // Sign in via the ticket strategy — no UI interaction, no new-device prompt
  await page.evaluate(async (ticket: string) => {
    const clerk = (window as any).Clerk
    const signIn = await clerk.client.signIn.create({ strategy: 'ticket', ticket })
    if (signIn.status !== 'complete') {
      throw new Error(`Sign-in ticket returned unexpected status: ${signIn.status}`)
    }
    await clerk.setActive({ session: signIn.createdSessionId })
  }, token)

  // Navigate to a protected route to confirm the session is active
  await page.goto('/dashboard')
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })

  // Give UserSync time to call ensureUser and create the Convex record
  await page.waitForTimeout(2_000)

  await page.context().storageState({ path: authFile })
})
