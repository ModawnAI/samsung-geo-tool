'use client'

/**
 * Minimal layout for fullscreen Prompt Refiner
 * No navigation sidebar - just a clean workspace
 */
export default function RefinerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
