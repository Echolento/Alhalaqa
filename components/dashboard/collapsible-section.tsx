'use client'

import * as React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("space-y-4", className)}
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer group/header py-2 px-1 -mx-1 rounded-lg hover:bg-muted/50 transition-colors">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {icon}
            {title}
          </h2>
          <Button variant="ghost" size="sm" className="w-9 p-0 group-hover/header:bg-accent">
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span className="sr-only">تفعيل/تعطيل القسم</span>
          </Button>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
