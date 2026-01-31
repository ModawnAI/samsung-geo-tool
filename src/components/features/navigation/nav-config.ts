import {
  ChartBar,
  Sparkle,
  FileText,
  ClockCounterClockwise,
  Sliders,
  Upload,
  Scales,
  ListChecks,
  ChartLine,
  Users,
  Target,
  Export,
  FolderOpen,
  Wrench,
  Gear,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import type { NavItem } from '@/types/navigation'

export const primaryNavItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: ChartBar,
  },
  {
    href: '/generate',
    label: 'Create',
    icon: Sparkle,
  },
  {
    href: '/review',
    label: 'Review',
    icon: MagnifyingGlass,
  },
  {
    href: '/content',
    label: 'Content',
    icon: FolderOpen,
    children: [
      {
        href: '/history',
        label: 'History',
        icon: ClockCounterClockwise,
      },
      {
        href: '/briefs',
        label: 'Briefs',
        icon: FileText,
      },
    ],
  },
  {
    href: '/tools',
    label: 'Tools',
    icon: Wrench,
    children: [
      {
        href: '/tuning',
        label: 'Tuning Console',
        icon: Sliders,
        phase: 1,
        children: [
          {
            href: '/tuning/upload',
            label: 'Bulk Upload',
            icon: Upload,
            phase: 1,
          },
          {
            href: '/tuning/prompts',
            label: 'Prompt Manager',
            icon: FileText,
            phase: 1,
          },
          {
            href: '/tuning/weights',
            label: 'Weights',
            icon: Scales,
            phase: 1,
          },
          {
            href: '/tuning/batch',
            label: 'Batch Runner',
            icon: ListChecks,
            phase: 1,
          },
        ],
      },
      {
        href: '/analytics',
        label: 'Analytics',
        icon: ChartLine,
        phase: 3,
        children: [
          {
            href: '/analytics/competitors',
            label: 'Competitors',
            icon: Users,
            phase: 3,
          },
          {
            href: '/analytics/exposure',
            label: 'AI Exposure',
            icon: Target,
            phase: 3,
          },
        ],
      },
      {
        href: '/reports',
        label: 'Export Center',
        icon: Export,
        phase: 3,
      },
    ],
  },
]

export const secondaryNavItems: NavItem[] = [
  {
    href: '/settings',
    label: 'Settings',
    icon: Gear,
  },
]

// Flat list of all navigation items for mobile bottom nav
export const mobileBottomNavItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: ChartBar,
  },
  {
    href: '/generate',
    label: 'Create',
    icon: Sparkle,
  },
  {
    href: '/review',
    label: 'Review',
    icon: MagnifyingGlass,
  },
  {
    href: '/history',
    label: 'History',
    icon: ClockCounterClockwise,
  },
]

// Helper to filter nav items by enabled phases
export function filterNavByPhase(
  items: NavItem[],
  enabledPhases: { phase1: boolean; phase2: boolean; phase3: boolean }
): NavItem[] {
  return items
    .filter((item) => {
      if (!item.phase) return true
      if (item.phase === 1) return enabledPhases.phase1
      if (item.phase === 2) return enabledPhases.phase2
      if (item.phase === 3) return enabledPhases.phase3
      return true
    })
    .map((item) => ({
      ...item,
      children: item.children
        ? filterNavByPhase(item.children, enabledPhases)
        : undefined,
    }))
}

// Get all valid route paths for middleware
export function getAllRoutePaths(items: NavItem[]): string[] {
  const paths: string[] = []

  function collectPaths(navItems: NavItem[]) {
    for (const item of navItems) {
      paths.push(item.href)
      if (item.children) {
        collectPaths(item.children)
      }
    }
  }

  collectPaths(items)
  return paths
}
