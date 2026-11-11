import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { Body, Button, Chip, ErrorText, Input, Label, Row, Screen } from '../components/ui';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { colors, space } from '../lib/theme';

export default function SignIn() {
  const [mode, setMode] = useState<'in' | 'up'>('up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    const creds = { email: email.trim(), password };
    const { data, error: err } =
      mode === 'up' ? await supabase.auth.signUp(creds) : await supabase.auth.signInWithPassword(creds);
    setBusy(false);
    if (err) setError(err.message);
    else if (mode === 'up' && !data.session) setInfo('Check your email to confirm, then sign in.');
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: space.lg }}>
        <View style={{ marginTop: space.xxl * 2, gap: space.sm }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.lime, fontSize: 48, fontWeight: '900', letterSpacing: -2 }}>MOVEMATES</Text>
          <Body muted>Your steps vs your friends. Every device, one scoreboard.</Body>
        </View>

        {!isSupabaseConfigured && (
          <ErrorText>Supabase isn't configured. Copy .env.example to .env and add your project URL and anon key.</ErrorText>
        )}

        <Row>
          <Chip label="Create account" active={mode === 'up'} onPress={() => setMode('up')} />
          <Chip label="Sign in" active={mode === 'in'} onPress={() => setMode('in')} />
        </Row>

        <View style={{ gap: space.sm }}>
          <Label>Email</Label>
          <Input value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" autoComplete="email" />
        </View>
        <View style={{ gap: space.sm }}>
          <Label>Password</Label>
          <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" />
        </View>

        <ErrorText>{error}</ErrorText>
        {info && <Body style={{ color: colors.cyan }}>{info}</Body>}

        <Button title={mode === 'up' ? "Let's go" : 'Sign in'} onPress={submit} loading={busy} disabled={!email || password.length < 6} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
