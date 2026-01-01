'use client'

import * as React from 'react'
import { useCallback, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { VirtualizedTable } from '@/components/ui/virtualized-list'

interface PreviewRecord {
  _index: number
  _valid: boolean
  _errors: string[]
  [key: string]: unknown
}

interface PreviewTableProps {
  records: Record<string, unknown>[]
  requiredFields: string[]
  onConfirm: (selectedRecords: Record<string, unknown>[]) => void
  onCancel: () => void
  className?: string
}

export function PreviewTable({
  records,
  requiredFields,
  onConfirm,
  onCancel,
  className,
}: PreviewTableProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  // Validate and prepare records for display
  const processedRecords: PreviewRecord[] = useMemo(() => {
    return records.map((record, index) => {
      const errors: string[] = []

      // Check required fields
      for (const field of requiredFields) {
        if (record[field] === undefined || record[field] === null || record[field] === '') {
          errors.push(`Missing required field: ${field}`)
        }
      }

      return {
        ...record,
        _index: index,
        _valid: errors.length === 0,
        _errors: errors,
      }
    })
  }, [records, requiredFields])

  // Get all unique columns from records
  const columns = useMemo(() => {
    const columnSet = new Set<string>()
    for (const record of records) {
      Object.keys(record).forEach((key) => columnSet.add(key))
    }
    return Array.from(columnSet).filter((col) => !col.startsWith('_'))
  }, [records])

  // Statistics
  const stats = useMemo(() => {
    const valid = processedRecords.filter((r) => r._valid).length
    const invalid = processedRecords.length - valid
    const selected = selectedIndices.size
    return { valid, invalid, total: processedRecords.length, selected }
  }, [processedRecords, selectedIndices])

  // Toggle selection
  const toggleSelection = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  // Select all valid
  const selectAllValid = useCallback(() => {
    const validIndices = processedRecords.filter((r) => r._valid).map((r) => r._index)
    setSelectedIndices(new Set(validIndices))
  }, [processedRecords])

  // Select none
  const selectNone = useCallback(() => {
    setSelectedIndices(new Set())
  }, [])

  // Handle confirm
  const handleConfirm = useCallback(() => {
    const selectedRecords = processedRecords
      .filter((r) => selectedIndices.has(r._index))
      .map((r) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _index, _valid, _errors, ...rest } = r
        return rest
      })
    onConfirm(selectedRecords)
  }, [processedRecords, selectedIndices, onConfirm])

  // Format cell value for display
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  // Table columns configuration
  const tableColumns = useMemo(() => {
    const cols = [
      {
        key: '_select',
        header: '',
        width: '48px',
        render: (item: PreviewRecord) => (
          <Checkbox
            checked={selectedIndices.has(item._index)}
            onCheckedChange={() => toggleSelection(item._index)}
            disabled={!item._valid}
            aria-label={`Select row ${item._index + 1}`}
          />
        ),
      },
      {
        key: '_status',
        header: 'Status',
        width: '100px',
        render: (item: PreviewRecord) => (
          <Badge variant={item._valid ? 'default' : 'destructive'}>
            {item._valid ? 'Valid' : 'Invalid'}
          </Badge>
        ),
      },
      ...columns.map((col) => ({
        key: col,
        header: col,
        render: (item: PreviewRecord) => (
          <span
            className={cn(
              'block max-w-[200px] truncate',
              requiredFields.includes(col) && !item[col] && 'text-destructive'
            )}
            title={formatValue(item[col])}
          >
            {formatValue(item[col])}
          </span>
        ),
      })),
    ]
    return cols
  }, [columns, requiredFields, selectedIndices, toggleSelection])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Preview Data</CardTitle>
            <CardDescription>Review and select records to import</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAllValid}>
              Select All Valid ({stats.valid})
            </Button>
            <Button variant="outline" size="sm" onClick={selectNone}>
              Clear Selection
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="flex flex-wrap gap-4 rounded-lg bg-muted/50 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Total:</span>
            <Badge variant="secondary">{stats.total}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Valid:</span>
            <Badge variant="default">{stats.valid}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Invalid:</span>
            <Badge variant="destructive">{stats.invalid}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Selected:</span>
            <Badge variant="outline">{stats.selected}</Badge>
          </div>
        </div>

        {/* Table */}
        <VirtualizedTable
          items={processedRecords}
          columns={tableColumns}
          estimateSize={48}
          className="max-h-[400px]"
          getItemKey={(item) => item._index}
          onRowClick={(item) => {
            if (item._valid) toggleSelection(item._index)
          }}
        />

        {/* Error details for invalid records */}
        {stats.invalid > 0 && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <h4 className="mb-2 font-medium text-destructive">Validation Errors</h4>
            <ul className="space-y-1 text-sm">
              {processedRecords
                .filter((r) => !r._valid)
                .slice(0, 5)
                .map((r) => (
                  <li key={r._index} className="text-muted-foreground">
                    Row {r._index + 1}: {r._errors.join(', ')}
                  </li>
                ))}
              {stats.invalid > 5 && (
                <li className="text-muted-foreground">...and {stats.invalid - 5} more errors</li>
              )}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={stats.selected === 0}>
            Import {stats.selected} Records
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export type { PreviewRecord, PreviewTableProps }
