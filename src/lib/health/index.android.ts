import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import { addDays, dayKey, startOfDay } from '../dates';
import type { DayTotals, HealthProvider } from './types';

const PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
] as const;

let initialized = false;
async function ensureInit(): Promise<boolean> {
  if (initialized) return true;
  const sdk = await getSdkStatus();
  if (sdk !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
  initialized = await initialize();
  return initialized;
}

export const healthProvider: HealthProvider = {
  name: 'Health Connect',
  feeds: 'Samsung Health, Fitbit, Google Fit, Garmin, Oura, Whoop and other apps that sync to Health Connect',

  async status() {
    if (!(await ensureInit())) return 'unavailable';
    const granted = await getGrantedPermissions();
    const ok = PERMISSIONS.every((p) =>
      granted.some((g) => g.recordType === p.recordType && g.accessType === 'read'),
    );
    return ok ? 'ready' : 'needs_permission';
  },

  async requestAccess() {
    if (!(await ensureInit())) return false;
    const granted = await requestPermission([
      ...PERMISSIONS,
      { accessType: 'read', recordType: 'BackgroundAccessPermission' },
    ]);
    return PERMISSIONS.every((p) => granted.some((g) => g.recordType === p.recordType));
  },

  async readDays(days) {
    if (!(await ensureInit())) return [];
    const first = startOfDay(addDays(new Date(), -(days - 1)));
    const out: DayTotals[] = [];
    for (let i = 0; i < days; i++) {
      const start = addDays(first, i);
      const end = i === days - 1 ? new Date() : addDays(start, 1);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      };
      // aggregateRecord de-duplicates overlapping data from multiple apps
      // using the priority order the user set in Health Connect.
      const [steps, kcal] = await Promise.all([
        aggregateRecord({ recordType: 'Steps', timeRangeFilter }),
        aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter }),
      ]);
      out.push({
        day: dayKey(start),
        steps: Math.round(steps.COUNT_TOTAL ?? 0),
        activeCalories: Math.round(kcal.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0),
      });
    }
    return out;
  },
};
