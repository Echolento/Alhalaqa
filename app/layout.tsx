import React from "react"
import type { Metadata } from 'next'
import { Noto_Sans_Arabic } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import './globals.css'
import { Toaster } from "@/components/ui/toaster"
import { ServiceWorkerBootstrap } from "@/components/pwa/service-worker-bootstrap"

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic"
});

export const metadata: Metadata = {
  title: 'Alhalaqa - الحلقة',
  description: 'منصة الحلقة لإدارة حلقات تحفيظ القرآن الكريم',
  themeColor: '#4d938b',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Alhalaqa',
  },
  icons: {
    // Real Alhalaqa wordmark everywhere (favicon + PWA + iOS).
    icon: [
      {
        url: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
    apple: '/icon-192.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${notoArabic.className} antialiased`} suppressHydrationWarning>
        {children}
        <ServiceWorkerBootstrap />
        <Toaster />
        <Analytics />
        {/* Capture beforeinstallprompt before hydration so the install coach
            can never miss it (the event is only dispatched once per load). */}
        <Script id="bip-capture" strategy="beforeInteractive">
          {`window.addEventListener('beforeinstallprompt', function (e) {
            e.preventDefault();
            window.__deferredInstallPrompt = e;
            window.dispatchEvent(new Event('bip-available'));
          });`}
        </Script>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-TERD2EK651" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-TERD2EK651');`}
        </Script>
        {process.env.NODE_ENV === 'development' && (
          <>
            {/* impeccable-live-start */}
            <script src="http://localhost:8400/live.js"></script>
            {/* impeccable-live-end */}
          </>
        )}
      </body>
    </html>
  )
}
