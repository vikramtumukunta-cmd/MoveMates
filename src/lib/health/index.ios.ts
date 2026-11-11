import {
  enableBackgroundDelivery,
  getRequestStatusForAuthorization,
  isHealthDataAvailableAsync,
  queryStatisticsCollectionForQuantity,
  requestAuthorization,
  subscribeToChanges,
  AuthorizationRequestStatus,
  UpdateFrequency,
} from '@kingstinct/react-native-healthkit';

import { addDays, dayKey, startOfDay } from '../dates';
import type { DayTotals, HealthProvider } from './types';

const STEPS = 'HKQuantityTypeIdentifierStepCount' as const;
const ACTIVE_KCAL = 'HKQuantityTypeIdentifierActiveEnergyBurned' as const;
const READ = [STEPS, ACTIVE_KCAL] as const;

async function dailySums(
  id: typeof STEPS | typeof ACTIVE_KCAL,
  from: Date,
  to: Date,
): Promise<Map<string, number>> {
  // HealthKit merges iPhone, Apple Watch and any app that writes to Health
  // (Fitbit, Garmin Connect, Oura, Whoop...) and removes overlap.
  const buckets = await queryStatisticsCollectionForQuantity(
    id,
    ['cumulativeSum'],
    from,
    { day: 1 },
    { filter: { date: { startDate: from, endDate: to } } },
  );
  const out = new Map<string, number>();
  for (const b of buckets) {
    if (!b.startDate) continue;
    out.set(dayKey(new Date(b.startDate)), b.sumQuantity?.quantity ?? 0);
  }
  return out;
}

export const healthProvider: HealthProvider = {
  name: 'Apple Health',
  feeds: 'iPhone, Apple Watch, and apps that sync to Apple Health such as Fitbit, Garmin Connect, Oura and Whoop',

  async status() {
    if (!(await isHealthDataAvailableAsync())) return 'unavailable';
    // Apple never reveals whether read access was granted; it only tells us
    // whether we still need to show the permission sheet.
    const s = await getRequestStatusForAuthorization({ toRead: READ });
    return s === AuthorizationRequestStatus.shouldRequest ? 'needs_permission' : 'ready';
  },

  async requestAccess() {
    return requestAuthorization({ toRead: READ });
  },

  async readDays(days) {
    const from = startOfDay(addDays(new Date(), -(days - 1)));
    const to = new Date();
    const [steps, kcal] = await Promise.all([
      dailySums(STEPS, from, to),
      dailySums(ACTIVE_KCAL, from, to),
    ]);
    const out: DayTotals[] = [];
    for (let i = 0; i < days; i++) {
      const key = dayKey(addDays(from, i));
      out.push({ day: key, steps: Math.round(steps.get(key) ?? 0), activeCalories: Math.round(kcal.get(key) ?? 0) });
    }
    return out;
  },

  subscribe(onChange) {
    const subs = READ.map((id) => subscribeToChanges(id, () => onChange()));
    return () => subs.forEach((s) => s.remove());
  },

  async enableBackgroundDelivery() {
    // iOS caps step updates to about once an hour in the background.
    await Promise.all(READ.map((id) => enableBackgroundDelivery(id, UpdateFrequency.immediate)));
  },
};
