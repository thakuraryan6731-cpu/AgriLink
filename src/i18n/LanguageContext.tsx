import React, { createContext, useContext, useMemo, useState } from 'react';
import { Language, LANGUAGE_OPTIONS, translations } from './translations';

const STORAGE_KEY = 'agriLinkLanguage';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, variables?: Record<string, string>) => string;
  hasSavedPreference: boolean;
  languageLabel: string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const readLanguage = (): { language: Language; saved: boolean } => {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'hi' || stored === 'mr' || stored === 'en') return { language: stored, saved: true };
  return { language: 'en', saved: false };
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = readLanguage();
  const [language, setLanguageState] = useState<Language>(initial.language);
  const [hasSavedPreference, setHasSavedPreference] = useState(initial.saved);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    setHasSavedPreference(true);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    hasSavedPreference,
    languageLabel: LANGUAGE_OPTIONS.find((item) => item.value === language)?.label || 'English',
    t: (key, variables) => {
      const template = translations[language][key] || translations.en[key] || key;
      return Object.entries(variables || {}).reduce(
        (result, [name, replacement]) => result.replace(`{${name}}`, replacement),
        template,
      );
    },
  }), [language, hasSavedPreference]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
