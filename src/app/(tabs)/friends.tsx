import { useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { Avatar, Body, Button, Card, Empty, ErrorText, Input, Label, Row, Screen, Title } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useFriends } from '../../lib/data';
import { supabase } from '../../lib/supabase';
import { colors, space } from '../../lib/theme';
import type { Profile } from '../../lib/types';

export default function Friends() {
  const { profile } = useAuth();
  const { data, loading, reload } = useFriends();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data: rows } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `${q.replace(/[%_]/g, '\\$&')}%`)
        .neq('id', profile?.id ?? '')
        .limit(10);
      setResults((rows as Profile[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, profile?.id]);

  const known = new Set([...data.friends, ...data.incoming, ...data.outgoing].map((p) => p.id));

  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error: err } = await p;
    setError(err ? err.message : null);
    reload();
  };
  const add = (id: string) =>
    run(supabase.from('friendships').insert({ requester: profile!.id, addressee: id }));
  const accept = (id: string) =>
    run(supabase.from('friendships').update({ status: 'accepted' }).eq('requester', id).eq('addressee', profile!.id));
  const remove = (id: string) =>
    run(
      supabase
        .from('friendships')
        .delete()
        .or(`and(requester.eq.${id},addressee.eq.${profile!.id}),and(requester.eq.${profile!.id},addressee.eq.${id})`),
    );

  const person = (p: Profile, action?: React.ReactNode) => (
    <Row key={p.id}>
      <Avatar emoji={p.emoji} />
      <View style={{ flex: 1 }}>
        <Body style={{ fontWeight: '700' }}>{p.display_name}</Body>
        <Body muted style={{ fontSize: 13 }}>
          @{p.username}
        </Body>
      </View>
      {action}
    </Row>
  );

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.lime} />}>
      <Title>Friends</Title>
      <Body muted>Your username is @{profile?.username}. Share it so friends can add you.</Body>

      <Input value={query} onChangeText={setQuery} placeholder="Search by username" />
      <ErrorText>{error}</ErrorText>
      {results.length > 0 && (
        <Card style={{ gap: space.md }}>
          {results.map((p) =>
            person(
              p,
              known.has(p.id) ? <Label>Added</Label> : <Button title="Add" small onPress={() => add(p.id)} />,
            ),
          )}
        </Card>
      )}

      {data.incoming.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Label color={colors.pink}>Requests</Label>
          <Card glow={colors.pink} style={{ gap: space.md }}>
            {data.incoming.map((p) =>
              person(
                p,
                <Row style={{ gap: space.sm }}>
                  <Button title="✕" small kind="ghost" color={colors.faint} onPress={() => remove(p.id)} />
                  <Button title="Accept" small color={colors.pink} onPress={() => accept(p.id)} />
                </Row>,
              ),
            )}
          </Card>
        </View>
      )}

      <View style={{ gap: space.sm }}>
        <Label>Squad · {data.friends.length}</Label>
        <Card style={{ gap: space.md }}>
          {data.friends.length === 0 && <Empty>No friends yet. Search for a username above.</Empty>}
          {data.friends.map((p) =>
            person(p, <Button title="Remove" small kind="ghost" color={colors.faint} onPress={() => remove(p.id)} />),
          )}
        </Card>
      </View>

      {data.outgoing.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Label>Waiting on them</Label>
          <Card style={{ gap: space.md }}>
            {data.outgoing.map((p) =>
              person(p, <Button title="Cancel" small kind="ghost" color={colors.faint} onPress={() => remove(p.id)} />),
            )}
          </Card>
        </View>
      )}
    </Screen>
  );
}
