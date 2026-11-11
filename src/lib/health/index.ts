// Web / fallback provider. There is no health store on the web, so this
// generates stable demo numbers that let you preview the app in a browser.
import { addDays, dayKey, startOfDay } from '../dates';
import type { DayTotals, HealthProvider } from './types';

function seeded(key: string): number {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000;
}

export const healthProvider: HealthProvider = {
  name: 'Demo data',
  feeds: 'generated sample numbers (web preview only)',
  async status() {
    return 'ready';
  },
  async requestAccess() {
    return true;
  },
  async readDays(days) {
    const first = startOfDay(addDays(new Date(), -(days - 1)));
    const out: DayTotals[] = [];
    for (let i = 0; i < days; i++) {
      const key = dayKey(addDays(first, i));
      const isToday = i === days - 1;
      const dayFraction = isToday ? Math.min(1, (new Date().getHours() + 1) / 20) : 1;
      const steps = Math.round((4000 + seeded(key) * 9000) * dayFraction);
      out.push({ day: key, steps, activeCalories: Math.round(steps * 0.045) });
    }
    return out;
  },
};
