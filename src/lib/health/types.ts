export type DayTotals = {
  day: string; // YYYY-MM-DD local
  steps: number;
  activeCalories: number;
};

export type HealthStatus = 'unavailable' | 'needs_permission' | 'ready';

export interface HealthProvider {
  /** Shown to the user, e.g. "Apple Health". */
  name: string;
  /** Devices that usually feed this source, for the UI. */
  feeds: string;
  status(): Promise<HealthStatus>;
  requestAccess(): Promise<boolean>;
  /** Totals for the last `days` days including today, oldest first. */
  readDays(days: number): Promise<DayTotals[]>;
  /** Calls onChange when new data lands (iOS only). Returns an unsubscribe. */
  subscribe?(onChange: () => void): () => void;
  /** Ask the OS to wake the app when new data arrives (iOS only). */
  enableBackgroundDelivery?(): Promise<void>;
}
