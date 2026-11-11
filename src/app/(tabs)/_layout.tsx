import { Tabs } from 'expo-router/js-tabs';
import { Text, type ColorValue } from 'react-native';

import { colors } from '../../lib/theme';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 18, fontWeight: '900' }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontWeight: '800', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('◉') }} />
      <Tabs.Screen name="challenges" options={{ title: 'Battles', tabBarIcon: icon('⚔') }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends', tabBarIcon: icon('☺') }} />
      <Tabs.Screen name="profile" options={{ title: 'Me', tabBarIcon: icon('★') }} />
    </Tabs>
  );
}
