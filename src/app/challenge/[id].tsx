import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, RefreshControl, Share, View } from 'react-native';

import { Avatar, Big, Body, Button, Card, Empty, Label, Num, Progress, Row, Screen } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { dayKey, daysBetween, formatNumber, formatShortDay } from '../../lib/dates';
import { useChallenge } from '../../lib/data';
import { supabase } from '../../lib/supabase';
import { colors, metricMeta, space } from '../../lib/theme';

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { challenge, board } = useChallenge(id);
  const c = challenge.data;

  if (!c) {
    return (
      <Screen>
        <Empty>{challenge.loading ? 'Loading…' : 'Battle not found.'}</Empty>
      </Screen>
    );
  }

  const today = dayKey();
  const meta = metricMeta[c.metric];
  const battle = c.kind === 'daily_battle';
  const totalDays = daysBetween(c.start_date, c.end_date) + 1;
  const dayNum = Math.min(totalDays, Math.max(0, daysBetween(c.start_date, today) + 1));
  const finished = today > c.end_date;
  const notStarted = today < c.start_date;
  const rows = board.data;
  const top = rows[0];
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  const myIndex = rows.findIndex((r) => r.user_id === profile?.id);

  const score = (r: (typeof rows)[number]) => (battle ? r.days_won : r.total);
  const scoreLabel = battle ? 'wins' : meta.short;

  const share = () => {
    const me = rows[myIndex];
    if (!me) return;
    Share.share({
      message: `${c.title}: I'm #${myIndex + 1} of ${rows.length} with ${formatNumber(score(me))} ${scoreLabel}` +
        (finished ? '. Final result!' : ` on day ${dayNum} of ${totalDays}.`) + ' 💪 MoveMates',
    });
  };

  const leave = () =>
    Alert.alert('Leave battle?', 'Your score will disappear from this battle.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('challenge_members').delete().eq('challenge_id', c.id).eq('user_id', profile!.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={board.loading} onRefresh={board.reload} tintColor={colors.lime} />}>
      <Stack.Screen options={{ title: battle ? 'Daily battle' : 'Leaderboard' }} />
      <View style={{ gap: space.xs }}>
        <Label color={finished ? colors.faint : notStarted ? colors.cyan : meta.color}>
          {finished ? 'Final' : notStarted ? `Starts ${formatShortDay(c.start_date)}` : `● Live · day ${dayNum} of ${totalDays}`}
        </Label>
        <Body style={{ fontSize: 26, fontWeight: '900' }}>{c.title}</Body>
        <Body muted>
          {meta.label} · {formatShortDay(c.start_date)} to {formatShortDay(c.end_date)}
          {battle ? ' · win a round by topping the day' : ''}
        </Body>
      </View>

      {top && (
        <Card glow={finished ? colors.gold : meta.color}>
          <Label color={finished ? colors.gold : colors.muted}>{finished ? 'Champion 👑' : 'Leading'}</Label>
          <Row>
            <Avatar emoji={top.emoji} size={48} />
            <View style={{ flex: 1 }}>
              <Body style={{ fontWeight: '800', fontSize: 18 }}>{top.user_id === profile?.id ? 'You' : top.display_name}</Body>
              <Body muted>@{top.username}</Body>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Big size={32} color={finished ? colors.gold : meta.color}>
                {formatNumber(score(top))}
              </Big>
              <Label>{scoreLabel}</Label>
            </View>
          </Row>
        </Card>
      )}

      <Card style={{ gap: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Standings</Label>
          <Label>{battle ? `wins · today ${meta.short}` : `total · today`}</Label>
        </Row>
        {rows.length === 0 && <Empty>No players yet.</Empty>}
        {rows.map((r, i) => {
          const me = r.user_id === profile?.id;
          return (
            <View key={r.user_id} style={{ gap: 6 }}>
              <Row>
                <Num color={i === 0 ? colors.gold : colors.faint} size={14} style={{ width: 22 }}>
                  {i + 1}
                </Num>
                <Avatar emoji={r.emoji} size={32} />
                <Body style={[{ flex: 1, fontWeight: '700' }, me && { color: meta.color }]}>{me ? 'You' : r.display_name}</Body>
                <View style={{ alignItems: 'flex-end' }}>
                  <Num color={me ? meta.color : colors.text}>{formatNumber(score(r))}</Num>
                  <Num color={colors.faint} size={11}>
                    {battle ? `${formatNumber(r.today_value)} today` : `+${formatNumber(r.today_value)} today`}
                  </Num>
                </View>
              </Row>
              {!battle && <Progress value={r.total / maxTotal} height={4} color={me ? meta.color : colors.faint} />}
            </View>
          );
        })}
      </Card>

      <Row>
        <Button title="Share" style={{ flex: 1 }} color={meta.color} onPress={share} disabled={myIndex < 0} />
        <Button title="Leave" kind="ghost" color={colors.faint} onPress={leave} />
      </Row>
    </Screen>
  );
}
