import React from "react"
import type { Metadata } from 'next'
import { Noto_Sans_Arabic } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import './globals.css'
import { Toaster } from "@/components/ui/toaster"

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic"
});

export const metadata: Metadata = {
  title: 'Alhalaqa - الحلقة',
  description: 'منصة الحلقة لإدارة حلقات تحفيظ القرآن الكريم',
  generator: 'v0.app',
  themeColor: '#4d938b',
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/Logo.png',
      },
    ],
    apple: '/Logo.png',
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
        <Toaster />
        <Analytics />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-TERD2EK651" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-TERD2EK651');`}
        </Script>
      {/* impeccable-live-start */}
<script src="http://localhost:8400/live.js"></script>
{/* impeccable-live-end */}
</body>
    </html>
  )
}
