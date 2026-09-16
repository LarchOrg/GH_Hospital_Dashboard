import React, { createContext, useState, useMemo, useCallback, useEffect } from 'react';
import en from '../locales/en.json';
import ta from '../locales/ta.json';

export const LanguageContext = createContext(null);

const STORAGE_KEY = 'hospitalDisplay.language';
const dictionaries = { en, ta };

/**
 * Resolves a dotted key path (e.g. "form.save") against a translation dictionary.
 */
function resolveKey(dictionary, key) {
  return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), dictionary);
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'en');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((lang) => {
    if (dictionaries[lang]) {
      setLanguageState(lang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'en' ? 'ta' : 'en'));
  }, []);

  const t = useCallback(
    (key) => {
      const dictionary = dictionaries[language] || dictionaries.en;
      const value = resolveKey(dictionary, key);
      if (value !== undefined) return value;
      // Fallback to English so the UI never shows a raw key.
      return resolveKey(dictionaries.en, key) || key;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
