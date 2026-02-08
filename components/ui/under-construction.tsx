'use client'

import { Construction } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface UnderConstructionProps {
    title?: string
    description?: string
}

export function UnderConstruction({
    title = "قيد الإنشاء",
    description = "هذه الصفحة قيد التطوير وستكون متاحة قريباً"
}: UnderConstructionProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center p-8">
            <div className="w-24 h-24 rounded-full bg-warning/10 flex items-center justify-center animate-pulse">
                <Construction className="w-12 h-12 text-warning" />
            </div>
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">{title}</h1>
                <p className="text-muted-foreground max-w-md">
                    {description}
                </p>
            </div>
            <Button asChild variant="outline">
                <Link href="/dashboard">العودة للوحة التحكم</Link>
            </Button>
        </div>
    )
}
