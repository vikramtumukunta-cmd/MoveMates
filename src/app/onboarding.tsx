import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Body, Button, Chip, ErrorText, Input, Label, Row, Screen, Title } from '../components/ui';
import { useAuth } from '../lib/auth';
import { healthProvider } from '../lib/health';
import { supabase } from '../lib/supabase';
import { EMOJIS, space } from '../lib/theme';



export default function Onboarding() {
  const { session, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^[A-Za-z0-9_]{3,20}$/.test(username) && name.trim().length > 0;

  const save = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('profiles').insert({
      id: session.user.id,
      username,
      display_name: name.trim(),
      emoji,
    });
    if (err) {
      setBusy(false);
      setError(err.code === '23505' ? 'That username is taken.' : err.message);
      return;
    }
    // Ask for health access right away; the user can also do it later from Profile.
    await healthProvider.requestAccess().catch(() => false);
    await refreshProfile();
  };

  return (
    <Screen>
      <Title>Set up your player</Title>
      <Body muted>Friends find you by username. You can change your look later.</Body>

      <View style={{ alignItems: 'center', marginVertical: space.md }}>
        <Avatar emoji={emoji} size={88} />
      </View>
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
        {EMOJIS.map((e) => (
          <Chip key={e} label={e} active={e === emoji} onPress={() => setEmoji(e)} />
        ))}
      </Row>

      <View style={{ gap: space.sm }}>
        <Label>Username</Label>
        <Input value={username} onChangeText={setUsername} placeholder="step_queen" maxLength={20} />
      </View>
      <View style={{ gap: space.sm }}>
        <Label>Display name</Label>
        <Input value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" maxLength={40} />
      </View>

      <ErrorText>{error}</ErrorText>
      <Body muted>
        Next we'll ask to read steps and active calories from {healthProvider.name} ({healthProvider.feeds}).
      </Body>
      <Button title="Continue" onPress={save} loading={busy} disabled={!valid} />
    </Screen>
  );
}
