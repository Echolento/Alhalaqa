"use client"

import { useMemo, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface WeekTimePickerProps {
  value?: Date | null
  onChange: (date: Date) => void
  minuteStep?: number // e.g., 60
  startHour?: number // 0-23
  endHour?: number   // 1-24 (exclusive)
  weekStartDate?: Date // if not provided, current week's Sunday
  disabledDates?: (date: Date) => boolean
}

function getWeekStart(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 (Sun) - 6 (Sat)
  d.setDate(d.getDate() - day) // go back to Sunday
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

export function WeekTimePicker({
  value,
  onChange,
  minuteStep = 15, // Default to 15 for better granular control in alarm style
  weekStartDate,
}: WeekTimePickerProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    weekStartDate ? getWeekStart(weekStartDate) : getWeekStart(new Date())
  )

  // Internal selection states
  const [selectedDate, setSelectedDate] = useState<Date>(() => value || new Date())
  const [hour, setHour] = useState<string>(() => {
    const h = (value || new Date()).getHours()
    const h12 = h % 12 || 12
    return String(h12)
  })
  const [minute, setMinute] = useState<string>(() => {
    const m = (value || new Date()).getMinutes()
    return String(Math.floor(m / minuteStep) * minuteStep).padStart(2, '0')
  })
  const [period, setPeriod] = useState<'AM' | 'PM'>(() => {
    return (value || new Date()).getHours() >= 12 ? 'PM' : 'AM'
  })

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)), [currentWeekStart])

  // Update parent whenever H/M/P or day changes
  useEffect(() => {
    const newDate = new Date(selectedDate)
    let h = parseInt(hour)
    if (period === 'PM' && h < 12) h += 12
    if (period === 'AM' && h === 12) h = 0

    newDate.setHours(h, parseInt(minute), 0, 0)

    // Only call onChange if something actually changed to avoid loops
    if (!value || newDate.getTime() !== value.getTime()) {
      onChange(newDate)
    }
  }, [hour, minute, period, selectedDate])

  function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
  }

  function isToday(d: Date) {
    const today = new Date()
    return isSameDay(d, today)
  }

  const navigateWeek = (direction: 'next' | 'prev') => {
    setCurrentWeekStart(prev => addDays(prev, direction === 'next' ? 7 : -7))
  }

  return (
    <div className="space-y-4 sm:space-y-6 border rounded-2xl p-3 sm:p-6 bg-card shadow-sm border-primary/10">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <span className="text-md font-bold">
            {ARABIC_MONTHS[currentWeekStart.getMonth()]} {currentWeekStart.getFullYear()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => navigateWeek('prev')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => navigateWeek('next')}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-4 rounded-full text-xs font-bold"
            onClick={() => {
              const today = new Date();
              setCurrentWeekStart(getWeekStart(today));
              setSelectedDate(today);
            }}
          >
            اليوم
          </Button>

        </div>
      </div>

      {/* Day Selection Row */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((d, idx) => {
          const isSelected = isSameDay(d, selectedDate)
          const isPast = d < new Date() && !isToday(d)

          return (
            <button
              key={idx}
              type="button"
              disabled={isPast}
              onClick={() => setSelectedDate(d)}
              className={cn(
                "flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl border transition-all gap-1",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105 z-10"
                  : "bg-muted/20 hover:bg-muted/40 border-transparent",
                isToday(d) && !isSelected ? "border-primary/30 text-primary" : "",
                isPast ? "opacity-20 cursor-not-allowed" : "cursor-pointer"
              )}
            >
              <span className="text-[10px] font-medium opacity-70">{ARABIC_DAYS[idx]}</span>
              <span className="text-lg font-bold">{d.getDate()}</span>
            </button>
          )
        })}
      </div>

      {/* Alarm Style Time Picker */}
      <div className="space-y-4 pt-4 border-t border-primary/5">
        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground pb-2">
          <Clock className="w-4 h-4" />
          تحديد الوقت
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 bg-muted/30 p-4 sm:p-6 rounded-2xl border border-dashed border-primary/20">
          {/* Hour */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">الساعة</span>
            <Select value={hour} onValueChange={setHour}>
              <SelectTrigger className="w-20 h-16 text-2xl font-bold rounded-xl border-2 focus:ring-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                  <SelectItem key={h} value={h} className="text-lg font-bold">
                    {h.padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-3xl font-bold text-primary mt-6">:</span>

          {/* Minute */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">الدقيقة</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={minute}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                if (val === '') {
                  setMinute('00')
                } else {
                  const n = parseInt(val)
                  if (n <= 59) setMinute(val)
                }
              }}
              onBlur={(e) => {
                const n = Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                setMinute(String(n).padStart(2, '0'))
              }}
              className="w-20 h-16 text-2xl font-bold rounded-xl border-2 text-center bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              placeholder="00"
            />
          </div>

          {/* AM/PM */}
          <div className="flex flex-col gap-2 mt-6">
            <div className="flex flex-col border-2 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setPeriod('AM')}
                className={cn(
                  "px-4 py-2 text-sm font-bold transition-colors",
                  period === 'AM' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                صباحاً
              </button>
              <button
                type="button"
                onClick={() => setPeriod('PM')}
                className={cn(
                  "px-4 py-2 text-sm font-bold transition-colors border-t",
                  period === 'PM' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                مساءً
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Result Summary */}
      <div className="p-3 sm:p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground font-bold">الموعد الذي تم اختياره</div>
            <div className="text-sm font-bold text-primary">
              {ARABIC_DAYS[selectedDate.getDay()]} {selectedDate.getDate()} {ARABIC_MONTHS[selectedDate.getMonth()]}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground font-bold">التوقيت</div>
          <div className="text-xl font-black text-primary tracking-tighter">
            {hour.padStart(2, '0')}:{minute} {period === 'AM' ? 'ص' : 'م'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WeekTimePicker


