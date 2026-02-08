import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import Image from 'next/image'

interface AuthLayoutProps {
    children: React.ReactNode
    title: string
    description: string
    showSocial?: boolean
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Form Section */}
            <div className="flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md space-y-8">
                    <div className="space-y-2 text-center">
                        {/* Mobile Logo (only visible on small screens) */}
                        <div className="lg:hidden flex justify-center mb-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                        <p className="text-muted-foreground">{description}</p>
                    </div>

                    {children}

                </div>
            </div>

            {/* Decorative Section */}
            <div className="hidden lg:flex flex-col justify-between bg-zinc-900 p-12 text-white relative overflow-hidden">
                <Image src="/Quran.webp" alt="Quran" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-black/50" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-lg font-medium">
                        <BookOpen className="w-6 h-6" />
                        <span>إتقان</span>
                    </div>
                </div>

                <div className="relative z-10 space-y-6 max-w-lg">
                    <blockquote className="space-y-2">
                        <p className="text-lg">
                            &ldquo;خيركم من تعلم القرآن وعلمه&rdquo;
                        </p>
                        <footer className="text-sm opacity-80">حديث شريف</footer>
                    </blockquote>
                </div>
            </div>
        </div>
    )
}
