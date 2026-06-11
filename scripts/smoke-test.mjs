const BASE = process.env.BASE_URL || 'http://localhost:3000'

const routes = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/error',
]

async function main() {
  console.log(`Smoke testing ${BASE}\n`)
  let passed = 0
  let failed = 0

  for (const route of routes) {
    try {
      const res = await fetch(`${BASE}${route}`)
      if (res.ok) {
        console.log(`  ✓ ${route} → ${res.status}`)
        passed++
      } else {
        console.log(`  ✗ ${route} → ${res.status}`)
        failed++
      }
    } catch (err) {
      console.log(`  ✗ ${route} → ERROR: ${err.message}`)
      failed++
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
