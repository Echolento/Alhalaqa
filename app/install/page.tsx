import type { Metadata } from 'next'
import { InstallPageCard } from '@/components/pwa/install-page-card'

export const metadata: Metadata = {
  title: 'تثبيت الحلقة من Chrome',
  robots: { index: false },
}

/**
 * Landing page for the one-time move onto a Chrome-installed icon.
 * Public on purpose: it is opened from inside another browser, before the
 * teacher has any session there.
 */
export default function InstallPage() {
  return <InstallPageCard />
}
