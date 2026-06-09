import React from "react"
import type { Metadata } from 'next'
import { Noto_Sans_Arabic } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Toaster } from "@/components/ui/toaster"
import LivePicker from '@/components/live-picker'

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
        <LivePicker />
      </body>
    </html>
  )
}
