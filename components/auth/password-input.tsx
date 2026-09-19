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

function calculateStrength(val: string) {
    let score = 0
    if (val.length >= 8) score += 1
    if (val.length >= 12) score += 1
    if (/[A-Z]/.test(val)) score += 1
    if (/[a-z]/.test(val)) score += 1
    if (/[0-9]/.test(val)) score += 1
    if (/[^A-Za-z0-9]/.test(val)) score += 1
    return score
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ className, showStrength, ...props }, ref) => {
        const [showPassword, setShowPassword] = React.useState(false)
        const [strength, setStrength] = React.useState(() =>
            calculateStrength(typeof props.value === 'string' ? props.value : ''),
        )

        const togglePassword = () => setShowPassword(!showPassword)

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
                        {...props}
                        // NOTE: onChange must come after the spread — otherwise a
                        // parent onChange would overwrite handleChange and the
                        // strength meter would never update.
                        onChange={handleChange}
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
                    <div className="mt-2">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                                <div
                                    data-testid="password-strength-fill"
                                    className={cn(
                                        "h-2 rounded-full transition-all duration-300",
                                        strength <= 2
                                            ? "bg-red-500"
                                            : strength <= 4
                                                ? "bg-yellow-500"
                                                : "bg-green-500",
                                    )}
                                    style={{ width: `${(strength / 6) * 100}%` }}
                                />
                            </div>
                            <span
                                data-testid="password-strength-label"
                                className={cn(
                                    "text-xs",
                                    strength <= 2
                                        ? "text-red-600"
                                        : strength <= 4
                                            ? "text-yellow-600"
                                            : "text-green-600",
                                )}
                            >
                                {strength <= 2 ? "ضعيفة" : strength <= 4 ? "متوسطة" : "قوية"}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        )
    }
)
PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
