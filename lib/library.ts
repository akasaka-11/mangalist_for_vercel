// Per-user manga library in localStorage.

import { MangaTitle } from '../types';
import { readJson, removeKey, writeJson } from './storage';

const LEGACY_LIBRARY_KEY = 'manga-list';
const libraryKey = (userId: string) => `mml.library.${userId}`;

export function loadLibrary(userId: string): MangaTitle[] {
  const key = libraryKey(userId);
  const saved = readJson<unknown>(key, null);
  if (Array.isArray(saved)) return saved as MangaTitle[];

  // The old app kept one shared list for everybody. Hand it to the first
  // account that signs in on this browser so nobody loses their library.
  const legacy = readJson<unknown>(LEGACY_LIBRARY_KEY, null);
  if (Array.isArray(legacy)) {
    writeJson(key, legacy);
    removeKey(LEGACY_LIBRARY_KEY);
    return legacy as MangaTitle[];
  }
  return [];
}

export function saveLibrary(userId: string, list: MangaTitle[]): void {
  writeJson(libraryKey(userId), list);
}
