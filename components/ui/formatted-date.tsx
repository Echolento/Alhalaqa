'use client'

import { useEffect, useState } from 'react'

interface FormattedDateProps {
    date: string | Date
    options?: Intl.DateTimeFormatOptions
    className?: string
}

export function FormattedDate({ date, options, className }: FormattedDateProps) {
    const [formatted, setFormatted] = useState<string>('')

    useEffect(() => {
        setFormatted(
            new Date(date).toLocaleDateString('ar-SA', options || {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
            })
        )
    }, [date, options])

    if (!formatted) return <span className={className}>...</span>

    return <span className={className}>{formatted}</span>
}

export function FormattedTime({ date, options, className }: FormattedDateProps) {
    const [formatted, setFormatted] = useState<string>('')

    useEffect(() => {
        setFormatted(
            new Date(date).toLocaleTimeString('ar-SA', options || {
                hour: '2-digit',
                minute: '2-digit',
            })
        )
    }, [date, options])

    if (!formatted) return <span className={className}>...</span>

    return <span className={className}>{formatted}</span>
}
