'use client'

/**
 * Accessibility Wrapper Component
 * Provides WCAG-compliant accessibility features
 * Iteration 10: Polish & Performance
 */

import { useEffect, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ArrowUp, TextAa, Moon, Sun } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

interface AccessibilityWrapperProps {
  children: React.ReactNode
  className?: string
}

/**
 * Skip to content link for keyboard navigation
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className={cn(
        'sr-only focus:not-sr-only',
        'fixed top-4 left-4 z-[100]',
        'px-4 py-2 rounded-lg',
        'bg-primary text-primary-foreground',
        'font-medium text-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
      )}
    >
      본문으로 건너뛰기
    </a>
  )
}

/**
 * Back to top button
 */
export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300)
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={scrollToTop}
            size="icon"
            variant="secondary"
            className="rounded-full shadow-lg h-12 w-12"
            aria-label="맨 위로 이동"
          >
            <ArrowUp className="h-5 w-5" weight="bold" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Font size controls for readability
 */
export function FontSizeControl() {
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'larger'>('normal')

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem('geo-font-size')
    if (saved && ['normal', 'large', 'larger'].includes(saved)) {
      setFontSize(saved as typeof fontSize)
      applyFontSize(saved as typeof fontSize)
    }
  }, [])

  const applyFontSize = (size: typeof fontSize) => {
    const root = document.documentElement
    switch (size) {
      case 'large':
        root.style.fontSize = '18px'
        break
      case 'larger':
        root.style.fontSize = '20px'
        break
      default:
        root.style.fontSize = '16px'
    }
  }

  const toggleFontSize = () => {
    const sizes: (typeof fontSize)[] = ['normal', 'large', 'larger']
    const currentIndex = sizes.indexOf(fontSize)
    const nextSize = sizes[(currentIndex + 1) % sizes.length]
    setFontSize(nextSize)
    applyFontSize(nextSize)
    localStorage.setItem('geo-font-size', nextSize)
  }

  return (
    <Button
      onClick={toggleFontSize}
      variant="ghost"
      size="sm"
      className="gap-2"
      aria-label={`글꼴 크기: ${fontSize === 'normal' ? '보통' : fontSize === 'large' ? '크게' : '더 크게'}`}
    >
      <TextAa className="h-4 w-4" />
      <span className="text-xs">
        {fontSize === 'normal' ? 'A' : fontSize === 'large' ? 'A+' : 'A++'}
      </span>
    </Button>
  )
}

/**
 * Focus trap for modals and dialogs
 */
export function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [isActive, containerRef])
}

/**
 * Announce messages to screen readers
 */
export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.getElementById('sr-announcer')
    if (announcer) {
      announcer.setAttribute('aria-live', priority)
      announcer.textContent = message
      // Clear after announcement
      setTimeout(() => {
        announcer.textContent = ''
      }, 1000)
    }
  }, [])

  return announce
}

/**
 * Screen reader announcer element
 */
export function ScreenReaderAnnouncer() {
  return (
    <div
      id="sr-announcer"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  )
}

/**
 * Reduce motion hook for users who prefer reduced motion
 */
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

/**
 * High contrast mode toggle
 */
export function HighContrastToggle() {
  const [isHighContrast, setIsHighContrast] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('geo-high-contrast')
    if (saved === 'true') {
      setIsHighContrast(true)
      document.documentElement.classList.add('high-contrast')
    }
  }, [])

  const toggle = () => {
    const newValue = !isHighContrast
    setIsHighContrast(newValue)
    if (newValue) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }
    localStorage.setItem('geo-high-contrast', String(newValue))
  }

  return (
    <Button
      onClick={toggle}
      variant="ghost"
      size="sm"
      className="gap-2"
      aria-pressed={isHighContrast}
      aria-label={isHighContrast ? '고대비 모드 끄기' : '고대비 모드 켜기'}
    >
      {isHighContrast ? (
        <Sun className="h-4 w-4" weight="fill" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}

/**
 * Accessibility toolbar for users
 */
export function AccessibilityToolbar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1 rounded-lg bg-muted/50',
        className
      )}
      role="toolbar"
      aria-label="접근성 도구"
    >
      <FontSizeControl />
      <HighContrastToggle />
    </div>
  )
}

export function AccessibilityWrapper({ children, className }: AccessibilityWrapperProps) {
  return (
    <div className={className}>
      <SkipToContent />
      <ScreenReaderAnnouncer />
      {children}
      <BackToTop />
    </div>
  )
}

export default AccessibilityWrapper
