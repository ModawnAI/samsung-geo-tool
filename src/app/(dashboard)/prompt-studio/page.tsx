'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/lib/i18n'
import { SpinnerGap } from '@phosphor-icons/react'
import type { User } from '@supabase/supabase-js'
import { StagePromptManager } from '@/components/settings/stage-prompt-manager'

export default function PromptStudioPage() {
  const router = useRouter()
  const supabase = createClient()
  const { t, language } = useTranslation()

  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      setIsLoading(false)
    }
    getUser()
  }, [supabase, router])

  const getAuthToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }, [supabase])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <SpinnerGap className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.promptStudio.title}</h1>
        <p className="text-muted-foreground mt-1">
          {t.promptStudio.subtitle}
        </p>
      </div>

      <StagePromptManager
        language={language}
        getAuthToken={getAuthToken}
      />
    </div>
  )
}
