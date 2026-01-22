'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getProductImage } from '@/lib/product-images'
import { Check, CheckSquare, Square } from '@phosphor-icons/react'

interface ProductCardProps {
  product: {
    id: string
    name: string
    code_name: string | null
  }
  isSelected: boolean
  onSelect: () => void
  multiSelectMode?: boolean
}

export function ProductCard({ product, isSelected, onSelect, multiSelectMode = false }: ProductCardProps) {
  const imagePath = getProductImage(product.code_name)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative flex flex-col items-center p-2 rounded-lg border-2 transition-all',
        'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-transparent bg-muted/30'
      )}
    >
      {/* Selection indicator */}
      {multiSelectMode ? (
        <div className="absolute top-1 right-1">
          {isSelected ? (
            <CheckSquare className="h-5 w-5 text-primary" weight="fill" />
          ) : (
            <Square className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      ) : (
        isSelected && (
          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3 w-3 text-primary-foreground" weight="bold" />
          </div>
        )
      )}

      {/* Product Image */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-2">
        <Image
          src={imagePath}
          alt={product.name}
          fill
          className="object-contain"
          sizes="(max-width: 640px) 64px, 80px"
          unoptimized
          onError={(e) => {
            // Fallback to placeholder on error
            const target = e.target as HTMLImageElement
            target.src = '/products/placeholder.png'
          }}
        />
      </div>

      {/* Product Name */}
      <span
        className={cn(
          'text-xs text-center font-medium leading-tight line-clamp-2',
          isSelected ? 'text-primary' : 'text-foreground'
        )}
      >
        {product.name}
      </span>
    </button>
  )
}
