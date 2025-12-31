import type { Icon } from '@phosphor-icons/react'

export interface NavItem {
  href: string
  label: string
  icon: Icon
  children?: NavItem[]
  phase?: 1 | 2 | 3
  badge?: string
  disabled?: boolean
}

export interface NavConfig {
  primary: NavItem[]
  secondary?: NavItem[]
}

export type NavigationVariant = 'desktop' | 'mobile'
