import { Platform, type TextStyle } from 'react-native';

export const colors = {
  bg: '#0A0A0F',
  card: '#14141C',
  cardHi: '#1C1C27',
  border: '#262633',
  text: '#F4F4F7',
  muted: '#8B8B9C',
  faint: '#55556A',
  lime: '#C6FF3D', // primary: steps, wins
  pink: '#FF3DA8', // calories, rivals
  cyan: '#3DE8FF', // streaks, info
  gold: '#FFC83D',
  danger: '#FF5C5C',
};

export const mono: TextStyle = {
  fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' }),
  fontVariant: ['tabular-nums'],
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20 };

export const metricMeta = {
  steps: { label: 'Steps', short: 'steps', color: colors.lime },
  active_calories: { label: 'Active calories', short: 'kcal', color: colors.pink },
} as const;

export const EMOJIS = ['🏃', '🚴', '🏋️', '🧗', '🏊', '⚡', '🔥', '🦊', '🐺', '🐯', '🦄', '👾'];
