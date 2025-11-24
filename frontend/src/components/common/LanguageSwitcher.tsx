import React from 'react'
import { useI18n } from '../../i18n/I18nProvider'

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { language, setLanguage, t } = useI18n()

  return (
    <div className={className}>
      <label className="sr-only" htmlFor="lang-select">
        {t('languages.label')}
      </label>
      <select
        id="lang-select"
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'zh' | 'en')}
        className="rounded-md border px-2 py-1 text-sm bg-white dark:bg-gray-800"
        aria-label={t('languages.label')}
      >
        <option value="zh">{t('languages.zh')}</option>
        <option value="en">{t('languages.en')}</option>
      </select>
    </div>
  )
}

export default LanguageSwitcher