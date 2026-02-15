'use client';
import React, { useState, useEffect, ReactNode, useCallback } from 'react';
import { I18nContext, type Language } from '@/lib/i18n';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from './theme-provider';
import { AuthProvider } from '@/contexts/auth';
import { FirebaseClientProvider } from '@/firebase/client-provider';

const translationsCache: Partial<Record<Language, Record<string, string>>> = {};

function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedLang = localStorage.getItem('language');
    const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
    const initialLang = (storedLang || browserLang) as Language;
    
    if (['en', 'hi', 'mr'].includes(initialLang)) {
        setLanguage(initialLang);
        if (typeof document !== 'undefined') document.documentElement.lang = initialLang;
    } else {
        setLanguage('en');
        if (typeof document !== 'undefined') document.documentElement.lang = 'en';
    }
  }, []);

  useEffect(() => {
    const loadTranslations = async (lang: Language) => {
      if (translationsCache[lang]) {
        setTranslations(translationsCache[lang]!);
        if (!isLoaded) setIsLoaded(true);
        return;
      }

      try {
        const response = await fetch(`/locales/${lang}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load ${lang}.json`);
        }
        const data = await response.json();
        translationsCache[lang] = data;
        setTranslations(data);
      } catch (error) {
        console.error(error);
        if (lang !== 'en') {
          await loadTranslations('en');
        }
      } finally {
        if (!isLoaded) setIsLoaded(true);
      }
    };
    
    loadTranslations(language);
  }, [language, isLoaded]);

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
  }, []);
  
  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    let translation = translations[key] || key;
    if (replacements) {
        Object.keys(replacements).forEach(rKey => {
            translation = translation.replace(`{${rKey}}`, String(replacements[rKey]));
        });
    }
    return translation;
  }, [translations]);

  if (!isLoaded) {
    return null;
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t, translations }}>
      {children}
    </I18nContext.Provider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="tanker-ledger-theme">
      <FirebaseClientProvider>
        <AuthProvider>
          <I18nProvider>
            {children}
            <Toaster />
          </I18nProvider>
        </AuthProvider>
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}
