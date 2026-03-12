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
                            <div className="w-32 h-32 bg-card/50 backdrop-blur-sm border border-border rounded-2xl flex items-center justify-center p-3 shadow-sm">
                                <Image
                                    src="/Logo.webp"
                                    alt="Logo"
                                    width={120}
                                    height={120}
                                    className="object-contain"
                                />
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
                    <div className="flex items-center gap-4 text-lg font-medium">
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 shadow-lg">
                            <Image
                                src="/Logo.webp"
                                alt="Logo"
                                width={80}
                                height={80}
                                className="object-contain"
                            />
                        </div>
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
