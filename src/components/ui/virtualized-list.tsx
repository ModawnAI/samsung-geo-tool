'use client'

import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'

interface VirtualizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  estimateSize?: number
  overscan?: number
  className?: string
  itemClassName?: string
  emptyMessage?: string
  getItemKey?: (item: T, index: number) => string | number
}

function VirtualizedList<T>({
  items,
  renderItem,
  estimateSize = 50,
  overscan = 5,
  className,
  itemClassName,
  emptyMessage = 'No items to display',
  getItemKey,
}: VirtualizedListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey ? (index) => getItemKey(items[index], index) : undefined,
  })

  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-muted-foreground', className)}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div ref={parentRef} className={cn('h-full overflow-auto', className)}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
            className={itemClassName}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  )
}

interface VirtualizedTableProps<T> {
  items: T[]
  columns: {
    key: string
    header: string
    width?: string
    render: (item: T) => React.ReactNode
  }[]
  estimateSize?: number
  overscan?: number
  className?: string
  getItemKey?: (item: T, index: number) => string | number
  onRowClick?: (item: T, index: number) => void
}

function VirtualizedTable<T>({
  items,
  columns,
  estimateSize = 48,
  overscan = 5,
  className,
  getItemKey,
  onRowClick,
}: VirtualizedTableProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey ? (index) => getItemKey(items[index], index) : undefined,
  })

  return (
    <div className={cn('rounded-lg border', className)}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-muted/50">
        <div className="flex">
          {columns.map((column) => (
            <div
              key={column.key}
              className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
              style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized body */}
      <div ref={parentRef} className="h-[400px] overflow-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            No items to display
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const item = items[virtualRow.index]
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={cn(
                    'flex border-b last:border-b-0',
                    onRowClick && 'cursor-pointer hover:bg-muted/50'
                  )}
                  onClick={() => onRowClick?.(item, virtualRow.index)}
                >
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className="px-4 py-3 text-sm"
                      style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
                    >
                      {column.render(item)}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export { VirtualizedList, VirtualizedTable }
export type { VirtualizedListProps, VirtualizedTableProps }
