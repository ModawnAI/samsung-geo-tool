'use client'

import * as React from 'react'
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { Calendar as CalendarIcon } from '@phosphor-icons/react'
import type { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/lib/i18n'

export interface DateRangeValue {
  from: Date
  to: Date
}

interface DateRangePickerProps {
  value?: DateRangeValue
  onChange: (value: DateRangeValue) => void
  className?: string
  disabled?: boolean
}

type PresetKey = '7d' | '30d' | '90d' | '12m' | 'mtd' | 'custom'

const presets: { key: PresetKey; getRange: () => DateRangeValue }[] = [
  {
    key: '7d',
    getRange: () => ({
      from: subDays(new Date(), 7),
      to: new Date(),
    }),
  },
  {
    key: '30d',
    getRange: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
  {
    key: '90d',
    getRange: () => ({
      from: subDays(new Date(), 90),
      to: new Date(),
    }),
  },
  {
    key: '12m',
    getRange: () => ({
      from: subMonths(new Date(), 12),
      to: new Date(),
    }),
  },
  {
    key: 'mtd',
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: new Date(),
    }),
  },
]

export function DateRangePicker({
  value,
  onChange,
  className,
  disabled,
}: DateRangePickerProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedPreset, setSelectedPreset] = React.useState<PresetKey>('30d')
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    value ? { from: value.from, to: value.to } : undefined
  )

  // Sync external value
  React.useEffect(() => {
    if (value) {
      setDateRange({ from: value.from, to: value.to })
    }
  }, [value])

  const presetLabels: Record<PresetKey, string> = {
    '7d': t.analytics?.presets?.last7Days || 'Last 7 days',
    '30d': t.analytics?.presets?.last30Days || 'Last 30 days',
    '90d': t.analytics?.presets?.last90Days || 'Last 90 days',
    '12m': t.analytics?.presets?.last12Months || 'Last 12 months',
    'mtd': t.analytics?.presets?.monthToDate || 'Month to date',
    'custom': t.analytics?.presets?.custom || 'Custom range',
  }

  const handlePresetChange = (preset: PresetKey) => {
    setSelectedPreset(preset)
    if (preset !== 'custom') {
      const presetConfig = presets.find((p) => p.key === preset)
      if (presetConfig) {
        const range = presetConfig.getRange()
        setDateRange({ from: range.from, to: range.to })
        onChange(range)
      }
    }
  }

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from && range?.to) {
      setSelectedPreset('custom')
      onChange({ from: range.from, to: range.to })
    }
  }

  const formatDateRange = () => {
    if (!dateRange?.from) {
      return t.analytics?.selectDateRange || 'Select date range'
    }
    if (!dateRange.to) {
      return format(dateRange.from, 'MMM d, yyyy')
    }
    return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !dateRange && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          {/* Preset selector */}
          <div className="p-3 border-b sm:border-b-0 sm:border-r">
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.key} value={preset.key}>
                    {presetLabels[preset.key]}
                  </SelectItem>
                ))}
                <SelectItem value="custom">{presetLabels.custom}</SelectItem>
              </SelectContent>
            </Select>

            {/* Quick preset buttons */}
            <div className="mt-3 flex flex-col gap-1">
              {presets.map((preset) => (
                <Button
                  key={preset.key}
                  variant={selectedPreset === preset.key ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start"
                  onClick={() => handlePresetChange(preset.key)}
                >
                  {presetLabels[preset.key]}
                </Button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false)
                }}
              >
                {t.common?.close || 'Close'}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
