import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { registerBackgroundSync } from './backgroundSync';
import { healthProvider } from './health';
import type { HealthStatus } from './health/types';
import { getLastSync, syncNow } from './sync';

type SyncState = {
  healthStatus: HealthStatus | 'checking';
  lastSync: string | null;
  syncing: boolean;
  lastError: string | null;
  sync: (force?: boolean) => Promise<void>;
  connect: () => Promise<boolean>;
};

const SyncContext = createContext<SyncState | null>(null);
const FOREGROUND_POLL_MS = 60_000;

export function SyncProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [healthStatus, setHealthStatus] = useState<SyncState['healthStatus']>('checking');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const sync = useCallback(async (force = false) => {
    setSyncing(true);
    try {
      const r = await syncNow({ force });
      if (r.ok) {
        setLastSync(r.at);
        setLastError(null);
      } else if (r.reason !== 'throttled') {
        setLastError(r.reason);
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await healthProvider.status();
      setHealthStatus(s);
      return s;
    } catch {
      setHealthStatus('unavailable');
      return 'unavailable' as const;
    }
  }, []);

  const connect = useCallback(async () => {
    const ok = await healthProvider.requestAccess().catch(() => false);
    const s = await refreshStatus();
    if (ok && s === 'ready') await sync(true);
    return ok;
  }, [refreshStatus, sync]);

  useEffect(() => {
    getLastSync().then(setLastSync);
  }, []);

  // While signed in: sync on open, on foreground, when the health store
  // reports new data (iOS), and every minute while the app is on screen.
  useEffect(() => {
    if (!enabled) return;
    let unsub: (() => void) | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;

    const start = async () => {
      const s = await refreshStatus();
      if (s !== 'ready') return;
      sync(true);
      unsub = healthProvider.subscribe?.(() => sync());
      healthProvider.enableBackgroundDelivery?.().catch(() => {});
      registerBackgroundSync().catch(() => {});
      timer = setInterval(() => {
        if (AppState.currentState === 'active') sync();
      }, FOREGROUND_POLL_MS);
    };
    start();

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshStatus().then((s) => {
          if (s === 'ready') sync();
        });
    });
    return () => {
      unsub?.();
      if (timer) clearInterval(timer);
      appSub.remove();
    };
  }, [enabled, refreshStatus, sync]);

  return (
    <SyncContext.Provider value={{ healthStatus, lastSync, syncing, lastError, sync, connect }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncState {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside SyncProvider');
  return ctx;
}
