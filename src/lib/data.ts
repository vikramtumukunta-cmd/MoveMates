import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from './auth';
import { addDays, dayKey } from './dates';
import { supabase } from './supabase';
import type { Challenge, DailyStat, Friendship, LeaderboardRow, Profile } from './types';

let channelSeq = 0;

/** Re-run `onChange` whenever rows in `table` change (RLS limits what we receive). */
export function useRealtime(table: 'daily_stats' | 'friendships', onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-${++channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => cb.current())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table]);
}

function useLoader<T>(load: () => Promise<T>, initial: T, deps: unknown[]) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setData(await load());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, loading, error, reload };
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** The signed-in user's own history, newest last. */
export function useMyStats(days = 60) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const q = useLoader<DailyStat[]>(
    async () => {
      if (!uid) return [];
      return check(
        await supabase
          .from('daily_stats')
          .select('*')
          .eq('user_id', uid)
          .gte('day', dayKey(addDays(new Date(), -days)))
          .order('day'),
      );
    },
    [],
    [uid, days],
  );
  useRealtime('daily_stats', q.reload);
  return q;
}

export type FriendsState = { friends: Profile[]; incoming: Profile[]; outgoing: Profile[] };

export function useFriends() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const q = useLoader<FriendsState>(
    async () => {
      if (!uid) return { friends: [], incoming: [], outgoing: [] };
      const rows = check<Friendship[]>(
        await supabase.from('friendships').select('*').or(`requester.eq.${uid},addressee.eq.${uid}`),
      );
      const otherIds = rows.map((r) => (r.requester === uid ? r.addressee : r.requester));
      const profiles = otherIds.length
        ? check<Profile[]>(await supabase.from('profiles').select('*').in('id', otherIds))
        : [];
      const byId = new Map(profiles.map((p) => [p.id, p]));
      const out: FriendsState = { friends: [], incoming: [], outgoing: [] };
      for (const r of rows) {
        const other = byId.get(r.requester === uid ? r.addressee : r.requester);
        if (!other) continue;
        if (r.status === 'accepted') out.friends.push(other);
        else if (r.addressee === uid) out.incoming.push(other);
        else out.outgoing.push(other);
      }
      out.friends.sort((a, b) => a.display_name.localeCompare(b.display_name));
      return out;
    },
    { friends: [], incoming: [], outgoing: [] },
    [uid],
  );
  useRealtime('friendships', q.reload);
  return q;
}

export type TodayRow = { profile: Profile; steps: number; calories: number; updatedAt: string | null };

/** Today's numbers for me and every friend, highest steps first. Live. */
export function useTodayBoard(people: Profile[]) {
  const ids = people.map((p) => p.id).sort().join(',');
  const q = useLoader<TodayRow[]>(
    async () => {
      if (!ids) return [];
      const stats = check<DailyStat[]>(
        await supabase.from('daily_stats').select('*').eq('day', dayKey()).in('user_id', ids.split(',')),
      );
      const byUser = new Map(stats.map((s) => [s.user_id, s]));
      return people
        .map((p) => {
          const s = byUser.get(p.id);
          return { profile: p, steps: s?.steps ?? 0, calories: s?.active_calories ?? 0, updatedAt: s?.updated_at ?? null };
        })
        .sort((a, b) => b.steps - a.steps);
    },
    [],
    [ids],
  );
  useRealtime('daily_stats', q.reload);
  return q;
}

export function useChallenges() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useLoader<Challenge[]>(
    async () => {
      if (!uid) return [];
      return check(await supabase.from('challenges').select('*').order('end_date', { ascending: false }));
    },
    [],
    [uid],
  );
}

export function useChallenge(id: string) {
  const challenge = useLoader<Challenge | null>(
    async () => check(await supabase.from('challenges').select('*').eq('id', id).maybeSingle()),
    null,
    [id],
  );
  const board = useLoader<LeaderboardRow[]>(
    async () => {
      const rows = check<LeaderboardRow[]>(
        await supabase.rpc('challenge_leaderboard', { p_challenge: id, p_today: dayKey() }),
      );
      return rows.map((r) => ({
        ...r,
        total: Number(r.total),
        today_value: Number(r.today_value),
        days_won: Number(r.days_won),
      }));
    },
    [],
    [id],
  );
  useRealtime('daily_stats', board.reload);
  return { challenge, board };
}
