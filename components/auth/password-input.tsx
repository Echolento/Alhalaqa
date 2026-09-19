'use client'

import * as React from 'react'
import { CheckCircle, Eye, EyeOff, Lock, XCircle } from 'lucide-react'
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
        const [text, setText] = React.useState(() =>
            typeof props.value === 'string' ? props.value : '',
        )

        // Mirrors validatePasswordStrength in lib/auth-actions.ts so the user
        // sees live why their password is still weak.
        const requirements = [
            { label: '8 أحرف على الأقل', met: text.length >= 8 },
            { label: 'حرف كبير (A-Z)', met: /[A-Z]/.test(text) },
            { label: 'حرف صغير (a-z)', met: /[a-z]/.test(text) },
            { label: 'رقم (0-9)', met: /[0-9]/.test(text) },
        ]
        // One standard for everything: bar width, color, and label all follow
        // the checklist count, so each label has exactly one visual state.
        const metCount = requirements.filter((r) => r.met).length

        const togglePassword = () => setShowPassword(!showPassword)

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setText(e.target.value)
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
                                        metCount <= 1
                                            ? "bg-red-500"
                                            : metCount <= 3
                                                ? "bg-yellow-500"
                                                : "bg-green-500",
                                    )}
                                    style={{ width: `${(metCount / 4) * 100}%` }}
                                />
                            </div>
                            <span
                                data-testid="password-strength-label"
                                className={cn(
                                    "text-xs",
                                    metCount <= 1
                                        ? "text-red-600"
                                        : metCount <= 3
                                            ? "text-yellow-600"
                                            : "text-green-600",
                                )}
                            >
                                {metCount <= 1 ? "ضعيفة" : metCount <= 3 ? "متوسطة" : "قوية"}
                            </span>
                        </div>
                    </div>
                )}

                {showStrength && (
                    <ul className="space-y-1 text-xs mt-2">
                        {requirements.map((req) => (
                            <li
                                key={req.label}
                                className={cn(
                                    "flex items-center gap-1.5 transition-colors",
                                    req.met ? "text-green-600" : "text-red-500",
                                )}
                            >
                                {req.met ? (
                                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                                )}
                                {req.label}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        )
    }
)
PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
