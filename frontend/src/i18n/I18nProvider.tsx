import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { resources } from './resources'

type Lang = 'zh' | 'en'

type I18nContextType = {
  language: Lang
  setLanguage: (lang: Lang) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

const STORAGE_KEY = 'app_lang'

function resolveKey(obj: any, keyPath: string): any {
  return keyPath.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj)
}

function formatParams(str: string, params?: Record<string, string | number>): string {
  if (!params) return str
  return Object.keys(params).reduce((acc, k) => acc.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(params[k])), str)
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Lang>(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Lang | null) || null
    if (saved === 'zh' || saved === 'en') return saved
    const nav = navigator.language.toLowerCase()
    return nav.startsWith('zh') ? 'zh' : 'en'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
  }, [language])

  const setLanguage = (lang: Lang) => setLanguageState(lang)

  const t = useMemo(
    () =>
      (key: string, params?: Record<string, string | number>) => {
        const pack = resources[language]
        const fallback = resources.zh
        const raw = resolveKey(pack, key) ?? resolveKey(fallback, key) ?? key
        const str = typeof raw === 'string' ? raw : key
        return formatParams(str, params)
      },
    [language],
  )

  const value: I18nContextType = { language, setLanguage, t }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider')
  return ctx
}