'use client'

import { useCallback, useState } from 'react'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToastState {
  toasts: Toast[]
}

let toastId = 0

const listeners: Set<(state: ToastState) => void> = new Set()
let memoryState: ToastState = { toasts: [] }

function dispatch(action: { type: 'ADD_TOAST'; toast: Toast } | { type: 'DISMISS_TOAST'; toastId: string }) {
  switch (action.type) {
    case 'ADD_TOAST':
      memoryState = {
        ...memoryState,
        toasts: [...memoryState.toasts, action.toast].slice(-5), // Keep last 5 toasts
      }
      break
    case 'DISMISS_TOAST':
      memoryState = {
        ...memoryState,
        toasts: memoryState.toasts.filter((t) => t.id !== action.toastId),
      }
      break
  }

  listeners.forEach((listener) => listener(memoryState))
}

function toast({
  title,
  description,
  variant = 'default',
}: {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}) {
  const id = `toast-${++toastId}`

  dispatch({
    type: 'ADD_TOAST',
    toast: { id, title, description, variant },
  })

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    dispatch({ type: 'DISMISS_TOAST', toastId: id })
  }, 5000)

  return {
    id,
    dismiss: () => dispatch({ type: 'DISMISS_TOAST', toastId: id }),
  }
}

function useToast() {
  const [state, setState] = useState<ToastState>(memoryState)

  const subscribe = useCallback(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])

  // Subscribe on mount
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useState(() => {
      subscribe()
    })
  }

  return {
    ...state,
    toast,
    dismiss: (toastId: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  }
}

export { useToast, toast }
export type { Toast, ToastState }
