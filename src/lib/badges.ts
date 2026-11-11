import { addDays, dayKey, parseDay } from './dates';
import type { DailyStat } from './types';

export type Badge = { id: string; emoji: string; name: string; hint: string; earned: boolean };

/** Consecutive days (ending today, or yesterday if today isn't done yet) at or above goal. */
export function currentStreak(stats: DailyStat[], goal: number, today = new Date()): number {
  const byDay = new Map(stats.map((s) => [s.day, s.steps]));
  let cursor = today;
  if ((byDay.get(dayKey(cursor)) ?? 0) < goal) cursor = addDays(cursor, -1);
  let n = 0;
  while ((byDay.get(dayKey(cursor)) ?? 0) >= goal) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function bestStreak(stats: DailyStat[], goal: number): number {
  const days = stats
    .filter((s) => s.steps >= goal)
    .map((s) => parseDay(s.day).getTime())
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = -Infinity;
  for (const t of days) {
    run = Math.round((t - prev) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

function bestWeek(stats: DailyStat[]): number {
  const byDay = new Map(stats.map((s) => [s.day, s.steps]));
  let best = 0;
  for (const s of stats) {
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += byDay.get(dayKey(addDays(parseDay(s.day), -i))) ?? 0;
    best = Math.max(best, sum);
  }
  return best;
}

export function computeBadges(stats: DailyStat[], goal: number): Badge[] {
  const maxSteps = Math.max(0, ...stats.map((s) => s.steps));
  const maxKcal = Math.max(0, ...stats.map((s) => s.active_calories));
  const streak = bestStreak(stats, goal);
  const week = bestWeek(stats);
  return [
    { id: 'goal', emoji: '🎯', name: 'On target', hint: 'Hit your daily goal', earned: maxSteps >= goal },
    { id: '10k', emoji: '🔟', name: '10K club', hint: '10,000 steps in a day', earned: maxSteps >= 10_000 },
    { id: '20k', emoji: '🚀', name: 'Rocket', hint: '20,000 steps in a day', earned: maxSteps >= 20_000 },
    { id: 's3', emoji: '🔥', name: 'Warming up', hint: '3-day goal streak', earned: streak >= 3 },
    { id: 's7', emoji: '⚡', name: 'Unstoppable', hint: '7-day goal streak', earned: streak >= 7 },
    { id: 's30', emoji: '👑', name: 'Legend', hint: '30-day goal streak', earned: streak >= 30 },
    { id: 'kcal', emoji: '💥', name: 'Burner', hint: '500 active kcal in a day', earned: maxKcal >= 500 },
    { id: 'week', emoji: '🏔️', name: 'Summit', hint: '70,000 steps in 7 days', earned: week >= 70_000 },
  ];
}
