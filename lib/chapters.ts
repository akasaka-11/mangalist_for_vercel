import { MangaTitle } from '../types';

/** How far past the latest known chapter of an ongoing series you may mark progress. */
export const CHAPTER_MARGIN = 7;
/** Fallback upper bound when nothing is known about the series. */
export const NO_LIMIT = 99999;

const RECHECK_AFTER_MS = 24 * 60 * 60 * 1000;

/** Highest chapter the user may set for this title. */
export function chapterLimit(m: Pick<MangaTitle, 'totalChapters' | 'latestChapter'>): number {
  if (m.totalChapters > 0) return m.totalChapters;
  if (m.latestChapter && m.latestChapter > 0) return Math.floor(m.latestChapter) + CHAPTER_MARGIN;
  return NO_LIMIT;
}

export function clampChapter(m: Pick<MangaTitle, 'totalChapters' | 'latestChapter'>, chapter: number): number {
  const clean = Number.isFinite(chapter) ? Math.floor(chapter) : 0;
  return Math.min(Math.max(0, clean), chapterLimit(m));
}

/** Ongoing series whose latest chapter is unknown or older than a day. */
export function needsLatestChapterCheck(m: MangaTitle, now = Date.now()): boolean {
  if (m.totalChapters > 0) return false;
  return !m.latestChapterCheckedAt || now - m.latestChapterCheckedAt > RECHECK_AFTER_MS;
}
