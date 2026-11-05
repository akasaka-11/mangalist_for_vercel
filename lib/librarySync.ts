// Pure helpers for syncing the library between this device and Supabase.

import { MangaStatus, MangaTitle } from '../types';

/** Shape of a row in public.library_entries. */
export interface LibraryRow {
  user_id: string;
  manga_id: string;
  title: string;
  titles: MangaTitle['titles'];
  description: string;
  cover_image: string;
  total_chapters: number;
  current_chapter: number;
  status: MangaStatus;
  rating: string;
  is_adult: boolean;
  last_updated: string;
  latest_chapter: number | null;
  latest_chapter_url: string | null;
  latest_chapter_checked_at: string | null;
  updated_at: string;
}

const STATUSES = new Set<string>(Object.values(MangaStatus));
const MAX_DESCRIPTION = 20000;

export function toRow(userId: string, m: MangaTitle): LibraryRow {
  return {
    user_id: userId,
    manga_id: m.id,
    title: m.title.slice(0, 500),
    titles: m.titles ?? {},
    description: (m.description ?? '').slice(0, MAX_DESCRIPTION),
    cover_image: m.coverImage ?? '',
    total_chapters: Math.max(0, Math.floor(m.totalChapters || 0)),
    current_chapter: Math.max(0, Math.floor(m.currentChapter || 0)),
    status: m.status,
    rating: String(m.rating ?? 'N/A').slice(0, 16),
    is_adult: !!m.isAdult,
    last_updated: m.lastUpdated ?? '',
    latest_chapter: m.latestChapter ?? null,
    latest_chapter_url: m.latestChapterUrl ?? null,
    latest_chapter_checked_at: m.latestChapterCheckedAt ? new Date(m.latestChapterCheckedAt).toISOString() : null,
    updated_at: new Date(m.updatedAt ?? Date.now()).toISOString(),
  };
}

export function fromRow(r: LibraryRow): MangaTitle {
  const checkedAt = r.latest_chapter_checked_at ? Date.parse(r.latest_chapter_checked_at) : NaN;
  const updatedAt = Date.parse(r.updated_at);
  return {
    id: r.manga_id,
    title: r.title,
    titles: r.titles ?? {},
    description: r.description,
    coverImage: r.cover_image,
    totalChapters: r.total_chapters,
    currentChapter: r.current_chapter,
    status: STATUSES.has(r.status) ? r.status : MangaStatus.PLAN_TO_READ,
    rating: r.rating,
    isAdult: r.is_adult,
    lastUpdated: r.last_updated,
    latestChapter: r.latest_chapter === null ? null : Number(r.latest_chapter),
    latestChapterUrl: r.latest_chapter_url ?? undefined,
    latestChapterCheckedAt: Number.isFinite(checkedAt) ? checkedAt : undefined,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : undefined,
  };
}

/** Everything that gets stored remotely, except the timestamp. Used to detect what changed. */
export function fingerprint(m: MangaTitle): string {
  const { updated_at: _ignored, user_id: _user, ...rest } = toRow('', m);
  return JSON.stringify(rest);
}

export interface MergeInput {
  local: MangaTitle[];
  remote: MangaTitle[];
  /** Ids this device has seen on the server before. */
  knownRemoteIds: ReadonlySet<string>;
  /** Ids deleted on this device but not yet deleted on the server. */
  pendingDeletes: ReadonlySet<string>;
}

/**
 * Combines this device's copy with the server copy:
 * - in both: the newer `updatedAt` wins;
 * - only on the server: added on another device -> keep;
 * - only here and never seen on the server: added offline -> keep (will be uploaded);
 * - only here but seen on the server before: deleted on another device -> drop;
 * - deleted here and still pending: stays deleted.
 * Order: local order first, then new remote items.
 */
export function mergeLibrary({ local, remote, knownRemoteIds, pendingDeletes }: MergeInput): MangaTitle[] {
  const remoteById = new Map(remote.map((m) => [m.id, m]));
  const result: MangaTitle[] = [];
  const seen = new Set<string>();

  for (const l of local) {
    if (pendingDeletes.has(l.id) || seen.has(l.id)) continue;
    seen.add(l.id);
    const r = remoteById.get(l.id);
    if (r) result.push((l.updatedAt ?? 0) > (r.updatedAt ?? 0) ? l : r);
    else if (!knownRemoteIds.has(l.id)) result.push(l);
  }
  for (const r of remote) {
    if (seen.has(r.id) || pendingDeletes.has(r.id)) continue;
    seen.add(r.id);
    result.push(r);
  }
  return result;
}

/** What has to be sent to the server so it matches `list`. */
export function diffForPush(list: MangaTitle[], synced: ReadonlyMap<string, string>): { upserts: MangaTitle[]; deletes: string[] } {
  const ids = new Set(list.map((m) => m.id));
  return {
    upserts: list.filter((m) => synced.get(m.id) !== fingerprint(m)),
    deletes: [...synced.keys()].filter((id) => !ids.has(id)),
  };
}
