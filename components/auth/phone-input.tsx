'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhoneInputProps {
  id?: string
  name?: string
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  required?: boolean
  label?: string
  className?: string
  placeholder?: string
}

export function PhoneInput({
  id = 'phone',
  name = 'phone',
  defaultValue = '',
  value: controlledValue,
  onChange,
  onBlur,
  required = false,
  label = 'رقم الهاتف',
  className,
  placeholder = '1xxxxxxxxx',
}: PhoneInputProps) {
  // Handle both controlled and uncontrolled
  const initialValue = (controlledValue !== undefined ? controlledValue : defaultValue) || ''
  // Strip +20 if it was passed in the initial value to show only the local digits
  const cleanInitialValue = initialValue.startsWith('+20') ? initialValue.slice(3) : initialValue

  const [internalValue, setInternalValue] = useState(cleanInitialValue)
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  const displayValue = controlledValue !== undefined
    ? (controlledValue.startsWith('+20') ? controlledValue.slice(3) : controlledValue)
    : internalValue

  const validate = (val: string) => {
    const digits = val.replace(/\D/g, '')
    if (digits.length === 0 && !required) {
      setError(null)
    } else if (digits.length < 10) {
      setError('الرقم قصير جداً')
    } else if (digits.length > 10) {
      setError('الرقم طويل جداً')
    } else {
      setError(null)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    let newValue = e.target.value.replace(/\D/g, '')

    // Auto-strip leading 0 if they type it (e.g. 010 -> 10)
    if (newValue.startsWith('0')) {
      newValue = newValue.slice(1)
    }

    newValue = newValue.slice(0, 10)

    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }

    validate(newValue)

    if (onChange) {
      // Pass back the raw 10 digits (the server will handle the +20)
      onChange(newValue)
    }
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative group">
        <div className={cn(
          "absolute left-0 top-0 bottom-0 flex items-center pl-3 pr-2 border-r bg-muted/50 rounded-l-md text-muted-foreground font-medium transition-colors",
          isFocused && "border-primary/50 text-foreground"
        )}>
          +20
        </div>

        <Input
          id={id}
          name={name}
          type="tel"
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false)
            validate(displayValue)
            onBlur?.(e)
          }}
          required={required}
          className={cn(
            "pl-14 text-left font-mono tracking-wider",
            error && "border-destructive focus-visible:ring-destructive/20"
          )}
          placeholder={placeholder}
          dir="ltr"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {displayValue.length === 10 && !error ? (
            <CheckCircle2 className="w-4 h-4 text-success animate-in zoom-in duration-300" />
          ) : (
            <Phone className={cn(
              "w-4 h-4 transition-colors",
              isFocused ? "text-primary" : "text-muted-foreground"
            )} />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {error ? (
          <p className="text-[10px] sm:text-xs text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        ) : (
          <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 italic opacity-80">
            <CheckCircle2 className="w-3 h-3 opacity-50" />
            يرجى التأكد من صحة الرقم
          </p>
        )}
      </div>
    </div>
  )
}
