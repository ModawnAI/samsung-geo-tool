'use client'

import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

interface AccessibleSliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  label: string
  valueLabel?: (value: number) => string
  showValue?: boolean
  helperText?: string
}

const AccessibleSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  AccessibleSliderProps
>(({ className, label, valueLabel, showValue = true, helperText, ...props }, ref) => {
  const id = React.useId()
  const helperId = `${id}-helper`
  const currentValue = props.value?.[0] ?? props.defaultValue?.[0] ?? 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          id={`${id}-label`}
          htmlFor={id}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
        {showValue && (
          <span
            className="text-sm text-muted-foreground tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {valueLabel ? valueLabel(currentValue) : currentValue}
          </span>
        )}
      </div>
      <SliderPrimitive.Root
        ref={ref}
        id={id}
        aria-labelledby={`${id}-label`}
        aria-describedby={helperText ? helperId : undefined}
        aria-valuetext={valueLabel ? valueLabel(currentValue) : String(currentValue)}
        className={cn(
          'relative flex w-full touch-none select-none items-center',
          className
        )}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-primary/20">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            'block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-md',
            'transition-all duration-150',
            'hover:scale-110 hover:border-primary/80',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            'cursor-grab active:cursor-grabbing'
          )}
        />
      </SliderPrimitive.Root>
      {helperText && (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  )
})
AccessibleSlider.displayName = 'AccessibleSlider'

export { AccessibleSlider }
