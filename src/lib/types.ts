export type Profile = {
  id: string;
  username: string;
  display_name: string;
  emoji: string;
  daily_step_goal: number;
  created_at: string;
};

export type DailyStat = {
  user_id: string;
  day: string; // YYYY-MM-DD in the user's local time
  steps: number;
  active_calories: number;
  source: string | null;
  updated_at: string;
};

export type Friendship = {
  requester: string;
  addressee: string;
  status: 'pending' | 'accepted';
  created_at: string;
};

export type ChallengeKind = 'daily_battle' | 'weekly_leaderboard';
export type Metric = 'steps' | 'active_calories';

export type Challenge = {
  id: string;
  kind: ChallengeKind;
  metric: Metric;
  title: string;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
};

export type LeaderboardRow = {
  user_id: string;
  username: string;
  display_name: string;
  emoji: string;
  total: number;
  today_value: number;
  days_won: number;
};
