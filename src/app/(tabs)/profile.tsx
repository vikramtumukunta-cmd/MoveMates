import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Avatar, Body, Button, Card, Chip, ErrorText, Label, Num, Row, Screen, Title } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { bestStreak, computeBadges } from '../../lib/badges';
import { formatNumber, timeAgo } from '../../lib/dates';
import { useMyStats } from '../../lib/data';
import { healthProvider } from '../../lib/health';
import { supabase } from '../../lib/supabase';
import { useSync } from '../../lib/syncContext';
import { colors, EMOJIS, space } from '../../lib/theme';

const GOALS = [5000, 8000, 10000, 12000, 15000];

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const { healthStatus, lastSync, connect, sync, syncing } = useSync();
  const mine = useMyStats(60);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;
  const badges = computeBadges(mine.data, profile.daily_step_goal);
  const earned = badges.filter((b) => b.earned).length;

  const update = async (patch: { emoji?: string; daily_step_goal?: number }) => {
    const { error: err } = await supabase.from('profiles').update(patch).eq('id', profile.id);
    setError(err?.message ?? null);
    await refreshProfile();
  };

  return (
    <Screen>
      <Title>Me</Title>
      <Row>
        <Avatar emoji={profile.emoji} size={64} />
        <View style={{ flex: 1 }}>
          <Body style={{ fontSize: 20, fontWeight: '800' }}>{profile.display_name}</Body>
          <Body muted>@{profile.username}</Body>
        </View>
      </Row>
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
        {EMOJIS.map((e) => (
          <Chip key={e} label={e} active={e === profile.emoji} onPress={() => update({ emoji: e })} />
        ))}
      </Row>
      <ErrorText>{error}</ErrorText>

      <View style={{ gap: space.sm }}>
        <Label>
          Badges · {earned}/{badges.length}
        </Label>
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
          {badges.map((b) => (
            <Card key={b.id} style={{ width: '31%', alignItems: 'center', opacity: b.earned ? 1 : 0.35, padding: space.md }} glow={b.earned ? colors.gold : undefined}>
              <Body style={{ fontSize: 28 }}>{b.emoji}</Body>
              <Label color={b.earned ? colors.gold : colors.muted} style={{ textAlign: 'center' }}>
                {b.name}
              </Label>
              <Body muted style={{ fontSize: 11, lineHeight: 14, textAlign: 'center' }}>
                {b.hint}
              </Body>
            </Card>
          ))}
        </Row>
        <Body muted>Best streak: {bestStreak(mine.data, profile.daily_step_goal)} days</Body>
      </View>

      <View style={{ gap: space.sm }}>
        <Label>Daily step goal</Label>
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
          {GOALS.map((g) => (
            <Chip key={g} label={formatNumber(g)} active={g === profile.daily_step_goal} onPress={() => update({ daily_step_goal: g })} />
          ))}
        </Row>
      </View>

      <Card>
        <Label color={colors.cyan}>Data source</Label>
        <Body>{healthProvider.name}</Body>
        <Body muted>Includes {healthProvider.feeds}.</Body>
        <Row style={{ justifyContent: 'space-between' }}>
          <Body muted>Status</Body>
          <Num color={healthStatus === 'ready' ? colors.lime : colors.pink} size={13}>
            {healthStatus}
          </Num>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Body muted>Last sync</Body>
          <Num size={13}>{timeAgo(lastSync)}</Num>
        </Row>
        <Body muted style={{ fontSize: 13 }}>
          {Platform.OS === 'ios'
            ? 'Wearable apps (Fitbit, Garmin, Whoop, Oura) must have "Sync to Apple Health" turned on in their own settings.'
            : 'Wearable apps (Samsung Health, Fitbit, Garmin, Whoop, Oura) must have Health Connect sync turned on in their own settings.'}
        </Body>
        <Row>
          <Button title="Reconnect" small kind="ghost" color={colors.cyan} onPress={connect} />
          <Button title="Sync now" small color={colors.cyan} loading={syncing} onPress={() => sync(true)} />
        </Row>
      </Card>

      <Button title="Sign out" kind="ghost" color={colors.faint} onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
