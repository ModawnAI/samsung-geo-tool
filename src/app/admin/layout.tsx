import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'admin@admin.com'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check authentication
  if (!user) {
    redirect('/login')
  }

  // Check admin authorization
  if (user.email !== ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
                ← Dashboard
              </a>
              <span className="text-sm text-muted-foreground">/</span>
              <span className="font-semibold">Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                Admin Only
              </span>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  )
}
