'use client'

import * as React from 'react'
import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface FieldMapping {
  sourceField: string
  targetField: string
  transform?: 'none' | 'lowercase' | 'uppercase' | 'trim' | 'split'
}

interface MappingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceFields: string[]
  targetFields: {
    name: string
    required: boolean
    description?: string
  }[]
  onConfirm: (mappings: FieldMapping[]) => void
  initialMappings?: FieldMapping[]
}

const TRANSFORMS = [
  { value: 'none', label: 'No transform' },
  { value: 'lowercase', label: 'To lowercase' },
  { value: 'uppercase', label: 'To uppercase' },
  { value: 'trim', label: 'Trim whitespace' },
  { value: 'split', label: 'Split by |' },
] as const

export function MappingDialog({
  open,
  onOpenChange,
  sourceFields,
  targetFields,
  onConfirm,
  initialMappings = [],
}: MappingDialogProps) {
  // Initialize mappings with auto-matching by name
  const [mappings, setMappings] = useState<Map<string, FieldMapping>>(() => {
    const map = new Map<string, FieldMapping>()

    // First, apply initial mappings
    for (const mapping of initialMappings) {
      map.set(mapping.targetField, mapping)
    }

    // Then, auto-match by name similarity for unmapped fields
    for (const target of targetFields) {
      if (map.has(target.name)) continue

      // Try exact match
      const exactMatch = sourceFields.find(
        (s) => s.toLowerCase() === target.name.toLowerCase()
      )
      if (exactMatch) {
        map.set(target.name, {
          sourceField: exactMatch,
          targetField: target.name,
          transform: 'none',
        })
        continue
      }

      // Try partial match
      const partialMatch = sourceFields.find(
        (s) =>
          s.toLowerCase().includes(target.name.toLowerCase()) ||
          target.name.toLowerCase().includes(s.toLowerCase())
      )
      if (partialMatch) {
        map.set(target.name, {
          sourceField: partialMatch,
          targetField: target.name,
          transform: 'none',
        })
      }
    }

    return map
  })

  // Get used source fields
  const usedSourceFields = useMemo(() => {
    return new Set(Array.from(mappings.values()).map((m) => m.sourceField))
  }, [mappings])

  // Check if all required fields are mapped
  const allRequiredMapped = useMemo(() => {
    return targetFields
      .filter((f) => f.required)
      .every((f) => mappings.has(f.name) && mappings.get(f.name)?.sourceField)
  }, [targetFields, mappings])

  // Update mapping for a target field
  const updateMapping = useCallback(
    (targetField: string, sourceField: string | null, transform?: string) => {
      setMappings((prev) => {
        const next = new Map(prev)
        if (sourceField) {
          next.set(targetField, {
            sourceField,
            targetField,
            transform: (transform as FieldMapping['transform']) || 'none',
          })
        } else {
          next.delete(targetField)
        }
        return next
      })
    },
    []
  )

  // Handle confirm
  const handleConfirm = useCallback(() => {
    const mappingArray = Array.from(mappings.values())
    onConfirm(mappingArray)
    onOpenChange(false)
  }, [mappings, onConfirm, onOpenChange])

  // Auto-map all fields by name
  const autoMapAll = useCallback(() => {
    setMappings((prev) => {
      const next = new Map(prev)

      for (const target of targetFields) {
        if (next.has(target.name) && next.get(target.name)?.sourceField) continue

        const match = sourceFields.find(
          (s) =>
            s.toLowerCase() === target.name.toLowerCase() ||
            s.toLowerCase().includes(target.name.toLowerCase()) ||
            target.name.toLowerCase().includes(s.toLowerCase())
        )

        if (match) {
          next.set(target.name, {
            sourceField: match,
            targetField: target.name,
            transform: 'none',
          })
        }
      }

      return next
    })
  }, [sourceFields, targetFields])

  // Clear all mappings
  const clearAll = useCallback(() => {
    setMappings(new Map())
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Map Fields</DialogTitle>
          <DialogDescription>
            Match source columns to target fields. Required fields must be mapped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={autoMapAll}>
              Auto-Map
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          </div>

          {/* Field mappings */}
          <div className="space-y-4">
            {targetFields.map((target) => {
              const mapping = mappings.get(target.name)
              const isMapped = mapping?.sourceField

              return (
                <div key={target.name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        target.required && !isMapped && 'text-destructive'
                      )}
                    >
                      {target.name}
                    </span>
                    {target.required && (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    )}
                    {isMapped && (
                      <Badge variant="default" className="text-xs">
                        Mapped
                      </Badge>
                    )}
                  </div>

                  {target.description && (
                    <p className="text-xs text-muted-foreground">{target.description}</p>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Select
                      value={mapping?.sourceField || 'none'}
                      onValueChange={(value) =>
                        updateMapping(
                          target.name,
                          value === 'none' ? null : value,
                          mapping?.transform
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Not mapped --</SelectItem>
                        {sourceFields.map((field) => (
                          <SelectItem
                            key={field}
                            value={field}
                            disabled={usedSourceFields.has(field) && mapping?.sourceField !== field}
                          >
                            {field}
                            {usedSourceFields.has(field) && mapping?.sourceField !== field && (
                              <span className="ml-2 text-xs text-muted-foreground">(in use)</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={mapping?.transform || 'none'}
                      onValueChange={(value) =>
                        updateMapping(target.name, mapping?.sourceField || null, value)
                      }
                      disabled={!isMapped}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Transform" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSFORMS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Unmapped source fields */}
          {sourceFields.filter((f) => !usedSourceFields.has(f)).length > 0 && (
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="mb-2 text-sm font-medium">Unmapped Source Fields</h4>
              <div className="flex flex-wrap gap-2">
                {sourceFields
                  .filter((f) => !usedSourceFields.has(f))
                  .map((field) => (
                    <Badge key={field} variant="secondary">
                      {field}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!allRequiredMapped}>
            Confirm Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type { FieldMapping, MappingDialogProps }
