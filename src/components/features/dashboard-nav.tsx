'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChartBar,
  Sparkle,
  FileText,
  ClockCounterClockwise,
  Gear,
  SignOut,
  User as UserIcon,
  CaretDown,
  Sliders,
  ListBullets,
} from '@phosphor-icons/react'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

interface DashboardNavProps {
  user: User
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: ChartBar },
  { href: '/generate', label: 'Generate', icon: Sparkle },
  { href: '/history', label: 'History', icon: ClockCounterClockwise },
  { href: '/briefs', label: 'Briefs', icon: FileText },
  { href: '/tuning', label: 'Tuning', icon: Sliders },
  { href: '/activity-logs', label: 'Activity Logs', icon: ListBullets },
]

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-lg">
              Samsung GEO Tool
            </Link>
            {/* Hide nav on mobile - using bottom nav instead */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <UserIcon className="h-4 w-4" aria-hidden="true" />
                <span className="max-w-[150px] truncate hidden sm:inline">
                  {user.email}
                </span>
                <CaretDown className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm text-muted-foreground sm:hidden">
                {user.email}
              </div>
              <DropdownMenuSeparator className="sm:hidden" />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Gear className="h-4 w-4" aria-hidden="true" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <SignOut className="h-4 w-4 mr-2" aria-hidden="true" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
