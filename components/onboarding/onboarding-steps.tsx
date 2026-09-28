'use client'

// components/onboarding/onboarding-steps.tsx
// 3-circle progress bar (phone-friendly, RTL-safe flex): 1 account, 2
// billing basics, 3 InstaPay. `active` = the step being filled right now;
// everything before it reads done, connectors half-fill toward current.

import { Check } from 'lucide-react'
import { ONBOARDING_COPY } from '@/lib/onboarding-copy'
import { cn } from '@/lib/utils'

export function OnboardingSteps(props: { active: 1 | 2 }) {
  const steps = ONBOARDING_COPY.steps
  return (
    <div dir="rtl" data-testid="onboarding-steps" className="flex items-start">
      {steps.map((label, i) => {
        const n = i + 1
        // Circle 1 (account) is done from signup on; the active page's
        // circle reads current, everything after reads todo.
        const doneSet = props.active === 1 ? [1] : [1, 2]
        const current = props.active === 1 ? 2 : 3
        const resolved: 'done' | 'current' | 'todo' = doneSet.includes(n)
          ? 'done'
          : n === current
            ? 'current'
            : 'todo'
        const fill = (ci: number): 'full' | 'half' | 'empty' => {
          // Connector ci sits between circle ci and ci+1: full when both
          // sides are done, half while reaching toward current.
          if (doneSet.includes(ci) && doneSet.includes(ci + 1)) return 'full'
          if (doneSet.includes(ci)) return 'half'
          return 'empty'
        }
        return (
          <div key={label} className="flex flex-1 items-start last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                data-testid={`step-${n}`}
                data-state={resolved}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold',
                  resolved === 'done' && 'border-primary bg-primary text-primary-foreground',
                  resolved === 'current' && 'border-primary text-primary',
                  resolved === 'todo' && 'border-muted-foreground/30 text-muted-foreground/50',
                )}
              >
                {resolved === 'done' ? <Check className="h-4 w-4" /> : <span>{n}</span>}
              </span>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
            {n < steps.length ? (
              <span
                data-testid={`connector-${n}`}
                data-fill={fill(n)}
                className="relative mx-1 mt-3.5 h-0.5 flex-1 overflow-hidden rounded bg-muted"
              >
                <span
                  className={cn(
                    'absolute inset-y-0 right-0 bg-primary',
                    fill(n) === 'full' && 'w-full',
                    fill(n) === 'half' && 'w-1/2',
                    fill(n) === 'empty' && 'w-0',
                  )}
                />
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
