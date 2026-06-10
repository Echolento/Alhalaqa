import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })

const check = async (label, url, width, height) => {
  const ctx = await browser.newContext({ viewport: { width, height } })
  const page = await ctx.newPage()
  
  // Login
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'load', timeout: 15000 })
  await page.fill('input[type="email"]', 'mariah.sobhy@gmail.com')
  await page.fill('input[type="password"]', '124578')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  
  // Navigate to target
  await page.goto(url, { waitUntil: 'load', timeout: 15000 })
  await page.waitForTimeout(2000)

  const layout = await page.evaluate(() => {
    const issues = []
    const body = document.body
    const w = body.scrollWidth - body.clientWidth
    const h = body.scrollHeight - body.clientHeight
    if (w > 5) issues.push(`HORIZONTAL_OVERFLOW ${w}px (scrollWidth=${body.scrollWidth}, clientWidth=${body.clientWidth})`)
    if (h > 50) issues.push(`VERTICAL_SCROLL ${h}px`)

    // Elements clipped (right/bottom outside viewport)
    const all = document.querySelectorAll('*')
    let clipped = 0
    all.forEach(el => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        if (r.right > body.clientWidth + 2 || r.bottom > body.clientHeight + 2) clipped++
      }
    })
    if (clipped > 50) issues.push(`CLIPPED_ELEMENTS ${clipped}`)

    // Text overflow
    const overflowText = []
    all.forEach(el => {
      if (el.children.length === 0 && el.textContent.trim() && el.scrollWidth > el.clientWidth + 2) {
        overflowText.push(el.textContent.trim().slice(0, 25))
      }
    })
    if (overflowText.length > 0) issues.push(`TEXT_OVERFLOW ${overflowText.length} items: ${overflowText.slice(0, 3).join(' | ')}`)

    return {
      issues,
      counts: {
        buttons: document.querySelectorAll('button').length,
        inputs: document.querySelectorAll('input, select, textarea').length,
        links: document.querySelectorAll('a[href]').length
      },
      viewport: { w: body.clientWidth, h: body.clientHeight }
    }
  })

  console.log(`${label} (${width}x${height}) — viewport ${layout.viewport.w}x${layout.viewport.h}:`)
  if (layout.issues.length === 0) console.log('  ✓ No layout issues')
  else layout.issues.forEach(i => console.log(`  ⚠ ${i}`))
  console.log(`  Elements: buttons=${layout.counts.buttons} inputs=${layout.counts.inputs} links=${layout.counts.links}`)
  console.log()
  await ctx.close()
}

await check('STUDENTS (mobile)', 'http://localhost:3000/dashboard/students', 390, 844)
await check('PAYMENTS (mobile)', 'http://localhost:3000/dashboard/payments', 390, 844)
await check('DASHBOARD (mobile)', 'http://localhost:3000/dashboard', 390, 844)
await check('STUDENTS (tablet)', 'http://localhost:3000/dashboard/students', 768, 900)
await check('PAYMENTS (tablet)', 'http://localhost:3000/dashboard/payments', 768, 900)
await check('STUDENTS (desktop)', 'http://localhost:3000/dashboard/students', 1440, 900)

await browser.close()
console.log('Done')
