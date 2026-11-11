import AsyncStorage from '@react-native-async-storage/async-storage';

import { healthProvider } from './health';
import { supabase } from './supabase';

const LAST_SYNC_KEY = 'movemates:lastSync';
const BACKFILLED_KEY = 'movemates:backfilled';
const MIN_GAP_MS = 15_000;

let inFlight: Promise<SyncResult> | null = null;
let lastRun = 0;

export type SyncResult =
  | { ok: true; at: string; todaySteps: number; todayCalories: number }
  | { ok: false; reason: string };

/**
 * Reads recent daily totals from the phone's health store and upserts them.
 * Safe to call often: concurrent calls share one run and rapid calls are skipped.
 */
export function syncNow(opts: { force?: boolean } = {}): Promise<SyncResult> {
  if (inFlight) return inFlight;
  if (!opts.force && Date.now() - lastRun < MIN_GAP_MS) {
    return Promise.resolve({ ok: false, reason: 'throttled' });
  }
  inFlight = run().finally(() => {
    inFlight = null;
    lastRun = Date.now();
  });
  return inFlight;
}

async function run(): Promise<SyncResult> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return { ok: false, reason: 'signed_out' };

  if ((await healthProvider.status()) !== 'ready') return { ok: false, reason: 'no_health_access' };

  // First sync pulls 30 days so streaks and badges have history.
  const backfilled = (await AsyncStorage.getItem(BACKFILLED_KEY)) === userId;
  const days = await healthProvider.readDays(backfilled ? 3 : 30);
  if (days.length === 0) return { ok: false, reason: 'no_data' };

  const now = new Date().toISOString();
  const rows = days.map((d) => ({
    user_id: userId,
    day: d.day,
    steps: Math.min(d.steps, 199_999),
    active_calories: Math.min(d.activeCalories, 19_999),
    source: healthProvider.name,
    updated_at: now,
  }));
  const { error } = await supabase.from('daily_stats').upsert(rows, { onConflict: 'user_id,day' });
  if (error) return { ok: false, reason: error.message };

  if (!backfilled) await AsyncStorage.setItem(BACKFILLED_KEY, userId);
  await AsyncStorage.setItem(LAST_SYNC_KEY, now);
  const today = days[days.length - 1];
  return { ok: true, at: now, todaySteps: today.steps, todayCalories: today.activeCalories };
}

export async function getLastSync(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
}
