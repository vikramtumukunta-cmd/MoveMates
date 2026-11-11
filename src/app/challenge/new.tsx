import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Body, Button, Card, Chip, Empty, ErrorText, Input, Label, Row, Screen, Title } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { addDays, dayKey, startOfWeek } from '../../lib/dates';
import { useFriends } from '../../lib/data';
import { supabase } from '../../lib/supabase';
import { colors, metricMeta, space } from '../../lib/theme';
import type { ChallengeKind, Metric } from '../../lib/types';

const KINDS: { id: ChallengeKind; name: string; blurb: string }[] = [
  { id: 'daily_battle', name: 'Daily battle', blurb: 'Every day is a round. Most days won takes the crown.' },
  { id: 'weekly_leaderboard', name: 'Leaderboard', blurb: 'Highest total by the end wins.' },
];

const LENGTHS = [
  { id: 'week', label: 'This week (Mon–Sun)' },
  { id: '3', label: 'Next 3 days' },
  { id: '7', label: 'Next 7 days' },
  { id: '14', label: 'Next 14 days' },
] as const;
type LengthId = (typeof LENGTHS)[number]['id'];

function rangeFor(len: LengthId): [string, string] {
  if (len === 'week') {
    const mon = startOfWeek();
    return [dayKey(mon), dayKey(addDays(mon, 6))];
  }
  const n = Number(len);
  return [dayKey(), dayKey(addDays(new Date(), n - 1))];
}

export default function NewChallenge() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: friends } = useFriends();
  const [kind, setKind] = useState<ChallengeKind>('daily_battle');
  const [metric, setMetric] = useState<Metric>('steps');
  const [length, setLength] = useState<LengthId>('7');
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const defaultTitle = `${kind === 'daily_battle' ? 'Step battle' : 'Leaderboard'}: ${metricMeta[metric].label.toLowerCase()}`;

  const create = async () => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    const [start_date, end_date] = rangeFor(length);
    const { data, error: err } = await supabase
      .from('challenges')
      .insert({ kind, metric, title: title.trim() || defaultTitle, start_date, end_date, created_by: profile.id })
      .select('id')
      .single();
    if (err || !data) {
      setBusy(false);
      setError(err?.message ?? 'Could not create the challenge.');
      return;
    }
    const members = [profile.id, ...picked].map((user_id) => ({ challenge_id: data.id, user_id }));
    const { error: mErr } = await supabase.from('challenge_members').insert(members);
    setBusy(false);
    if (mErr) {
      setError(mErr.message);
      return;
    }
    router.replace(`/challenge/${data.id}`);
  };

  return (
    <Screen>
      <Title right={<Button title="Close" small kind="ghost" color={colors.faint} onPress={() => router.back()} />}>
        New battle
      </Title>

      <View style={{ gap: space.sm }}>
        <Label>Format</Label>
        {KINDS.map((k) => (
          <Card key={k.id} glow={kind === k.id ? colors.lime : undefined} style={{ padding: space.md }}>
            <Body style={{ fontWeight: '800', color: kind === k.id ? colors.lime : colors.text }} >
              {k.name}
            </Body>
            <Body muted>{k.blurb}</Body>
            <Button title={kind === k.id ? 'Selected' : 'Pick'} small kind={kind === k.id ? 'primary' : 'ghost'} onPress={() => setKind(k.id)} />
          </Card>
        ))}
      </View>

      <View style={{ gap: space.sm }}>
        <Label>Metric</Label>
        <Row>
          {(Object.keys(metricMeta) as Metric[]).map((m) => (
            <Chip key={m} label={metricMeta[m].label} color={metricMeta[m].color} active={metric === m} onPress={() => setMetric(m)} />
          ))}
        </Row>
      </View>

      <View style={{ gap: space.sm }}>
        <Label>Length</Label>
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
          {LENGTHS.map((l) => (
            <Chip key={l.id} label={l.label} active={length === l.id} onPress={() => setLength(l.id)} />
          ))}
        </Row>
      </View>

      <View style={{ gap: space.sm }}>
        <Label>Name (optional)</Label>
        <Input value={title} onChangeText={setTitle} placeholder={defaultTitle} maxLength={60} autoCapitalize="sentences" />
      </View>

      <View style={{ gap: space.sm }}>
        <Label>Invite friends · {picked.size}</Label>
        <Card style={{ gap: space.md }}>
          {friends.friends.length === 0 && <Empty>Add friends first from the Friends tab.</Empty>}
          {friends.friends.map((f) => (
            <Row key={f.id}>
              <Avatar emoji={f.emoji} />
              <Body style={{ flex: 1, fontWeight: '700' }}>{f.display_name}</Body>
              <Chip label={picked.has(f.id) ? 'In ✓' : 'Add'} active={picked.has(f.id)} onPress={() => toggle(f.id)} />
            </Row>
          ))}
        </Card>
      </View>

      <ErrorText>{error}</ErrorText>
      <Button title="Start battle" onPress={create} loading={busy} disabled={picked.size === 0} />
    </Screen>
  );
}
