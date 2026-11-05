// Keeps the library in sync with Supabase (public.library_entries).
//
// - The list on this device (localStorage) is shown immediately and keeps
//   working offline.
// - On sign-in, when the tab becomes visible again, and when the network comes
//   back, we pull the server copy and merge it (see mergeLibrary).
// - Local changes are pushed to the server shortly after they happen.

import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { MangaTitle, User } from '../types';
import { diffForPush, fingerprint, mergeLibrary } from '../lib/librarySync';
import {
  deleteRemote,
  fetchRemoteLibrary,
  loadKnownRemoteIds,
  loadPendingDeletes,
  saveKnownRemoteIds,
  savePendingDeletes,
  SyncError,
  upsertRemote,
} from '../lib/libraryRemote';
import { supabase } from '../lib/supabase';

export type SyncState = 'disabled' | 'syncing' | 'synced' | 'offline' | 'notSetUp' | 'error';

const PUSH_DELAY_MS = 1000;
const MIN_PULL_INTERVAL_MS = 30_000;

const errorState = (e: unknown): SyncState => {
  if (e instanceof SyncError) return e.kind === 'offline' ? 'offline' : e.kind === 'notSetUp' ? 'notSetUp' : 'error';
  console.error('Library sync failed', e);
  return navigator.onLine ? 'error' : 'offline';
};

/** Remember a deletion on this device so it reaches the server even if we are offline right now. */
export function recordLocalDelete(userId: string, mangaId: string): void {
  const pending = loadPendingDeletes(userId);
  pending.add(mangaId);
  savePendingDeletes(userId, pending);
}

export function useLibrarySync(
  user: User | null,
  list: MangaTitle[],
  setList: Dispatch<SetStateAction<MangaTitle[]>>,
): SyncState {
  const userId = user?.id ?? null;
  const [state, setState] = useState<SyncState>(supabase ? 'syncing' : 'disabled');

  const listRef = useRef(list);
  listRef.current = list;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  /** Fingerprints of what the server has, by manga id. null until the first successful pull. */
  const syncedRef = useRef<Map<string, string> | null>(null);
  const busyRef = useRef(false);
  const lastPullRef = useRef(0);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback(async () => {
    const uid = userIdRef.current;
    const synced = syncedRef.current;
    if (!uid || !synced || busyRef.current) return;

    const pending = loadPendingDeletes(uid);
    const { upserts, deletes } = diffForPush(listRef.current, synced);
    deletes.forEach((id) => pending.add(id));
    if (upserts.length === 0 && pending.size === 0) {
      setState('synced');
      return;
    }

    busyRef.current = true;
    setState('syncing');
    try {
      if (pending.size > 0) {
        savePendingDeletes(uid, pending);
        await deleteRemote(uid, [...pending]);
        savePendingDeletes(uid, []);
        pending.forEach((id) => synced.delete(id));
      }
      await upsertRemote(uid, upserts);
      if (userIdRef.current !== uid) return;
      upserts.forEach((m) => synced.set(m.id, fingerprint(m)));
      saveKnownRemoteIds(uid, synced.keys());
      setState('synced');
    } catch (e) {
      if (userIdRef.current === uid) setState(errorState(e));
      return;
    } finally {
      busyRef.current = false;
    }

    // Something changed while we were uploading? Send that too.
    const again = diffForPush(listRef.current, synced);
    if (again.upserts.length > 0 || again.deletes.length > 0) schedulePush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const schedulePush = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => void push(), PUSH_DELAY_MS);
  }, [push]);

  const pull = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid || !supabase || busyRef.current) return;
    busyRef.current = true;
    lastPullRef.current = Date.now();
    setState('syncing');
    try {
      const pending = loadPendingDeletes(uid);
      if (pending.size > 0) {
        await deleteRemote(uid, [...pending]);
        savePendingDeletes(uid, []);
      }
      const remote = (await fetchRemoteLibrary(uid)).filter((m) => !pending.has(m.id));
      if (userIdRef.current !== uid) return;

      const merged = mergeLibrary({
        local: listRef.current,
        remote,
        knownRemoteIds: loadKnownRemoteIds(uid),
        pendingDeletes: pending,
      });
      syncedRef.current = new Map(remote.map((m) => [m.id, fingerprint(m)]));
      saveKnownRemoteIds(uid, syncedRef.current.keys());
      setList(merged);
      setState('synced');
    } catch (e) {
      if (userIdRef.current === uid) setState(errorState(e));
    } finally {
      busyRef.current = false;
    }
    // Upload whatever this device had that the server didn't.
    if (syncedRef.current) schedulePush();
  }, [setList, schedulePush]);

  // Sign-in / account switch: start from scratch and pull.
  useEffect(() => {
    syncedRef.current = null;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    if (!userId) {
      setState(supabase ? 'synced' : 'disabled');
      return;
    }
    void pull();
  }, [userId, pull]);

  // Local change -> push soon (only after the first pull, so we never upload a stale list).
  useEffect(() => {
    if (userId && syncedRef.current) schedulePush();
  }, [list, userId, schedulePush]);

  // Coming back to the tab or back online -> pull changes made on other devices.
  useEffect(() => {
    if (!userId) return;
    const maybePull = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastPullRef.current < MIN_PULL_INTERVAL_MS) return;
      void pull();
    };
    const onOnline = () => void pull();
    document.addEventListener('visibilitychange', maybePull);
    window.addEventListener('focus', maybePull);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', maybePull);
      window.removeEventListener('focus', maybePull);
      window.removeEventListener('online', onOnline);
    };
  }, [userId, pull]);

  useEffect(() => () => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
  }, []);

  return state;
}
