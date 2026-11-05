// Vercel serverless function: GET /api/latest-chapter?title=...&title=...
//
// AniList has no chapter count for ongoing series, so we look the series up on
// MangaUpdates (which has `latest_chapter`) by title. MangaUpdates doesn't allow
// browser requests from other sites (no CORS), hence this small proxy.
// Responses are cached on Vercel's CDN for a day.

const MU_API = 'https://api.mangaupdates.com/v1';
const MAX_TITLES = 4;
const MAX_TITLE_LENGTH = 200;
const CANDIDATES_PER_SEARCH = 5;
const REQUEST_TIMEOUT_MS = 6000;

interface MuSearchResult {
  record: { series_id: number; title: string; type?: string };
}

interface MuSeries {
  series_id: number;
  title: string;
  type?: string;
  url?: string;
  latest_chapter?: number | null;
  associated?: { title: string }[];
}

export interface LatestChapterResponse {
  latestChapter: number | null;
  matchedTitle?: string;
  url?: string;
}

/** Lowercase, drop punctuation/spaces so "Time-Limited Genius Dark Knight" == "time limited genius dark knight". */
export function normalizeTitle(title: string): string {
  return title.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, '');
}

const isNovel = (type?: string) => !!type && /novel/i.test(type);

async function muFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MU_API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'MyMangaList (chapter-limit proxy)', ...init?.headers },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`MangaUpdates ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

/** Finds the MangaUpdates series whose title or alternative title exactly matches one of ours. */
export async function findLatestChapter(titles: string[]): Promise<LatestChapterResponse> {
  const wanted = new Set(titles.map(normalizeTitle).filter(Boolean));
  const checked = new Set<number>();

  for (const title of titles) {
    const search = await muFetch<{ results?: MuSearchResult[] }>('/series/search', {
      method: 'POST',
      body: JSON.stringify({ search: title, perpage: CANDIDATES_PER_SEARCH }),
    });
    const candidates = (search.results ?? [])
      .map((r) => r.record)
      .filter((r) => !isNovel(r.type) && !checked.has(r.series_id));

    // Cheap check first: main title matches.
    const direct = candidates.find((c) => wanted.has(normalizeTitle(c.title)));
    const ordered = direct ? [direct, ...candidates.filter((c) => c !== direct)] : candidates;

    for (const candidate of ordered) {
      checked.add(candidate.series_id);
      const series = await muFetch<MuSeries>(`/series/${candidate.series_id}`);
      if (isNovel(series.type)) continue;
      const names = [series.title, ...(series.associated ?? []).map((a) => a.title)];
      if (!names.some((n) => wanted.has(normalizeTitle(n)))) continue;
      const latest = typeof series.latest_chapter === 'number' && series.latest_chapter > 0 ? series.latest_chapter : null;
      return { latestChapter: latest, matchedTitle: series.title, url: series.url };
    }
  }
  return { latestChapter: null };
}

function json(body: unknown, status: number, cacheSeconds: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheSeconds > 0
        ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 6}`
        : 'no-store',
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const titles = [...new Set(params.getAll('title').map((t) => t.trim()).filter(Boolean))].slice(0, MAX_TITLES);

  if (titles.length === 0 || titles.some((t) => t.length > MAX_TITLE_LENGTH)) {
    return json({ error: 'Pass 1-4 "title" parameters, each up to 200 characters.' }, 400, 0);
  }

  try {
    return json(await findLatestChapter(titles), 200, 60 * 60 * 24);
  } catch (e) {
    console.error(e);
    return json({ error: 'Upstream lookup failed' }, 502, 0);
  }
}
