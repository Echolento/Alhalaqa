'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        .header-animate {
          animation: fadeInDown 0.6s cubic-bezier(0.23, 1, 0.320, 1);
        }

        .logo-animate {
          animation: scaleIn 0.5s cubic-bezier(0.23, 1, 0.320, 1);
        }

        .nav-button {
          transition: all 0.3s cubic-bezier(0.23, 1, 0.320, 1);
        }

        .nav-button:hover {
          transform: translateY(-2px);
        }

        .hero-title {
          animation: fadeInUp 0.8s cubic-bezier(0.23, 1, 0.320, 1) 0.1s both;
        }

        .hero-subtitle {
          animation: fadeInUp 0.8s cubic-bezier(0.23, 1, 0.320, 1) 0.2s both;
        }

        .hero-buttons {
          animation: fadeInUp 0.8s cubic-bezier(0.23, 1, 0.320, 1) 0.3s both;
        }

        .cta-button {
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.23, 1, 0.320, 1);
        }

        .cta-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.1;
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .cta-button:hover {
          transform: translateY(-3px);
        }

        .cta-button:hover::before {
          width: 300px;
          height: 300px;
        }

        .footer-animate {
          animation: fadeIn 0.8s cubic-bezier(0.23, 1, 0.320, 1) 0.4s both;
        }
      `}</style>

      {/* Header */}
      <header className="header-animate border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div data-impeccable-variants="a6cbe400" data-impeccable-variant-count="2" style={{ display: "contents" }}>
          {/* impeccable-variants-start a6cbe400 */}
          {/* Original */}
          <div data-impeccable-variant="original">
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
              <Link href="/" className="logo-animate w-14 h-14 bg-card/50 border border-border rounded-2xl flex items-center justify-center p-1.5 transition-all duration-300 hover:shadow-lg hover:border-primary/50">
                <Image
                  src="/Logo.png"
                  alt="Logo"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </Link>
              <div className="flex items-center gap-3">
                <Button asChild variant="ghost" className="nav-button">
                  <Link href="/auth/login">تسجيل الدخول</Link>
                </Button>
                <Button asChild className="nav-button cta-button">
                  <Link href="/auth/signup">إنشاء حساب</Link>
                </Button>
              </div>
            </div>
          </div>
          {/* Variants: insert below this line */}
          {/* impeccable-variants-end a6cbe400 */}
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="hero-title text-4xl md:text-6xl font-bold text-foreground leading-tight text-balance">
            لكل معلم قرآن يستحق
            <br />
            <span className="text-primary"> أدوات تليق برسالته</span>
          </h1>
          <p className="hero-subtitle mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            تابع مستحقاتك المالية بدون تعقيد، لتبقى متفرغاً لتعليم كتاب الله
          </p>
          <div className="hero-buttons mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="text-lg px-8 cta-button">
              <Link href="/auth/signup">إنشاء حساب جديد</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 bg-transparent cta-button">
              <Link href="/auth/login">تسجيل الدخول</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-animate border-t border-border py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>جميع الحقوق محفوظة © {new Date().getFullYear()} الحلقة</p>
        </div>
      </footer>
    </div>
  )
}
