'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function PromptStudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    { href: '/admin/prompt-studio', label: 'Dashboard', exact: true },
    { href: '/admin/prompt-studio/description', label: 'Description' },
    { href: '/admin/prompt-studio/usp', label: 'USP' },
    { href: '/admin/prompt-studio/faq', label: 'FAQ' },
    { href: '/admin/prompt-studio/chapters', label: 'Chapters' },
    { href: '/admin/prompt-studio/case_studies', label: 'Case Studies' },
    { href: '/admin/prompt-studio/keywords', label: 'Keywords' },
    { href: '/admin/prompt-studio/hashtags', label: 'Hashtags' },
  ]

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prompt Studio</h1>
          <p className="text-sm text-muted-foreground">
            Manage and test prompts for each generation stage
          </p>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto pb-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors',
              isActive(item)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t pt-6">{children}</div>
    </div>
  )
}
