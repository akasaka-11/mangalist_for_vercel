// Supabase calls for public.library_entries. RLS on the table limits every
// query to the signed-in user's rows; we still filter by user_id explicitly.

import { MangaTitle } from '../types';
import { fromRow, LibraryRow, toRow } from './librarySync';
import { readJson, writeJson } from './storage';
import { supabase } from './supabase';

const TABLE = 'library_entries';

export type SyncErrorKind = 'offline' | 'notSetUp' | 'failed';

export class SyncError extends Error {
  constructor(public kind: SyncErrorKind, message: string) {
    super(message);
  }
}

function toSyncError(error: { code?: string; message: string }): SyncError {
  // 42P01 / PGRST205: table does not exist (SQL migration not run yet).
  // 42501: permission denied (grants missing).
  if (error.code === '42P01' || error.code === 'PGRST205' || error.code === '42501') {
    return new SyncError('notSetUp', error.message);
  }
  if (!navigator.onLine || /fetch|network/i.test(error.message)) return new SyncError('offline', error.message);
  return new SyncError('failed', error.message);
}

function client() {
  if (!supabase) throw new SyncError('notSetUp', 'Supabase is not configured');
  return supabase;
}

export async function fetchRemoteLibrary(userId: string): Promise<MangaTitle[]> {
  const { data, error } = await client().from(TABLE).select('*').eq('user_id', userId).order('created_at');
  if (error) throw toSyncError(error);
  return (data as LibraryRow[]).map(fromRow);
}

export async function upsertRemote(userId: string, items: MangaTitle[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await client().from(TABLE).upsert(items.map((m) => toRow(userId, m)), { onConflict: 'user_id,manga_id' });
  if (error) throw toSyncError(error);
}

export async function deleteRemote(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await client().from(TABLE).delete().eq('user_id', userId).in('manga_id', ids);
  if (error) throw toSyncError(error);
}

// ---- small per-user bookkeeping kept on this device ----

const knownKey = (userId: string) => `mml.sync.known.${userId}`;
const deletesKey = (userId: string) => `mml.sync.deletes.${userId}`;

const readSet = (key: string) => {
  const v = readJson<unknown>(key, []);
  return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
};

/** Ids this device has seen on the server (to tell "deleted elsewhere" from "added offline"). */
export const loadKnownRemoteIds = (userId: string) => readSet(knownKey(userId));
export const saveKnownRemoteIds = (userId: string, ids: Iterable<string>) => writeJson(knownKey(userId), [...ids]);

/** Ids deleted on this device that the server doesn't know about yet. */
export const loadPendingDeletes = (userId: string) => readSet(deletesKey(userId));
export const savePendingDeletes = (userId: string, ids: Iterable<string>) => writeJson(deletesKey(userId), [...ids]);
