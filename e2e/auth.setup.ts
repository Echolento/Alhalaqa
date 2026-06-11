import { test as setup, expect } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') })

const email = process.env.TEST_EMAIL || 'test@example.com'
const password = process.env.TEST_PASSWORD || '124578'

setup('authenticate', async ({ page }) => {
  await page.goto('/auth/login')
  await page.getByPlaceholder('example@email.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await page.waitForURL(/\/dashboard/)
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
})
