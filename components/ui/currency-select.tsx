'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { currencies, type Currency } from '@/lib/currencies'

interface CurrencySelectProps {
  value?: string
  onValueChange: (value: string) => void
  name?: string
  defaultValue?: string
}

export function CurrencySelect({ value, onValueChange, name, defaultValue }: CurrencySelectProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedCode, setSelectedCode] = React.useState(value || defaultValue || 'EGP')

  const selectedCurrency = currencies.find(c => c.code === selectedCode)

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedCode(value)
    }
  }, [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex h-10 w-full justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm font-normal ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {selectedCurrency ? (
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">{selectedCurrency.symbol}</span>
              <span>{selectedCurrency.nameAr}</span>
              <span className="text-muted-foreground text-xs">({selectedCurrency.code})</span>
            </span>
          ) : (
            <span className="text-muted-foreground">اختر العملة...</span>
          )}
          <ChevronDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="بحث عن عملة..." className="h-9" />
          <CommandList>
            <CommandEmpty>لا توجد نتائج.</CommandEmpty>
            <CommandGroup>
              {currencies.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={`${currency.code} ${currency.name} ${currency.nameAr}`}
                  onSelect={() => {
                    setSelectedCode(currency.code)
                    onValueChange(currency.code)
                    setOpen(false)
                  }}
                >
                  <span className="flex items-center gap-2 flex-1">
                    <span className="text-muted-foreground w-8 text-center">{currency.symbol}</span>
                    <span>{currency.nameAr}</span>
                    <span className="text-muted-foreground text-xs">({currency.code})</span>
                  </span>
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4',
                      selectedCode === currency.code ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      <input type="hidden" name={name} value={selectedCode} />
    </Popover>
  )
}
