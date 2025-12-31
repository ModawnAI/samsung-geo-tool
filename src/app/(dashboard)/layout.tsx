import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/features/dashboard-nav'
import { MobileBottomNav } from '@/components/features/mobile-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardNav user={user} />
      <main className="container mx-auto py-6 px-4 pb-20 md:pb-6">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  )
}
