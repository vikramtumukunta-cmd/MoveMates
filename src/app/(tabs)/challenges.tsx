import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { Body, Button, Card, Empty, Label, Row, Screen, Title } from '../../components/ui';
import { dayKey, formatShortDay } from '../../lib/dates';
import { useChallenges } from '../../lib/data';
import type { Challenge } from '../../lib/types';
import { colors, metricMeta, space } from '../../lib/theme';

function statusOf(c: Challenge, today: string) {
  if (today < c.start_date) return { text: 'Starts ' + formatShortDay(c.start_date), color: colors.cyan };
  if (today > c.end_date) return { text: 'Finished', color: colors.faint };
  return { text: 'Live', color: colors.lime };
}

export default function Challenges() {
  const router = useRouter();
  const { data, loading, reload } = useChallenges();
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  const today = dayKey();
  const active = data.filter((c) => c.end_date >= today);
  const past = data.filter((c) => c.end_date < today);

  const item = (c: Challenge) => {
    const st = statusOf(c, today);
    const meta = metricMeta[c.metric];
    return (
      <Pressable key={c.id} onPress={() => router.push(`/challenge/${c.id}`)}>
        <Card glow={st.text === 'Live' ? meta.color : undefined}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label color={st.color}>● {st.text}</Label>
            <Label>{c.kind === 'daily_battle' ? 'Daily battle' : 'Leaderboard'}</Label>
          </Row>
          <Body style={{ fontSize: 18, fontWeight: '800' }}>{c.title}</Body>
          <Body muted>
            {meta.label} · {formatShortDay(c.start_date)} to {formatShortDay(c.end_date)}
          </Body>
        </Card>
      </Pressable>
    );
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.lime} />}>
      <Title right={<Button title="+ New" small onPress={() => router.push('/challenge/new')} />}>Battles</Title>
      {active.length === 0 && <Empty>No battles running. Start one and invite your friends.</Empty>}
      {active.map(item)}
      {past.length > 0 && (
        <View style={{ gap: space.md }}>
          <Label>Past</Label>
          {past.map(item)}
        </View>
      )}
    </Screen>
  );
}
