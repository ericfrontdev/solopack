'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import en from '@/locales/en.json'
import fr from '@/locales/fr.json'
import { logger } from '@/lib/logger'

type Locale = 'en' | 'fr'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const messages: Record<Locale, Record<string, any>> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  en: en as Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fr: fr as Record<string, any>,
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')

  // Load locale from localStorage on mount, or from URL params
  useEffect(() => {
    // Check for lang in URL params (from landing page)
    const urlParams = new URLSearchParams(window.location.search)
    const urlLang = urlParams.get('lang')
    if (urlLang === 'en' || urlLang === 'fr') {
      localStorage.setItem('locale', urlLang)
      setLocaleState(urlLang)
      // Clean URL
      urlParams.delete('lang')
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)
      return
    }

    const savedLocale = localStorage.getItem('locale') as Locale | null
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'fr')) {
      setLocaleState(savedLocale)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
  }

  const t = (key: string): string => {
    const keys = key.split('.')
    let value: unknown = messages[locale]

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k]
      } else {
        logger.warn(`Translation key not found: ${key}`)
        return key
      }
    }

    return value as string
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider')
  }
  return context
}
