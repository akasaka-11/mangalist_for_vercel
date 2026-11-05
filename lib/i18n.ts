export type Language = 'kk' | 'ru' | 'en';

/** Order shown in the language switcher. */
export const LANGUAGES: { code: Language; short: string; name: string }[] = [
  { code: 'kk', short: 'ҚАЗ', name: 'Қазақша' },
  { code: 'ru', short: 'РУС', name: 'Русский' },
  { code: 'en', short: 'ENG', name: 'English' },
];

export const isLanguage = (value: unknown): value is Language =>
  value === 'kk' || value === 'ru' || value === 'en';

/** First visit: pick the browser's language if we support it, otherwise English. */
export function detectLanguage(): Language {
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split('-')[0];
    if (isLanguage(base)) return base;
  }
  return 'en';
}
