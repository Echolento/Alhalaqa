'use client'

import * as React from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface PasswordInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    showStrength?: boolean
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ className, showStrength, ...props }, ref) => {
        const [showPassword, setShowPassword] = React.useState(false)
        const [strength, setStrength] = React.useState(0)

        const togglePassword = () => setShowPassword(!showPassword)

        const calculateStrength = (val: string) => {
            let score = 0
            if (val.length > 5) score += 1
            if (val.length > 8) score += 1
            if (/[A-Z]/.test(val)) score += 1
            if (/[0-9]/.test(val)) score += 1
            if (/[^A-Za-z0-9]/.test(val)) score += 1
            return score
        }

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (showStrength) {
                setStrength(calculateStrength(e.target.value))
            }
            props.onChange?.(e)
        }

        return (
            <div className="relative space-y-2">
                <div className="relative">
                    <Input
                        type={showPassword ? 'text' : 'password'}
                        className={cn('pl-10 pr-10 text-right', className)}
                        dir="ltr"
                        ref={ref}
                        onChange={handleChange}
                        {...props}
                    />
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={togglePassword}
                        tabIndex={-1}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                            {showPassword ? 'Hide password' : 'Show password'}
                        </span>
                    </Button>
                </div>

                {showStrength && props.value && (
                    <div className="flex gap-1 h-1 mt-2">
                        {[1, 2, 3, 4, 5].map((index) => (
                            <div
                                key={index}
                                className={cn(
                                    "h-full flex-1 rounded-full transition-all duration-300",
                                    index <= strength
                                        ? strength < 3 ? "bg-red-500" : strength < 5 ? "bg-yellow-500" : "bg-green-500"
                                        : "bg-muted"
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>
        )
    }
)
PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
