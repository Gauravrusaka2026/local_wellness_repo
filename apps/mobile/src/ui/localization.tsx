import type { Locale, MessageKey, MessageValues } from '@local-wellness/localization';
import { localeForIntl, translate } from '@local-wellness/localization';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const LOCALE_STORAGE_KEY = 'jagruksetu.locale';

export function normalizeLocale(value: unknown): Locale {
  return value === 'hi' || value === 'mr' ? value : 'en';
}

export interface LocalizationValue {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => Promise<void>;
  readonly t: (key: MessageKey, values?: MessageValues) => string;
  readonly formatDate: (value: Date | number | string) => string;
  readonly formatDateTime: (value: Date | number | string) => string;
}

const LocalizationContext = createContext<LocalizationValue | null>(null);

export const LocalizationProvider = ({ children }: Readonly<{ children: ReactNode }>) => {
  const [locale, setCurrentLocale] = useState<Locale>('en');

  useEffect(() => {
    let isCurrent = true;

    void SecureStore.getItemAsync(LOCALE_STORAGE_KEY)
      .then((storedLocale) => {
        if (isCurrent) setCurrentLocale(normalizeLocale(storedLocale));
      })
      .catch(() => {
        // English remains available when local preference storage is unavailable.
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const setLocale = useCallback(async (nextLocale: Locale): Promise<void> => {
    setCurrentLocale(nextLocale);
    try {
      await SecureStore.setItemAsync(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // The in-memory preference still applies for the current session.
    }
  }, []);

  const t = useCallback(
    (key: MessageKey, values?: MessageValues) => translate(locale, key, values),
    [locale],
  );

  const value = useMemo<LocalizationValue>(() => {
    const intlLocale = localeForIntl(locale);
    return {
      formatDate: (dateValue) =>
        new Intl.DateTimeFormat(intlLocale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(new Date(dateValue)),
      formatDateTime: (dateValue) =>
        new Intl.DateTimeFormat(intlLocale, {
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          month: 'short',
        }).format(new Date(dateValue)),
      locale,
      setLocale,
      t,
    };
  }, [locale, setLocale, t]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
};

export function useLocalization(): LocalizationValue {
  const value = useContext(LocalizationContext);
  if (value === null) {
    throw new Error('useLocalization must be used within LocalizationProvider');
  }
  return value;
}
