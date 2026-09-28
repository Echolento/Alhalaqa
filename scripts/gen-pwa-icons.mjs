// scripts/gen-pwa-icons.mjs
// One-shot generator: derives installable PWA icons (192 + 512, white
// padded) from public/Logo.png via sharp. Re-run if the logo changes:
//   node scripts/gen-pwa-icons.mjs
import sharp from 'sharp'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
await sharp(join(root, 'Logo.png'))
  .resize(512, 512, { fit: 'contain', background: '#ffffff' })
  .png()
  .toFile(join(root, 'icon-512.png'))
await sharp(join(root, 'Logo.png'))
  .resize(192, 192, { fit: 'contain', background: '#ffffff' })
  .png()
  .toFile(join(root, 'icon-192.png'))
await sharp(join(root, 'Logo.png'))
  .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png()
  .toFile(join(root, 'favicon-32x32.png'))
console.log('icons-ok')
