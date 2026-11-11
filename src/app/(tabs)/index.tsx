import { useMemo } from 'react';
import { Pressable, RefreshControl, Share, View } from 'react-native';

import { Avatar, Big, Body, Button, Card, Empty, Label, Num, Progress, Row, Screen, Title } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { currentStreak } from '../../lib/badges';
import { dayKey, formatNumber, timeAgo } from '../../lib/dates';
import { useFriends, useMyStats, useTodayBoard } from '../../lib/data';
import { healthProvider } from '../../lib/health';
import { useSync } from '../../lib/syncContext';
import { colors, space } from '../../lib/theme';

export default function Today() {
  const { profile } = useAuth();
  const { healthStatus, lastSync, syncing, lastError, sync, connect } = useSync();
  const mine = useMyStats(60);
  const friends = useFriends();
  const people = useMemo(
    () => (profile ? [profile, ...friends.data.friends] : []),
    [profile, friends.data.friends],
  );
  const board = useTodayBoard(people);

  if (!profile) return null;
  const today = mine.data.find((s) => s.day === dayKey());
  const steps = today?.steps ?? 0;
  const kcal = today?.active_calories ?? 0;
  const goal = profile.daily_step_goal;
  const streak = currentStreak(mine.data, goal);
  const myRank = board.data.findIndex((r) => r.profile.id === profile.id) + 1;

  const share = () =>
    Share.share({
      message:
        `${profile.emoji} ${formatNumber(steps)} steps, ${formatNumber(kcal)} active kcal today` +
        (streak > 1 ? `, ${streak}-day streak 🔥` : '') +
        (board.data.length > 1 ? `. #${myRank} of ${board.data.length} on MoveMates.` : ' on MoveMates.') +
        ' Think you can beat me?',
    });

  const refresh = () => {
    sync(true);
    mine.reload();
    friends.reload();
    board.reload();
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={syncing} onRefresh={refresh} tintColor={colors.lime} />}>
      <Title right={<Button title="Share" small kind="ghost" onPress={share} />}>Today</Title>

      {healthStatus === 'needs_permission' && (
        <Card glow={colors.cyan}>
          <Label color={colors.cyan}>Connect {healthProvider.name}</Label>
          <Body muted>Allow MoveMates to read steps and active calories. Works with {healthProvider.feeds}.</Body>
          <Button title="Connect" color={colors.cyan} onPress={connect} />
        </Card>
      )}
      {healthStatus === 'unavailable' && (
        <Card>
          <Label color={colors.danger}>{healthProvider.name} not available</Label>
          <Body muted>
            On Android, install or update Health Connect from the Play Store, then reopen MoveMates.
          </Body>
        </Card>
      )}

      <Card glow={steps >= goal ? colors.lime : undefined}>
        <Label>Steps</Label>
        <Big color={colors.lime}>{formatNumber(steps)}</Big>
        <Progress value={steps / goal} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Body muted>{steps >= goal ? 'Goal smashed 💥' : `${formatNumber(goal - steps)} to go`}</Body>
          <Num color={colors.muted} size={13}>
            / {formatNumber(goal)}
          </Num>
        </Row>
      </Card>

      <Row>
        <Card style={{ flex: 1 }}>
          <Label>Active kcal</Label>
          <Big color={colors.pink} size={34}>
            {formatNumber(kcal)}
          </Big>
        </Card>
        <Card style={{ flex: 1 }}>
          <Label>Streak</Label>
          <Big color={colors.cyan} size={34}>
            {streak}
            {streak > 0 ? '🔥' : ''}
          </Big>
        </Card>
      </Row>

      <Pressable onPress={() => sync(true)}>
        <Label style={{ textAlign: 'center' }} color={lastError && lastError !== 'no_health_access' ? colors.danger : colors.faint}>
          {syncing ? 'Syncing…' : `Synced ${timeAgo(lastSync)} from ${healthProvider.name}`}
          {lastError && lastError !== 'no_health_access' ? ` · ${lastError}` : ''}
        </Label>
      </Pressable>

      <View style={{ gap: space.sm }}>
        <Label>Live leaderboard · today</Label>
        <Card style={{ gap: space.md }}>
          {board.data.length <= 1 && <Empty>Add friends to see who's winning today.</Empty>}
          {board.data.length > 1 &&
            board.data.map((r, i) => {
              const me = r.profile.id === profile.id;
              return (
                <Row key={r.profile.id}>
                  <Num color={i === 0 ? colors.gold : colors.faint} size={14} style={{ width: 22 }}>
                    {i + 1}
                  </Num>
                  <Avatar emoji={r.profile.emoji} size={32} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Body style={me ? { color: colors.lime, fontWeight: '800' } : { fontWeight: '600' }}>
                      {me ? 'You' : r.profile.display_name}
                    </Body>
                    <Progress value={r.steps / r.profile.daily_step_goal} height={4} color={me ? colors.lime : colors.faint} />
                  </View>
                  <Num>{formatNumber(r.steps)}</Num>
                </Row>
              );
            })}
        </Card>
      </View>
    </Screen>
  );
}
