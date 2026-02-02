'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service (not exposed to user)
    console.error('[App Error]', error.digest)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">오류가 발생했습니다</h1>
        <p className="text-muted-foreground">
          요청을 처리하는 중 문제가 발생했습니다.
        </p>
        <p className="text-sm text-muted-foreground">
          문제가 지속되면 관리자에게 문의하세요.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            참조 코드: {error.digest}
          </p>
        )}
        <button
          onClick={() => reset()}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
