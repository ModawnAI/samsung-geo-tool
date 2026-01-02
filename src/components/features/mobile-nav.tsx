'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  ChartBar,
  Sparkle,
  FileText,
  ClockCounterClockwise,
  List,
  SignOut,
  User as UserIcon,
  X,
  Sliders,
  ListBullets,
  ChartLineUp,
} from '@phosphor-icons/react'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  user: User
}

const navItemsConfig = [
  { href: '/dashboard', labelKey: 'dashboard' as const, icon: ChartBar },
  { href: '/generate', labelKey: 'generate' as const, icon: Sparkle },
  { href: '/history', labelKey: 'history' as const, icon: ClockCounterClockwise },
  { href: '/briefs', labelKey: 'briefs' as const, icon: FileText },
  { href: '/analytics', labelKey: 'analytics' as const, icon: ChartLineUp },
  { href: '/tuning', labelKey: 'tuning' as const, icon: Sliders },
  { href: '/activity-logs', labelKey: 'activityLogs' as const, icon: ListBullets },
]

export function MobileNav({ user }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { t } = useI18n()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
        >
          <List className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center justify-between">
            <span>Samsung GEO Tool</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="mt-6 flex flex-col gap-1" aria-label={t.a11y.navigation}>
          {navItemsConfig.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {t.nav[item.labelKey]}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <UserIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.user_metadata?.name || user.email?.split('@')[0]}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleSignOut}
          >
            <SignOut className="h-4 w-4" />
            {t.auth.signOut}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Bottom navigation for mobile (alternative to sidebar)
export function MobileBottomNav() {
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden"
      aria-label={t.a11y.navigation}
    >
      <div className="flex items-center justify-around h-16">
        {navItemsConfig.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'fill-current')} weight={isActive ? 'fill' : 'regular'} />
              <span className="text-xs font-medium">{t.nav[item.labelKey]}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
