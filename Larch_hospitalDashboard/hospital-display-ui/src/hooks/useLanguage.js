import { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';

/**
 * Convenience hook for accessing the current language, the translation
 * helper t(key), and functions to change the language.
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
