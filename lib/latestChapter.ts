import { MangaTitle } from '../types';

export interface LatestChapterInfo {
  latestChapter: number | null;
  url?: string;
}

/**
 * Asks our Vercel function (/api/latest-chapter) for the latest chapter of an
 * ongoing series. Returns null when the lookup itself failed (offline, server
 * error, or `npm run dev` which has no /api) so the caller can retry later.
 */
export async function fetchLatestChapter(m: MangaTitle, signal?: AbortSignal): Promise<LatestChapterInfo | null> {
  const titles = [m.titles.english, m.titles.romaji, m.titles.native, m.title]
    .filter((t): t is string => !!t && t.trim().length > 0);
  const unique = [...new Set(titles)].slice(0, 4);
  if (unique.length === 0) return { latestChapter: null };

  const query = unique.map((t) => `title=${encodeURIComponent(t)}`).join('&');
  try {
    const res = await fetch(`/api/latest-chapter?${query}`, { signal });
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null;
    const data = (await res.json()) as { latestChapter?: unknown; url?: unknown };
    return {
      latestChapter: typeof data.latestChapter === 'number' && data.latestChapter > 0 ? data.latestChapter : null,
      url: typeof data.url === 'string' ? data.url : undefined,
    };
  } catch {
    return null;
  }
}
