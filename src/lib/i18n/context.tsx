'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Language, TranslationDictionary } from './types'
import { en } from './en'
import { ko } from './ko'

const translations: Record<Language, TranslationDictionary> = {
  en,
  ko,
}

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationDictionary
  isLoading: boolean
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const LANGUAGE_KEY = 'samsung-geo-tool-language'

interface I18nProviderProps {
  children: ReactNode
  defaultLanguage?: Language
}

export function I18nProvider({ children, defaultLanguage = 'ko' }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage)
  const [isLoading, setIsLoading] = useState(true)

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY) as Language | null
    if (savedLanguage && (savedLanguage === 'ko' || savedLanguage === 'en')) {
      setLanguageState(savedLanguage)
    }
    setIsLoading(false)
  }, [])

  // Save language preference when changed
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(LANGUAGE_KEY, lang)
    // Update HTML lang attribute
    document.documentElement.lang = lang
  }, [])

  // Get current translations
  const t = translations[language]

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Utility function to get nested translation value
export function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let result: unknown = obj

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key]
    } else {
      return path // Return the path if translation not found
    }
  }

  return typeof result === 'string' ? result : path
}

// Hook for getting translation by key path (e.g., 'common.loading')
export function useTranslation() {
  const { t, language, setLanguage, isLoading } = useI18n()

  const translate = useCallback((key: string, fallback?: string): string => {
    const value = getNestedValue(t as unknown as Record<string, unknown>, key)
    return value !== key ? value : (fallback || key)
  }, [t])

  return {
    t,
    translate,
    language,
    setLanguage,
    isLoading,
  }
}
