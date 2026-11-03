import type { Language } from '../i18n/translations.js';

const localeByLanguage: Record<Language, string> = {
  en: 'en-IN',
  gu: 'gu-IN',
  hi: 'hi-IN'
};

const getCurrentLanguage = (): Language => {
  if (typeof localStorage === 'undefined') return 'en';
  const savedLanguage = localStorage.getItem('swachh_setu_lang');
  return savedLanguage === 'gu' || savedLanguage === 'hi' ? savedLanguage : 'en';
};

const toDate = (value: string | number | Date | null | undefined): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value: string | number | Date | null | undefined, lang = getCurrentLanguage()): string => {
  const date = toDate(value);
  return date
    ? new Intl.DateTimeFormat(localeByLanguage[lang], {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(date)
    : '—';
};

export const formatDateTime = (value: string | number | Date | null | undefined, lang = getCurrentLanguage()): string => {
  const date = toDate(value);
  return date
    ? new Intl.DateTimeFormat(localeByLanguage[lang], {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    : '—';
};

export const formatTime = (value: string | number | Date | null | undefined, lang = getCurrentLanguage()): string => {
  const date = toDate(value);
  return date
    ? new Intl.DateTimeFormat(localeByLanguage[lang], {
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    : '—';
};
