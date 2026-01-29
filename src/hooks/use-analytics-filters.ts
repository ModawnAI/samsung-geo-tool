'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { subDays, parseISO, format, isValid } from 'date-fns'

export interface AnalyticsFilters {
  dateRange: {
    from: Date
    to: Date
  }
  productId: string | null
  categoryId: string | null
}

const DEFAULT_DAYS = 30

/**
 * Hook to manage analytics filters with URL sync
 */
export function useAnalyticsFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Initialize from URL params or defaults
  const getInitialFilters = useCallback((): AnalyticsFilters => {
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const productId = searchParams.get('product_id')
    const categoryId = searchParams.get('category_id')

    let from: Date
    let to: Date

    // Parse from param
    if (fromParam) {
      const parsed = parseISO(fromParam)
      from = isValid(parsed) ? parsed : subDays(new Date(), DEFAULT_DAYS)
    } else {
      from = subDays(new Date(), DEFAULT_DAYS)
    }

    // Parse to param
    if (toParam) {
      const parsed = parseISO(toParam)
      to = isValid(parsed) ? parsed : new Date()
    } else {
      to = new Date()
    }

    return {
      dateRange: { from, to },
      productId: productId || null,
      categoryId: categoryId || null,
    }
  }, [searchParams])

  const [filters, setFilters] = useState<AnalyticsFilters>(getInitialFilters)

  // Sync URL when filters change
  const updateURL = useCallback((newFilters: AnalyticsFilters) => {
    const params = new URLSearchParams()

    // Always include date range
    params.set('from', format(newFilters.dateRange.from, 'yyyy-MM-dd'))
    params.set('to', format(newFilters.dateRange.to, 'yyyy-MM-dd'))

    if (newFilters.productId) {
      params.set('product_id', newFilters.productId)
    }

    if (newFilters.categoryId) {
      params.set('category_id', newFilters.categoryId)
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, pathname])

  // Update date range
  const setDateRange = useCallback((dateRange: { from: Date; to: Date }) => {
    const newFilters = { ...filters, dateRange }
    setFilters(newFilters)
    updateURL(newFilters)
  }, [filters, updateURL])

  // Update product filter
  const setProductId = useCallback((productId: string | null) => {
    const newFilters = { ...filters, productId }
    setFilters(newFilters)
    updateURL(newFilters)
  }, [filters, updateURL])

  // Update category filter
  const setCategoryId = useCallback((categoryId: string | null) => {
    const newFilters = { ...filters, categoryId }
    setFilters(newFilters)
    updateURL(newFilters)
  }, [filters, updateURL])

  // Reset to defaults
  const resetFilters = useCallback(() => {
    const defaultFilters: AnalyticsFilters = {
      dateRange: {
        from: subDays(new Date(), DEFAULT_DAYS),
        to: new Date(),
      },
      productId: null,
      categoryId: null,
    }
    setFilters(defaultFilters)
    router.push(pathname, { scroll: false })
  }, [router, pathname])

  // Sync from URL on mount/URL change
  useEffect(() => {
    setFilters(getInitialFilters())
  }, [getInitialFilters])

  // Build API query params
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams()
    params.set('from', filters.dateRange.from.toISOString())
    params.set('to', filters.dateRange.to.toISOString())
    if (filters.productId) params.set('product_id', filters.productId)
    if (filters.categoryId) params.set('category_id', filters.categoryId)
    return params.toString()
  }, [filters])

  return {
    filters,
    setDateRange,
    setProductId,
    setCategoryId,
    resetFilters,
    buildQueryParams,
  }
}
