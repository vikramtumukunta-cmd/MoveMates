import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, mono, radius, space } from '../lib/theme';

export function Screen({
  children,
  scroll = true,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} refreshControl={refreshControl}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Title({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <Text style={styles.title}>{children}</Text>
      {right}
    </View>
  );
}

export function Label({ children, color = colors.muted, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, { color }, style]}>{children}</Text>;
}

export function Card({ children, style, glow }: { children: ReactNode; style?: StyleProp<ViewStyle>; glow?: string }) {
  return (
    <View
      style={[
        styles.card,
        glow && { borderColor: glow, shadowColor: glow, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Big({ children, color = colors.text, size = 56 }: { children: ReactNode; color?: string; size?: number }) {
  return (
    <Text style={[mono, { color, fontSize: size, fontWeight: '800', letterSpacing: -1, lineHeight: size * 1.1 }]} numberOfLines={1} adjustsFontSizeToFit>
      {children}
    </Text>
  );
}

export function Num({ children, color = colors.text, size = 16, style }: { children: ReactNode; color?: string; size?: number; style?: StyleProp<TextStyle> }) {
  return <Text style={[mono, { color, fontSize: size, fontWeight: '700' }, style]}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  color = colors.lime,
  loading,
  disabled,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost';
  color?: string;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const primary = kind === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        primary ? { backgroundColor: color } : { borderColor: color, borderWidth: 1 },
        (pressed || disabled) && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.bg : color} />
      ) : (
        <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: primary ? colors.bg : color }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.faint} autoCapitalize="none" {...props} style={[styles.input, props.style]} />;
}

export function Progress({ value, color = colors.lime, height = 10 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

export function Chip({ label, active, onPress, color = colors.lime }: { label: string; active?: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && { borderColor: color, backgroundColor: color + '22' }]}>
      <Text style={[styles.chipText, active && { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({ emoji, size = 36 }: { emoji: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ fontSize: size * 0.55 }}>{emoji}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <Text style={styles.empty}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? <Text style={styles.error}>{children}</Text> : null;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.sm },
  body: { color: colors.text, fontSize: 15, lineHeight: 21 },
  button: { height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  buttonSmall: { height: 34, borderRadius: radius.sm, paddingHorizontal: space.md },
  buttonText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    paddingHorizontal: space.lg,
    fontSize: 16,
  },
  track: { backgroundColor: colors.cardHi, overflow: 'hidden', width: '100%' },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: space.md, paddingVertical: space.sm },
  chipText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  avatar: { backgroundColor: colors.cardHi, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  empty: { color: colors.faint, textAlign: 'center', paddingVertical: space.lg, fontSize: 14 },
  error: { color: colors.danger, fontSize: 13 },
});
