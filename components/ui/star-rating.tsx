'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
    name: string
    label: string
    defaultValue?: number
}

export function StarRating({ name, label, defaultValue = 0 }: StarRatingProps) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">{label}</label>
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((r) => (
                    <label key={r} className="cursor-pointer">
                        <input
                            type="radio"
                            name={name}
                            value={r}
                            defaultChecked={defaultValue === r}
                            className="sr-only peer"
                        />
                        <div className={cn(
                            "w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all",
                            "peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary",
                            "hover:border-primary/50"
                        )}>
                            <Star className="w-4 h-4" />
                        </div>
                    </label>
                ))}
            </div>
        </div>
    )
}
